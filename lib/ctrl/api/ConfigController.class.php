<?php
namespace lib\ctrl\api;

/**
 * Manage configuration files.
 * @author $imon
 */
class ConfigController extends \lib\ApiBackController {
	protected function _getConfig($path) {
		$configManager = $this->managers()->getManagerOf('config');

		return $configManager->open($path);
	}

	/**
	 * Get a configuration value associated with a given index.
	 * @param string $path The path to the configuration file.
	 * @param string $index The index.
	 */
	public function executeGet($path, $index) {
		$config = $this->_getConfig($path);

		$configData = $config->read();

		if (!array_key_exists($index, $configData)) {
			throw new \RuntimeException('Cannot find index "'.$index.'" in configuration file "'.$path.'"');
		}

		return array('value' => $configData[$index]);
	}

	/**
	 * Get a configuration file data.
	 * @param string $path The path to the configuration file.
	 */
	public function executeGetConfig($path) {
		$config = $this->_getConfig($path);

		return $config->read();
	}

	/**
	 * Get a user configuration file data.
	 * @param string $path The path to the configuration file.
	 * @param string $base The path to the system configuration file, if the user is not logged in or if the configuration file doesn't exist.
	 */
	public function executeGetUserConfig($path, $base) {
		$fileManager = $this->managers()->getManagerOf('file');

		$data = array();

		if (is_array($base)) {
			$data = $base;
			$base = null;
		}

		if (!$this->app()->user()->isLogged()) {
			if (!empty($base)) {
				$config = $this->_getConfig($base);
				$data = $config->read();
			}
		} else {
			if (!$fileManager->exists($path)) {
				$dirname = $fileManager->dirname($path);

				if (!$fileManager->isDir($dirname)) {
					$fileManager->mkdir($dirname, true);
				}

				if (!empty($base)) {
					$fileManager->copy($base, $path);
				}
			} else {
				$config = $this->_getConfig($path);
				$data = $config->read();
			}
		}

		return $data;
	}

	/**
	 * Set a configuration value.
	 * @param string $path The path to the configuration file.
	 * @param string $index The index.
	 * @param string $value The new value.
	 */
	public function executeSet($path, $index, $value) {
		$configFile = $this->_getConfig($path);
		$config = $configFile->read();

		$config[$index] = $value;

		$configFile->write($config);
	}

	/**
	 * Set a configuration file data. Old data will be overwritten.
	 * @param string $path The path to the configuration file.
	 * @param array $data An array containing new data.
	 */
	public function executeSetConfig($path, array $data) {
		$configFile = $this->_getConfig($path);

		$configFile->write($data);
	}
	
	/**
	 * Modifier plusieurs parametres d'une configuration.
	 * Edit some of values of a configuration file.
	 * @param string $path The path to the configuration file.
	 * @param array $set An array containing values to set.
	 * @param array $remove An array containing values to remove.
	 */
	public function executeChangeConfig($path, array $set, array $remove) {
		$configFile = $this->_getConfig($path);
		$config = $configFile->read();
		
		foreach ($set as $index => $value) {
			$config[$index] = $value;
		}
		
		foreach ($remove as $index => $value) {
			unset($config[$index]);
		}

		$configFile->write($config);
	}
}