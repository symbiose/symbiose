<?php
namespace lib;

/**
 * ExceptionError represente une erreur declanchee par un exception.
 * @author $imon
 * @version 1.0
 */
class ExceptionError extends Error {
	public function __toString() {
		return $this->message.' (exception thrown in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong> - PHP '.PHP_VERSION.' on '.PHP_OS.')<br />';
	}

	public function show() {
		parent::show();
		$this->bye(); //On arrete le script
	}
}