<?php
namespace lib\models;

/**
 * ErrorLog represente le log d'une erreur.
 * @author $imon
 * @version 1.0
 */
class ErrorLog extends Log {
	/**
	 * Initialise le log.
	 * @param Error $error L'erreur a journaliser.
	 */
	public function __construct(\lib\Error $error) {
		$this->log = $error->getFile().':'.$error->getLine().' ['.get_class($error).'] '.$error->getMessage();
	}

	/**
	 * Journalise l'erreur.
	 */
	public function save() {
		$this->_save('errors.log');
	}
}