<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class OfflinePeer extends Entity {
	protected $userId, $isPublic, $app;

	// SETTERS

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid peer user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	public function setIsPublic($isPublic) {
		if (!is_bool($isPublic)) {
			throw new InvalidArgumentException('Invalid peer public value "'.$isPublic.'"');
		}

		$this->isPublic = $isPublic;
	}

	public function setApp($app) {
		if (!is_string($app) || empty($app)) {
			throw new InvalidArgumentException('Invalid peer app "'.$app.'"');
		}

		$this->app = $app;
	}

	// GETTERS

	public function userId() {
		return $this->userId;
	}

	public function isPublic() {
		return ($this->isPublic == true) ? true : false;
	}

	public function app() {
		return $this->app;
	}
}