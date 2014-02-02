<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class OnlinePeer extends Entity {
	protected $ressourceId, $userId;

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

	// GETTERS

	public function connectionId() {
		return $this->connectionId;
	}

	public function userId() {
		return $this->userId;
	}
}