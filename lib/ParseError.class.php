<?php
namespace lib;

/**
 * ParseError represente une erreur d'analyse.
 * @author $imon
 * @version 1.0
 */
class ParseError extends Error {
	public function __toString() {
		return '<strong>Parse error</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong><br />';
	}
}