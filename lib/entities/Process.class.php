<?php
namespace lib\entities;

/**
 * A process.
 * @author $imon
 */
class Process extends \lib\Entity {
	protected $key;

	public function __construct($data = array()) {
		parent::__construct($data);

		//Generate the process key
		$this->key = sha1((mt_rand() + microtime()) . '$8e&8.)9{[]|aEQ');
	}

	public function key() {
		return $this->key;
	}
}