<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class OfflinePeer extends Entity {
	protected $userId, $public, $app;

	// SETTERS

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid peer user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	public function setPublic($isPublic) {
		if (!is_bool($isPublic)) {
			throw new InvalidArgumentException('Invalid peer public value "'.$isPublic.'"');
		}

		$this->public = $public;
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

	public function public() {
		return ($this->public == true) ? true : false;
	}

	public function app() {
		return $this->app;
	}
}