<?php
namespace lib\entities;

use \InvalidArgumentException;

class Authorization extends \lib\Entity {
	protected $name, $userId;

	// SETTERS

	public function setName($name) {
		if (!is_string($name) || empty($name)) {
			throw new InvalidArgumentException('Invalid authorization name "'.$name.'"');
		}

		$this->name = $name;
	}

	// GETTERS

	public function name() {
		return $this->name;
	}
}