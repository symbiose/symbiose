<?php
namespace lib\ctrl\api;

use \RuntimeException;

/**
 * Control the WebSocket server.
 * @author $imon
 */
class WebSocketController extends \lib\ApiBackController {
	const SERVER_PID_FILE = '/var/run/websocket-server.pid';
	const SERVER_CONFIG_FILE = '/etc/websocket-server.json';
	const SERVER_LOG_FILE = '/var/log/websocket-server.log';

	protected $serverScript = '/sbin/wsserver.php';

	protected function _getServerConfig() {
		$configManager = $this->managers()->getManagerOf('config');
		$configFile = $configManager->open(self::SERVER_CONFIG_FILE);

		return $configFile;
	}

	protected function _isSupported() {
		if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') { //Windows
			return false;
		} else { //*nix
			return true;
		}
	}

	protected function _isServerStarted() {
		$fileManager = $this->managers()->getManagerOf('file');

		if (!$this->_isSupported()) {
			return false;
		}

		$pidFile = self::SERVER_PID_FILE;

		if (!$fileManager->exists($pidFile)) {
			return false;
		}

		$pid = trim($fileManager->read($pidFile));
		if (empty($pid)) {
			return false;
		}

		$result = shell_exec('ps --no-headers -p '.(int) $pid);

		if (empty($result)) {
			return false;
		}

		return true;
	}

	public function executeStartServer() {
		$fileManager = $this->managers()->getManagerOf('file');
		$authManager = $this->managers()->getManagerOf('authorization');
		$user = $this->app()->user();

		$auths = array();
		if ($user->isLogged()) {
			$auths = $authManager->getByUserId($user->id());
		}

		if (!$this->_isSupported()) {
			throw new RuntimeException('WebSocket server not supported on this machine', 501);
		}

		if ($this->_isServerStarted()) {
			throw new RuntimeException('Server already started', 405);
		}

		$configFile = $this->_getServerConfig();
		$config = $configFile->read();

		if ($config['enabled'] !== true) {
			throw new RuntimeException('WebSocket server is not enabled in '.self::SERVER_CONFIG_FILE, 403);
		}

		if ($config['autoStart'] !== true) {
			$this->guardian->controlAuth('file.system.write', $auths);
		}

		$webosRoot = dirname(__FILE__).'/../../..';

		$cmd = 'php "'.$webosRoot.'/'.$this->serverScript.'"';
		$pidFile = self::SERVER_PID_FILE;
		$pidFileDir = $fileManager->dirname($pidFile);
		if (!$fileManager->isDir($pidFileDir)) {
			$fileManager->mkdir($pidFileDir, true);
		}

		$pid = shell_exec('nohup '.$cmd.' > "'.$webosRoot.'/'.self::SERVER_LOG_FILE.'" 2>&1 & echo $!');
		chmod($webosRoot.'/'.self::SERVER_LOG_FILE, 0777);

		if (empty($pid)) {
			throw new RuntimeException('Cannot start WebSocket server');
		}

		$fileManager->write($pidFile, $pid);
	}

	public function executeStopServer() {
		$fileManager = $this->managers()->getManagerOf('file');

		if (!$this->_isSupported()) {
			throw new RuntimeException('WebSocket server not supported on this machine', 501);
		}

		if (!$this->_isServerStarted()) {
			throw new RuntimeException('Server not started', 405);
		}

		$pidFile = self::SERVER_PID_FILE;
		$pid = (int) trim($fileManager->read($pidFile));

		$result = shell_exec('kill '.$pid);

		if (!empty($result)) { //Error
			throw new RuntimeException('Cannot stop server: '.$result);
		}

		$fileManager->write($pidFile, '');
	}

	public function executeRestartServer() {
		if ($this->_isServerStarted()) {
			$this->executeStopServer();
		}

		$this->executeStartServer();
	}

	public function executeGetServerStatus() {
		$fileManager = $this->managers()->getManagerOf('file');

		$configFile = $this->_getServerConfig();
		$config = $configFile->read();

		$serverStatus = array(
			'started' => $this->_isServerStarted(),
			'supported' => $this->_isSupported(),
			'port' => $config['port'],
			'enabled' => (isset($config['enabled'])) ? $config['enabled'] : false,
			'autoStart' => (isset($config['autoStart'])) ? $config['autoStart'] : false,
			'protocol' => (isset($config['protocol'])) ? $config['protocol'] : 'ws',
		);

		if (!$this->_isSupported()) {
			$serverStatus['enabled'] = false;
		}

		return $serverStatus;
	}
}