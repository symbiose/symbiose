<?php
namespace lib;

/**
 * NoticeError represente une remarque.
 * @author $imon
 * @version 1.0
 */
class NoticeError extends Error {
	public function __toString() {
		return '<strong>Notice</strong> : '.$this->message.' in <strong>'.$this->file.'</strong> on line <strong>'.$this->line.'</strong><br />';
	}
}