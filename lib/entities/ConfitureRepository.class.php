<?php
namespace lib\entities;

use \lib\Entity;
use \InvalidArgumentException;

class ConfitureRepository extends Entity {
	protected $name, $url;

	// SETTERS

	public function setName($name) {
		if (!is_string($name) || empty($name)) {
			throw new InvalidArgumentException('Invalid confiture repository name "'.$name.'"');
		}

		$this->name = $name;
	}

	public function setUrl($url) {
		if (!is_string($url) || empty($url)) {
			throw new InvalidArgumentException('Invalid confiture repository url "'.$url.'"');
		}

		$this->url = $url;
	}

	// GETTERS
	
	public function name() {
		return $this->name;
	}

	public function url() {
		return $this->url;
	}
}