<?php
namespace lib;

/**
 * A class providing access to managers.
 * @author Simon Ser
 * @since 1.0beta3
 */
class Managers {
	const CONFIG_FILE = '/etc/managers.json';

	/**
	 * The managers' config.
	 * @var array
	 */
	protected $config;

	/**
	 * Data Access Objects.
	 * @var Daos
	 */
	protected $daos;

	/**
	 * Cache to store initialized managers.
	 * @var array
	 */
	protected $managers = array();

	/**
	 * Initialize the managers.
	 * @param Daos $daos The DAOs.
	 */
	public function __construct(Daos $daos) {
		$this->daos = $daos;
	}

	/**
	 * Get this configuration.
	 * @return Config The configuration.
	 */
	protected function _getConfig() {
		$configPath = './' . self::CONFIG_FILE;

		return new JsonConfig($configPath);
	}

	/**
	 * Get the API's name for a specified module.
	 * @param  string $module The module's name.
	 * @return string         The API's name.
	 */
	protected function _getApiOf($module) {
		if (empty($this->config)) { //Config not loaded yet
			$config = $this->_getConfig();

			$this->config = $config->read();
		}

		$api = null;
		
		if (isset($this->config[$module])) {
			$api = $this->config[$module];
		}

		return $api;
	}

	/**
	 * Get the manager associated to a given module.
	 * @param  string $module The module's name.
	 * @return Manager        The manager.
	 */
	public function getManagerOf($module) {
		if (!is_string($module) || empty($module)) {
			throw new \InvalidArgumentException('Invalid module name');
		}

		if (!isset($this->managers[$module])) {
			$managerBaseName = '\\lib\\manager\\'.ucfirst($module).'Manager';

			$useBaseManager = false;
			if (class_exists($managerBaseName)) {
				$reflectBaseManager = new \ReflectionClass($managerBaseName);

				$useBaseManager = (!$reflectBaseManager->isAbstract());
			}

			if ($useBaseManager) {
				$manager = new $managerBaseName(null);
			} else {
				$api = $this->_getApiOf($module);
				if (empty($api)) { //Auto-detect API
					$availableApis = $this->daos->listApis();
					$compatibleApis = array();

					foreach ($availableApis as $apiName) {
						if (class_exists($managerBaseName.'_'.$apiName)) {
							$compatibleApis[] = $apiName;
						}
					}

					if (in_array($this->daos->getDefaultApi(), $compatibleApis)) {
						$api = $this->daos->getDefaultApi();
					} else if (count($compatibleApis) > 0) {
						$api = $compatibleApis[0];
					} else {
						throw new \RuntimeException('No DAO available for manager "'.$managerBaseName.'"');
					}
				}

				$dao = $this->daos->getDao($api);
				$managerName = $managerBaseName.'_'.$api;

				if (!class_exists($managerName)) {
					throw new \RuntimeException('Unable to find manager "'.$managerName.'"');
				}

				$manager = new $managerName($dao);
			}

			$this->managers[$module] = $manager;
		}

		return $this->managers[$module];
	}
}