<?php
namespace lib\entities;

if (!isset($_SESSION)) {
	session_start();
}
if (!isset($_SESSION['processes'])) {
	$_SESSION['processes'] = array();
}

/**
 * A process.
 * @author $imon
 */
class Process extends \lib\Entity {
	protected $key;

	public function __construct($data = array()) {
		parent::__construct($data);

		//Generate a new process id
		end($_SESSION['processes']);
		if (count($_SESSION['processes']) > 0) {
			$id = key($_SESSION['processes']) + 1;
		} else {
			$id = 0;
		}
		$this->setId($id);

		//Generate the process key
		$this->key = sha1((mt_rand() + microtime()) . '$8e&8.)9{[]|aEQ');
	}

	public function key() {
		return $this->key;
	}
}