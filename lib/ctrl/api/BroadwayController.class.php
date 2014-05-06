<?php
namespace lib\ctrl\api;

use RuntimeException;

/**
 * Control the Broadway server.
 * @author emersion
 */
class BroadwayController extends \lib\ApiBackController {
	const SERVER_PID_DIR = '/var/run/broadwayd/proc';
	const SERVER_DB_FILE = '/var/run/broadwayd/index.json';
	const SERVER_CONFIG_FILE = '/etc/broadway/server.json';
	const SERVER_APPS_DIR = '/etc/broadway/apps';
	const SERVER_LOG_FILE = '/var/log/broadway-server.log';
	const SERVER_APPS_LOG_FILE = '/var/log/broadway-apps.log';

	protected function _getServerConfig() {
		$configManager = $this->managers()->getManagerOf('config');
		$configFile = $configManager->open(self::SERVER_CONFIG_FILE);

		return $configFile;
	}

	protected function _getServerDb() {
		$configManager = $this->managers()->getManagerOf('config');
		$configFile = $configManager->open(self::SERVER_DB_FILE);

		return $configFile;
	}

	protected function _isSupported() {
		if (stripos(PHP_OS, 'LINUX') === -1) { //Not Linux
			return false;
		} else {
			return !empty(shell_exec('which broadwayd'));
		}
	}

	protected function _getPidFile($serverId) {
		return self::SERVER_PID_DIR.'/'.$serverId.'.pid';
	}

	protected function _getServerStatus() {
		$fileManager = $this->managers()->getManagerOf('file');

		$status = array(
			'count' => 0,
			'servers' => array()
		);

		if (!$this->_isSupported()) {
			return $status;
		}

		$pidDir = self::SERVER_PID_DIR;

		if (!$fileManager->exists($pidDir)) {
			return $status;
		}

		$dbFile = $this->_getServerDb();
		$db = $dbFile->read();
		$dbLength = count($db);

		$pidFiles = $fileManager->readDir($pidDir);
		foreach ($pidFiles as $pidFile) {
			if ($fileManager->extension($pidFile) != 'pid') {
				continue;
			}

			$serverId = (int) $fileManager->filename($pidFile);
			$serverData = $db[$serverId];

			$pid = trim($fileManager->read($pidFile));

			if (empty($pid) || empty(shell_exec('ps --no-headers -p '.(int) $pid))) {
				$fileManager->delete($pidFile);
				unset($db[$serverId]);
				continue;
			}

			$status['count']++;
			$status['servers'][$serverId] = $serverData;
		}

		if (count($db) !== $dbLength) {
			$dbFile->write($db);
		}

		return $status;
	}

	public function executeStartServer(array $opts = array()) {
		$fileManager = $this->managers()->getManagerOf('file');
		$user = $this->app()->user();

		if (!$this->_isSupported()) {
			throw new RuntimeException('Broadway server not supported on this machine', 501);
		}

		$configFile = $this->_getServerConfig();
		$config = $configFile->read();

		if ($config['enabled'] !== true) {
			throw new RuntimeException('Broadway server is not enabled in '.self::SERVER_CONFIG_FILE, 403);
		}

		//Check limit
		if (isset($config['maxInstances']) && $config['maxInstances'] > 0) {
			if ($config['maxInstances'] <= $status['count']) {
				throw new RuntimeException('Maximum Broadway instances number reached in '.self::SERVER_CONFIG_FILE, 403);
			}
		}

		$status = $this->_getServerStatus();

		$startingPort = 8080;
		$portMin = $startingPort;
		$portMax = 65535; //2^16
		if (isset($config['portsRange'])) {
			$extremums = explode('-', $config['portsRange']);
			$portMin = (int) $extremums[0];
			$portMax = (int) $extremums[1];
			$startingPort = $portMin;
		}

		$serverId = $status['count'];
		$display = 2 + $serverId;
		$port = $startingPort + $serverId;

		//Check ports range
		if ($port > $portMax) {
			throw new RuntimeException('Server port out of range in '.self::SERVER_CONFIG_FILE, 403);
		}

		//Start broadway server
		$webosRoot = dirname(__FILE__).'/../../..';
		$cmd = 'nohup broadwayd -a 0.0.0.0 -p '.(int) $port.' :'.(int) $display;

		if (isset($opts['username']) && isset($opts['password'])) {
			$cmd = 'echo "'.$opts['password'].'" | su "'.$opts['username'].'" -c "'.$cmd.'"';
		}

		$pid = shell_exec($cmd.' > "'.$webosRoot.'/'.self::SERVER_LOG_FILE.'" 2>&1 & echo $!');
		chmod($webosRoot.'/'.self::SERVER_LOG_FILE, 0777);

		if (empty($pid)) {
			throw new RuntimeException('Cannot start Broadway server');
		}

		//Write pid
		$pidFile = $this->_getPidFile($serverId);

		$fileManager->createFile($pidFile, true);
		$fileManager->write($pidFile, $pid);

		//Save server in DB
		$dbFile = $this->_getServerDb();
		$db = $dbFile->read();
		$db[$serverId] = array(
			'id' => $serverId,
			'user' => $user->id(),
			'display' => $display,
			'port' => $port,
			'pid' => (int) $pid
		);
		$dbFile->write($db);

		return array(
			'id' => $serverId,
			'port' => $port
		);
	}

