<?php
namespace lib\manager;

use \lib\entities\UserToken;

/**
 * Manage user tokens.
 */
abstract class UserTokenManager extends \lib\Manager {
	// GETTERS

	/**
	 * Get a token, specifying its id.
	 * @param  int $tokenId The token id.
	 * @return UserToken    The token.
	 */
	abstract public function getById($tokenId);

	/**
	 * Get a token, specifying its user.
	 * @param  int $userId The user id.
	 * @return UserToken   The token.
	 */
	abstract public function getByUser($userId);

	/**
	 * Check if a user has a token.
	 * @param  int $userId The user id.
	 * @return bool        True if the user already has a token, false otherwise.
	 */
	abstract public function userHasToken($userId);

	// SETTERS

	/**
	 * Insert a new token.
	 * @param  UserToken $token The token.
	 */
	abstract public function insert(UserToken $token);

	/**
	 * Update an existing token.
	 * @param  UserToken $token The token.
	 */
	abstract public function update(UserToken $token);

	/**
	 * Delete a token.
	 * @param  int $tokenId The token id.
	 */
	abstract public function delete($tokenId);
}