<?php
namespace lib;

/**
 * DeprecatedError represente une alerte d'execution
 * @author $imon
 * @version 1.0
 */
class DeprecatedError extends Error {
	public function __toString() {
		return '<strong>Deprecated</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong><br />';
	}
}