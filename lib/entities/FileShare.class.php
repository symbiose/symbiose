<?php
namespace lib\entities;

use InvalidArgumentException;
use DateTime;
use DateInterval;
use lib\Entity;

/**
 * A shared file.
 * @author $imon
 */
class FileShare extends Entity {
	protected $fileId, $type, $date, $ttl, $key;

	// SETTERS

	public function setFileId($fileId) {
		if (!is_int($fileId)) {
			throw new InvalidArgumentException('Invalid shared file id "'.$fileId.'"');
		}

		$this->fileId = $fileId;
	}

	public function setType($type) {
		if (!is_string($type) || empty($type)) {
			throw new InvalidArgumentException('Invalid shared file type "'.$type.'"');
		}

		$this->type = $type;
	}

	public function setDate($date) {
		if (!is_int($date)) {
			throw new InvalidArgumentException('Invalid shared file date "'.$date.'"');
		}

		$this->date = $date;
	}

	public function setTtl($ttl) {
		if (!is_int($ttl) && !empty($ttl)) {
			throw new InvalidArgumentException('Invalid shared file ttl "'.$ttl.'"');
		}

		$this->ttl = $ttl;
	}

	public function setKey($key) {
		if (!is_string($key) || empty($key)) {
			throw new InvalidArgumentException('Invalid shared file key "'.$key.'"');
		}

		$this->key = $key;
	}

	// GETTERS

	public function fileId() {
		return $this->fileId;
	}

	public function type() {
		return $this->type;
	}

	public function date() {
		return $this->date;
	}

	/**
	 * Time To Live.
	 */
	public function ttl() {
		return $this->ttl;
	}

	public function key() {
		return $this->key;
	}
}