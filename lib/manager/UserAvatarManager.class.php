<?php
namespace lib\manager;

use \lib\Manager;

/**
 * Manage users' avatars.
 * @author emersion <contact@emersion.fr>
 * @since 1.0beta5
 */
abstract class UserAvatarManager extends Manager {
	/**
	 * Check if a user has a profile picture.
	 * @param int $userId The user id.
	 * @return bool True if the user has a profile picture, false otherwise.
	 */
	abstract public function exists($userId);

	/**
	 * Get a profile picture by user id.
	 * @param int $userId The user id.
	 * @return string The profile picture, encoded as a data URI.
	 */
	abstract public function getById($userId);

	/**
	 * Set a profile picture by user id.
	 * @param int $userId The user id.
	 * @param string $imgData The img data, as data URI.
	 */
	abstract public function setById($userId, $imgData);

	/**
	 * Unset a profile picture.
	 * @param int $userId The user id.
	 */
	abstract public function unsetById($userId);
}