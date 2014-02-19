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

	/**
	 * Get a user, giving his e-mail.
	 * @param  string $email The e-mail.
	 * @return User          The user.
	 */
	abstract public function getByEmail($email);

	/**
	 * Check if an e-mail is already registred.
	 * @param  string  $email The e-mail.
	 * @return boolean        True if the e-mail is already registered, false otherwise.
	 */
	abstract public function emailExists($email);

	/**
	 * Check if a password is correct.
	 * @param  int $userId   The user id.
	 * @param  string $password The password.
	 * @return bool           Tru if the password is correct, false otherwise.
	 */
	abstract public function checkPassword($userId, $password);

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
	 * Update a user's password.
	 * @param  int $userId      The user id.
	 * @param  string $newPassword The new password.
	 */
	abstract public function updatePassword($userId, $newPassword);
	
	/**
	 * Hash a password.
	 * @param  string $password A password.
	 * @return string           The hashed password.
	 */
	public function hashPassword($password) {
		return hash('sha512', $password);
	}
}