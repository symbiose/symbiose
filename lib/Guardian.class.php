<?php
namespace lib;

use \RuntimeException;

/**
 * Keeps access to an application.
 * @author Simon Ser
 * @since 1.0beta3
 */
class Guardian extends ApplicationComponent {
	protected function _authForArgument($arg, $requiredAuth) {
		$finalAuth = $requiredAuth;

		$app = $this->app();

		$authsHandlers = array(
			'file.*' => function($path, $action) use($app) {
				if ($path === null) {
					return true;
				}

				//Quelques nettoyages...
				$dirs = explode('/', $path);
				$path = array();
				foreach ($dirs as $dir) {
					if ($dir == '..') {
						array_pop($path);
					} elseif ($dir == '.') {
						continue;
					} elseif ($dir == '~') {
						if ($app->user()->isLogged()) {
							$path += explode('/', '/home/'.$app->user()->username());
						} else {
							$path[] = $dir;
						}
					} elseif (empty($dir)) {
						continue;
					} else {
						$path[] = $dir;
					}
				}
				$path = implode('/', $path);

				//On ajoute le / devant
				if (!preg_match('#^/#',$path))
					$path = '/'.$path;
				
				//Dernier nettoyage
				$path = preg_replace('#/\.$#','/',$path);

				if ($app->user()->isLogged()) {
					$homeDir = '/home/'.$app->user()->username();
					if (strpos($path, $homeDir.'/') === 0 || $path == $homeDir) {
						return 'file.user.'.$action;
					}
				}

				if (strpos($path, '/home/') === 0 || $path == '/home')
					return 'file.home.'.$action;

				if ($action == 'read' && (strpos($path, '/usr/') === 0 || $path == '/usr' || strpos($path, '/boot/') === 0 || $path == '/boot' || $path == '/'))
					return true;

				return 'file.system.'.$action;
			},
			'user.*' => function($arg, $action) use($app) {
				if ($arg === null) {
					return true;
				}

				if (in_array($action, array('read', 'edit')) && $app->user()->isLogged()) {
					if ((is_int($arg) && $app->user()->id() == $arg)
					|| (is_string($arg) && $app->user()->username() == $arg)) {
						if ($action == 'read') {
							return true;
						} else {
							return 'user.self.'.$action;
						}
					}
				}
				return 'user.'.$action;
			}
		);

		$authHandlerName = null;
		$action = null;
		foreach($authsHandlers as $pattern => $handler) {
			if ($pattern == $requiredAuth) {
				$authHandlerName = $pattern;
				break;
			}
		}
		if (empty($authHandlerName)) {
			foreach($authsHandlers as $pattern => $handler) {
				if (strpos($pattern, '*') !== false) {
					$replaces = array('.' => '\.', '*' => '(.+)');
					$regex = str_replace(array_keys($replaces), array_values($replaces), $pattern);
					
					if (preg_match('#^'.$regex.'$#i', $requiredAuth, $matches)) {
						$action = $matches[1];
						$authHandlerName = $pattern;
						break;
					}
				}
			}
		}

		if (!empty($authHandlerName)) {
			if (!empty($action)) {
				$finalAuth = $authsHandlers[$authHandlerName]($arg, $action);
			} else {
				$finalAuth = $authsHandlers[$authHandlerName]($arg);
			}
		}

		return $finalAuth;
	}

	/**
	 * Control an authorization.
	 * @param  string $requiredAuth  The authorization to control.
	 * @param  array  $providedAuths Provided authorizations.
	 */
	public function controlAuth($requiredAuth, $providedAuths = null) {
		$providedAuthsNames = array();
		foreach($providedAuths as $auth) {
			$providedAuthsNames[] = $auth['name'];
		}

		$authorized = ($requiredAuth === true || in_array($requiredAuth, $providedAuthsNames));

		if (!$authorized) {
			throw new \RuntimeException('Permission denied (permission "'.$requiredAuth.'" is required)');
		}
	}

	/**
	 * Control an authorization for a given argument.
	 * @param  string $requiredAuth  The authorization to control.
	 * @param  mixed  $arg           The given argument.
	 * @param  array  $providedAuths Provided authorizations.
	 */
	public function controlArgAuth($requiredAuth, $arg, $providedAuths = null) {
		$requiredAuth = $this->_authForArgument($arg, $requiredAuth);
		$this->controlAuth($requiredAuth, $providedAuths);
	}
}