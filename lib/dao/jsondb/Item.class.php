<?php
namespace lib\dao\jsondb;

class Item implements \ArrayAccess, \IteratorAggregate {
	protected $data = array();

	public function __construct($data) {
		if (!$data instanceof \Traversable && !is_array($data)) {
			throw new \InvalidArgumentException('Invalid data : variable must be an array or traversable');
		}

		foreach($data as $key => $value) {
			$this->data[$key] = $value;
		}
	}

	public function offsetGet($key) {
		return isset($this->data[$key]) ? $this->data[$key] : null;
	}

	public function offsetSet($key, $value) {
		$this->data[$key] = $value;
	}

	public function offsetExists($key) {
		return isset($this->data[$key]);
	}

	public function offsetUnset($key) {
		throw new \Exception('Cannot delete any field');
	}

	public function getIterator() {
		return new \ArrayIterator($this->data);
	}

	public function toArray() {
		return $this->data;
	}

	public function jsonSerialize() {
		return $this->toArray();
	}
}