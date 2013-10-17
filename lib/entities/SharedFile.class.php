<?php
namespace lib\entities;

use InvalidArgumentException;

/**
 * A shared file.
 * @author $imon
 */
class SharedFile extends \lib\Entity {
	protected $userId, $path, $key;

	// SETTERS

	public function setUserId($userId) {
		if (!is_int($userId)) {
			throw new InvalidArgumentException('Invalid shared file user id "'.$userId.'"');
		}

		$this->userId = $userId;
	}

	public function setPath($path) {
		if (!is_string($path) || empty($path)) {
			throw new InvalidArgumentException('Invalid shared file path "'.$path.'"');
		}

		$this->path = $path;
	}

	public function setKey($key) {
		if (!is_string($key) || empty($key)) {
			throw new InvalidArgumentException('Invalid shared file key "'.$key.'"');
		}

		$this->key = $key;
	}

	// GETTERS

	public function userId() {
		return $this->userId;
	}

	public function path() {
		return $this->path;
	}

	public function key() {
		return $this->key;
	}
}