<?php
namespace lib;

/**
 * StrictError represente une suggestion.
 * @author $imon
 * @version 1.0
 */
class StrictError extends Error {
	public function __toString() {
		return '<strong>Strict standards</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong><br />';
	}
}