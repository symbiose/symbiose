<?php
namespace lib;

/**
 * A data entity.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class Entity implements \ArrayAccess {
	/**
	 * The identifier of this entity.
	 * @var int
	 */
	protected $id;

	/**
	 * Initialize this entity.
	 * @param array $data The data to store in this entity.
	 */
	public function __construct($data = array()) {
		if (!$data instanceof \Traversable && !is_array($data)) {
			throw new \InvalidArgumentException('Invalid data : variable must be an array or traversable');
		}

		if (!empty($data)) {
			$this->hydrate($data);
		}
	}

	/**
	 * Determine if this entity is new.
	 * @return boolean True if it is new, false otherwise.
	 */
	public function isNew() {
		return empty($this->id);
	}

	/**
	 * Get this entity's identifier.
	 * @return int
	 */
	public function id() {
		return $this->id;
	}

	/**
	 * Set this entity's identifier.
	 * @param int $id The new identifier.
	 */
	public function setId($id) {
		$this->id = (int) $id;
	}

	/**
	 * Store data in this entity.
	 * @param array $data The data to store.
	 */
	public function hydrate($data) {
		if (!$data instanceof \Traversable && !is_array($data)) {
			throw new \InvalidArgumentException('Invalid data : variable must be an array or traversable');
		}

		foreach ($data as $key => $value) {
			$method = 'set'.ucfirst($key);

			if (is_callable(array($this, $method))) {
				$this->$method($value);
			}
		}
	}

	public function offsetGet($var) {
		if (is_callable(array($this, $var))) {
			return $this->$var();
		}
	}

	public function offsetSet($var, $value) {
		$method = 'set'.ucfirst($var);

		if (is_callable(array($this, $method))) {
			$this->$method($value);
		}
	}

	public function offsetExists($var) {
		return is_callable(array($this, $var));
	}

	public function offsetUnset($var) {
		throw new \Exception('Cannot delete any field');
	}

	/**
	 * Convert this entity to an array containing the data.
	 * @return array This entity's data.
	 */
	public function toArray() {
		$data = array();

		foreach(get_object_vars($this) as $key => $value) {
			if (isset($this[$key])) {
				$data[$key] = $this[$key];
			}
		}

		return $data;
	}

	public function jsonSerialize() {
		return $this->toArray();
	}
}