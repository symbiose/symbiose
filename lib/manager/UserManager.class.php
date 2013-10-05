<?php
namespace lib\manager;

use \lib\entities\User;

/**
 * Manage users.
 */
abstract class UserManager extends \lib\Manager {
	// GETTERS

	/**
	 * List all users.
	 * @return array A list containing all users.
	 */
	abstract public function listAll();

	/**
	 * Count all users.
	 * @return int The number of registered users.
	 */
	abstract public function countAll();

	/**
	 * Check if a user exists.
	 * @param  int $userId The user id.
	 * @return boolean     True if the user exists, false otherwise.
	 */
	abstract public function exists($userId);

	/**
	 * Get a user, giving his id.
	 * @param  int $id The user id.
	 * @return User    The user.
	 */
	abstract public function getById($id);

	/**
	 * Get a user, giving his username.
	 * @param  string $username The username.
	 * @return User             The user.
	 */
	abstract public function getByUsername($username);

	/**
	 * Check if a username is already registred.
	 * @param  string  $username The username.
	 * @return boolean           True if the username is already registered, false otherwise.
	 */
	abstract public function usernameExists($username);

	// SETTERS

	/**
	 * Insert a new user.
	 * @param  User   $user The user to insert.
	 */
	abstract public function insert(User $user);

	/**
	 * Update a user.
	 * @param  User   $user The user to update.
	 */
	abstract public function update(User $user);

	/**
	 * Delete a user.
	 * @param  int $userId The user id.
	 */
	abstract public function delete($userId);
	
	/**
	 * Hash a password.
	 * @param  string $password A password.
	 * @return string           The hashed password.
	 */
	public function hashPassword($password) {
		return hash('sha512', $password);
	}
}