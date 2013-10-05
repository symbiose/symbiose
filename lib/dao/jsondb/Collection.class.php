<?php
namespace lib\dao\jsondb;

class Collection implements \ArrayAccess, \IteratorAggregate, \Countable {
	protected $data;

	public function __construct($data = array()) {
		if (!$data instanceof \Traversable && !is_array($data)) {
			throw new \InvalidArgumentException('Invalid data : variable must be an array or traversable');
		}

		$this->data = array();

		foreach($data as $id => $item) {
			if (is_array($item) || $item instanceof \Traversable) {
				$this->data[] = new Item($item);
			} else if ($item instanceof Item) {
				$this->data[] = $item;
			}
		}
	}

	public function filter(array $filters = array()) {
		$data = $this->data;
		$filteredItems = array();

		if (count($filters) > 0) {
			foreach($this->data as $id => $item) {
				foreach($filters as $key => $value) {
					if (isset($item[$key]) && $item[$key] == $value) {
						$filteredItems[] = $item;
					}
				}
			}
		}
		
		return new $this($filteredItems);
	}

	public function getRange($from, $limit = -1) {
		$from = (int) $from;
		$limit = count($this->data);
		if ($limit >= 0) {
			$limit = $from + $limit;
		}

		$items = array();

		for ($i = $from; $i < $limit; $i++) {
			$items[] = $this->data[$i];
		}

		return new $this($items);
	}

	public function convertToArray($class = null) {
		$list = array();

		foreach($this->data as $item) {
			if (!empty($class)) {
				$item = new $class($item);
			} else {
				$item = $item->toArray();
			}

			$list[] = $item;
		}

		return $list;
	}

	public function offsetGet($id) {
		return isset($this->data[(int) $id]) ? $this->data[(int) $id] : null;
	}

	public function offsetSet($id, $item) {
		if (!$item instanceof Item) {
			throw new \InvalidArgumentException('A collection item must be an instance of Item');
		}

		if ($id === null) {
			$this->data[] = $item;
		} else {
			$this->data[(int) $id] = $item;
		}
	}

	public function offsetExists($id) {
		return isset($this->data[(int) $id]);
	}

	public function offsetUnset($id) {
		unset($this->data[(int) $id]);
	}

	public function getIterator() {
		return new \ArrayIterator($this->data);
	}

	public function count() {
		return count($this->data);
	}

	public function jsonSerialize() {
		return $this->data;
	}

	public function last() {
		return end($this->data);
	}
}