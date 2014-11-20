<?php
namespace lib\entities;

use InvalidArgumentException;
use lib\Entity;

class FileMetadata extends Entity {
	protected $path, $owner, $tags, $parent;

	// SETTERS

	public function setPath($path) {
		if (!is_string($path) || empty($path)) {
			throw new InvalidArgumentException('Invalid file path "'.$path.'"');
		}

		$this->path = $path;
	}

	public function setOwner($owner) {
		if (!is_int($owner) && $owner !== null) {
			throw new InvalidArgumentException('Invalid file owner "'.$owner.'"');
		}

		$this->owner = $owner;
	}

	public function setTags($tags) {
		if (!is_string($tags) && $tags !== null) {
			throw new InvalidArgumentException('Invalid file tags "'.$tags.'"');
		}

		$this->tags = $tags;
	}

	public function setParent($parent) {
		if (!is_int($parent) && $parent !== null) {
			throw new InvalidArgumentException('Invalid file parent "'.$parent.'"');
		}

		$this->parent = $parent;
	}

	// GETTERS

	public function path() {
		return $this->path;
	}

	public function owner() {
		return $this->owner;
	}

	public function tags() {
		return $this->tags;
	}

	public function parent() {
		return $this->parent;
	}
}