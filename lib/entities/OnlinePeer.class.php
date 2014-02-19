<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class OnlinePeer extends Entity {
	protected $ressourceId, $userId, $token, $app;

	// SETTERS

	public function setId($id) {
		if (!is_string($id) || empty($id)) {
			throw new InvalidArgumentException('Invalid peer id "'.$id.'"');
		}

		$this->id = $id;
	}

	public function setConnectionId($connectionId) {
		if (!is_int($connectionId)) {
			throw new InvalidArgumentException('Invalid peer user id "'.$connectionId.'"');
		}

		$this->connectionId = $connectionId;
	}

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid peer user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	public function setToken($token) {
		if (!is_string($token) || empty($token)) {
			throw new InvalidArgumentException('Invalid peer token "'.$token.'"');
		}

		$this->token = $token;
	}

	public function setApp($app) {
		if (!is_string($app) || empty($app)) {
			throw new InvalidArgumentException('Invalid peer app "'.$app.'"');
		}

		$this->app = $app;
	}

	// GETTERS

	public function connectionId() {
		return $this->connectionId;
	}

	public function userId() {
		return $this->userId;
	}

	public function token() {
		return $this->token;
	}

	public function app() {
		return $this->app;
	}
}