<?php
namespace lib\entities;

use \InvalidArgumentException;

class Email extends \lib\Entity {
	protected $to, $subject, $message, $headers;

	// SETTERS

	public function setTo($to) {
		if (!is_string($to) || empty($to)) {
			throw new InvalidArgumentException('Invalid e-mail recipient "'.$to.'"');
		}

		$this->to = $to;
	}

	public function setSubject($subject) {
		if (!is_string($subject)) {
			throw new InvalidArgumentException('Invalid e-mail subject "'.$subject.'"');
		}

		$this->subject = $subject;
	}

	public function setMessage($msg) {
		if (!is_string($msg)) {
			throw new InvalidArgumentException('Invalid e-mail message "'.$msg.'"');
		}

		$this->message = $msg;
	}

	public function setHeaders($headers) {
		if (!is_string($headers)) {
			throw new InvalidArgumentException('Invalid e-mail headers "'.$headers.'"');
		}

		$this->headers = $headers;
	}

	// GETTERS

	public function to() {
		return $this->to;
	}

	public function subject() {
		return $this->subject;
	}

	public function message() {
		return $this->message;
	}

	public function headers() {
		return $this->headers;
	}
}