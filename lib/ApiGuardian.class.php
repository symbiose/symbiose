<?php
namespace lib;

use \RuntimeException;

/**
 * Keeps access to the API.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiGuardian extends Guardian {
	/**
	 * The authorizations configuration directory.
	 */
	const CONFIG_DIR = '/etc/permissions';

	public function __construct(Api $app) {
		parent::__construct($app);
	}

	protected function _getConfig($appName, $module) {
		$configDirPath = './' . self::CONFIG_DIR;

		return new JsonConfig($configDirPath . '/' . $appName . '/' . $module . '.json');
	}

	/**
	 * Control the access to an action.
	 * @param  string $module        The module name.
	 * @param  string $action        The action name.
	 * @param  array  $arguments     Provided arguments.
	 * @param  array  $providedAuths Provided authorizations.
	 */
	public function controlAccess($module, $action, $arguments, $providedAuths = null) {
		$appName = $this->app()->name();
		$configFile = $this->_getConfig($appName, $module);
		$config = $configFile->read();

		if (!isset($config[$action])) {
			throw new RuntimeException('Cannot find required authorizations for action "'.$action.'" in module "'.$module.'", application "'.$appName.'"');
		}

		$providedAuthsNames = array();
		foreach($providedAuths as $auth) {
			$providedAuthsNames[] = $auth['name'];
		}

		$argumentsValues = array_values($arguments);

		$requiredAuths = $config[$action];

		foreach($requiredAuths as $authData) {
			$requiredAuth = $authData['permission'];

			if (isset($authData['argument'])) {
				$argName = $authData['argument'];
				$args = (is_int($argName)) ? $argumentsValues : $arguments;
				if (!isset($args[$argName])) {
					$args[$argName] = null;
				}
				
				$arg = $args[$argName];

				$this->controlArgAuth($requiredAuth, $arg, $providedAuths);
			} else {
				$this->controlAuth($requiredAuth, $providedAuths);
			}
		}
	}
}