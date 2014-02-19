<?php
namespace lib\entities;

use \InvalidArgumentException;

class UserInterface extends \lib\Entity {
	protected $name, $labels, $isDefault;

	public function setName($name) {
		if (!is_string($name) || empty($name)) {
			throw new InvalidArgumentException('Invalid user interface name');
		}

		$this->name = $name;
	}

	public function setLabels(array $labels) {
		$this->labels = $labels;
	}

	public function setIsDefault($isDefault) {
		if (!is_bool($isDefault)) {
			throw new InvalidArgumentException('Invalid user interface default value');
		}

		$this->isDefault = $isDefault;
	}

	public function name() {
		return $this->name;
	}

	public function labels() {
		return $this->labels;
	}

	public function isDefault() {
		return ($this->isDefault) ? true : false;
	}
}