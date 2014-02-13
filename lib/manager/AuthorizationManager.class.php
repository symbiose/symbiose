<?php
namespace lib\manager;

use lib\entities\UserAuthorization;

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
}