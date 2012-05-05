<?php
namespace lib;

/**
 * FatalError represente une erreur fatale.
 * @author simon
 * @version 1.0
 */
class FatalError extends Error {
	public function __toString() {
		return '<strong>Fatal error</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong> (PHP '.PHP_VERSION.' on '.PHP_OS.')<br />';
	}

	public function show() {
		parent::show();
		$this->bye(); //On arrete le script
	}
}