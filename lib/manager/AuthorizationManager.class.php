<?php
namespace lib\manager;

use lib\entities\UserAuthorization;

if (!isset($_SESSION)) {
	session_start();
}
if (!isset($_SESSION['processes_permissions'])) {
	$_SESSION['processes_permissions'] = array();
}

/**
 * Manage authorizations.
 * @author $imon
 */
abstract class AuthorizationManager extends \lib\Manager {
	//GETTERS

	/**
	 * Get a user's authorizations.
	 * @param  int $userId The user id.
	 * @return array       The process' authorizations.
	 */
	abstract public function getByUserId($userId);

	/**
	 * Get a process' authorizations.
	 * @param  int $pid The process id.
	 * @return array    The process' authorizations.
	 */
	public function getByPid($pid) {
		if (!isset($_SESSION['processes_permissions'][$pid])) {
			return array();
		}

		return unserialize($_SESSION['processes_permissions'][$pid]);
	}

	//SETTERS

	/**
	 * Insert a new user authorization.
	 * @param UserAuthorization  $auth  The authorization.
	 */
	abstract public function insertUserAuth(UserAuthorization $auth);

	/**
	 * Delete a user authorization.
	 * @param  int $authId The authorization id.
	 */
	abstract public function deleteUserAuth($authId);

	/**
	 * Set a process' authorizations.
	 * @param int   $pid   The process id.
	 * @param array $auths The process' authorizations.
	 */
	public function setByPid($pid, array $auths) {
		if (!is_int($pid)) {
			throw new \InvalidArgumentException('Invalid process id "'.$pid.'"');
		}

		$_SESSION['processes_permissions'][$pid] = serialize($auths);
	}

	/**
	 * Unset a process' authorizations.
	 * @param int   $pid   The process id.
	 */
	public function unsetByPid($pid) {
		if (!isset($_SESSION['processes_permissions'][$pid])) {
			throw new \RuntimeException('Cannot find process with id "'.$pid.'"');
		}

		unset($_SESSION['processes_permissions'][$pid]);
	}
}