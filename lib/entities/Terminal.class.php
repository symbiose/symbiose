<?php
namespace lib\entities;

use InvalidArgumentException;

/**
 * A terminal.
 * @author $imon
 */
class Terminal extends \lib\Entity {
	protected $dir = '/';

	public function setDir($dir) {
		if (!is_string($dir) || empty($dir)) {
			throw new InvalidArgumentException('Invalid directory name "'.$dir.'"');
		}

		$this->dir = $dir;
	}

	public function dir() {
		return $this->dir;
	}

	public function absoluteLocation($location, $terminalId) {
		if (preg_match('#^[/~]#', $location)) //Absolute path
			return $location;
		else { //Relative path
			return $this->dir() . '/' . $location;
		}
	}
}