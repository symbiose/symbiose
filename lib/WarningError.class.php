<?php
namespace lib;

/**
 * WarningError represente un avertissement.
 * @author $imon
 * @version 1.0
 */
class WarningError extends Error {
	public function __toString() {
		return '<strong>Warning</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong>';
	}
}