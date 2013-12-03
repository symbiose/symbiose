<?php
namespace lib\entities;

use \InvalidArgumentException;

class UserToken extends \lib\Entity {
	protected $userId, $key, $timestamp, $ip;

	// SETTERS

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid token user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	public function setKey($key) {
		if (!is_string($key) || empty($key)) {
			throw new InvalidArgumentException('Invalid token key "'.$key.'"');
		}

		$this->key = $key;
	}

	public function setTimestamp($timestamp) {
		if (!is_int($timestamp)) {
			throw new InvalidArgumentException('Invalid token timestamp "'.$timestamp.'"');
		}

		$this->timestamp = $timestamp;
	}

	public function setIp($ip) {
		if (!filter_var($ip, FILTER_VALIDATE_IP)) {
			throw new InvalidArgumentException('Invalid token IP "'.$ip.'"');
		}

		$this->ip = $ip;
	}

	// GETTERS

	public function userId() {
		return $this->userId;
	}

	public function key() {
		return $this->key;
	}

	public function timestamp() {
		return $this->timestamp;
	}

	public function ip() {
		return $this->ip;
	}
}