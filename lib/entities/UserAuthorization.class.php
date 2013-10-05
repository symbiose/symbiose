<?php
namespace lib\entities;

use \InvalidArgumentException;

class UserAuthorization extends Authorization {
	protected $userId;

	// SETTERS

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid authorization user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	// GETTERS

	public function userId() {
		return $this->userId;
	}
}