<?php
namespace lib\ctrl\api;

/**
 * Retrieve informations about the server.
 * @author $imon
 */
class ServerController extends \lib\ApiBackController {
	const WEBOS_NAME = 'Symbiose';
	const WEBOS_VERSION_FILE = '/etc/version.txt';
	const WEBOS_REQUIRED_PHP_VERSION_FILE = '/boot/phpversion.txt';

	/**
	 * Get the hostname.
	 */
	public function executeGetHost() {
		return array(
			'host' => $_SERVER['SERVER_NAME']
		);
	}

	/**
	 * Get the current webos version.
	 */
	public function executeGetWebosVersion() {
		$fileManager = $this->managers()->getManagerOf('file');

		return array(
			'version' => $fileManager->read(self::WEBOS_VERSION_FILE)
		);
	}

	/**
	 * Get metadata about the server.
	 */
	public function executeGetSystemData() {
		$fileManager = $this->managers()->getManagerOf('file');

		$hostData = $this->executeGetHost();
		$webosVersionData = $this->executeGetWebosVersion();

		$data = array(
			'webos_name' => self::WEBOS_NAME,
			'webos_version' => $webosVersionData['version'],
			'php_version' => PHP_VERSION,
			'required_php_version' => $fileManager->read(self::WEBOS_REQUIRED_PHP_VERSION_FILE),
			'host' => $hostData['host'],
			'os' => PHP_OS,
			'os_type' => php_uname('m'),
			'free_space' => disk_free_space($fileManager->toInternalPath('/'))
		);
		return $data;
	}
}