	public function executeStartApp($appName, $serverId, array $opts = array()) {
		$fileManager = $this->managers()->getManagerOf('file');
		$configManager = $this->managers()->getManagerOf('config');
		$user = $this->app()->user();

		if (!preg_match('#^[a-z-]+$#', $appName)) {
			throw new RuntimeException('Invalid app name "'.$appName.'"', 400);
		}

		$status = $this->_getServerStatus();
		if (!isset($status['servers'][$serverId])) {
			throw new RuntimeException('Unknown server "'.$serverId.'"', 404);
		}
		$server = $status['servers'][$serverId];

		$appPath = self::SERVER_APPS_DIR.'/'.$appName.'.json';

		if (!$fileManager->exists($appPath)) {
			throw new RuntimeException('Unknown app "'.$appName.'"', 404);
		}

		$configFile = $configManager->open($appPath);
		$app = $configFile->read();

		if (!isset($app['enabled']) || $app['enabled'] !== true) {
			throw new RuntimeException('App "'.$appName.'" is disabled in '.$appPath, 403);
		}

		$webosRoot = dirname(__FILE__).'/../../..';

		$baseCmd = 'nohup '.$app['cmd'];

		$cmd = 'GDK_BACKEND=broadway';
		$cmd .= ' BROADWAY_DISPLAY=:'.(int) $server['display'];
		//$cmd .= ' DISPLAY=:0';//.(int) $server['display'];
		//$cmd .= ' HOME="'.$webosRoot.'/home/'.$user->username().'/"';

		if (isset($app['env']) && is_array($app['env'])) {
			foreach ($app['env'] as $var => $value) {
				$cmd .= ' '.$var.'='.$value;
			}
		}
		$cmd .= ' ';

		if (isset($opts['username']) && isset($opts['password'])) {
			$cmd = 'echo "'.$opts['password'].'" | su - "'.$opts['username'].'" -c "export DISPLAY=:0 '.$cmd.';env;'.$baseCmd.'"';
		} else {
			$cmd .= $baseCmd;
		}
file_put_contents('var/log/broadway-cmd.txt', $cmd);
		shell_exec($cmd.' > "'.$webosRoot.'/'.self::SERVER_APPS_LOG_FILE.'" 2>&1 & echo $!');
	}

	public function executeStopServer($serverId) {
		$fileManager = $this->managers()->getManagerOf('file');
		$user = $this->app()->user();

		$serverId = (int) $serverId;

		if (!$this->_isSupported()) {
			throw new RuntimeException('Broadway server not supported on this machine', 501);
		}

		$status = $this->_getServerStatus();

		if (!isset($status['servers'][$serverId])) {
			throw new RuntimeException('Broadway server not started', 404);
		}

		$server = $status['servers'][$serverId];

		if ($server['user'] !== $user->id()) {
			throw new RuntimeException('This server doesn\'t belong to you', 403);
		}

		$pid = $server['pid'];
		$pidFile = $this->_getPidFile($serverId);

		$result = shell_exec('kill '.(int) $pid);

		if (!empty($result)) { //Error
			throw new RuntimeException('Cannot stop Broadway server: '.$result);
		}

		//$fileManager->write($pidFile, '');
		$fileManager->delete($pidFile);

		//Remove server from DB
		$dbFile = $this->_getServerDb();
		$db = $dbFile->read();
		unset($db[$serverId]);
		$dbFile->write($db);
	}

	public function executeGetServerConfig() {
		$fileManager = $this->managers()->getManagerOf('file');

		$configFile = $this->_getServerConfig();
		$config = $configFile->read();

		$serverStatus = array(
			'supported' => $this->_isSupported(),
			'enabled' => (isset($config['enabled'])) ? $config['enabled'] : false
		);

		if (!$this->_isSupported()) {
			$serverStatus['enabled'] = false;
		}

		return $serverStatus;
	}

	public function executeGetAllServersStatus() {
		$fileManager = $this->managers()->getManagerOf('file');
		$user = $this->app()->user();

		$status = $this->_getServerStatus();

		$userServers = array();
		foreach ($status['servers'] as $server) {
			if ($server['user'] === $user->id()) {
				$userServers[] = array(
					'id' => $server['id'],
					'port' => $server['port']
				);
			}
		}
	}

	/*public function executeGetServerStatus($serverId) {
		$fileManager = $this->managers()->getManagerOf('file');

		$configFile = $this->_getServerConfig();
		$config = $configFile->read();

		$serverStatus = array(
			'supported' => $this->_isSupported(),
			'enabled' => (isset($config['enabled'])) ? $config['enabled'] : false
		);

		if (!$this->_isSupported()) {
			$serverStatus['enabled'] = false;
		}

		return $serverStatus;
	}*/
}