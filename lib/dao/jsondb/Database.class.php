<?php
namespace lib\dao\jsondb;

class Database {
	protected $root;

	protected $cache = array();

	public function __construct($root) {
		$this->root = $root;
	}

	public function open($index) {
		if (isset($this->cache[$index])) {
			return $this->cache[$index];
		}

		$file = new File($this, $index);

		$this->cache[$index] = $file;

		return $file;
	}

	public function createCollection($data = array()) {
		return new Collection($data);
	}

	public function createItem($data = array()) {
		return new Item($data);
	}

	public function root() {
		return $this->root;
	}
}