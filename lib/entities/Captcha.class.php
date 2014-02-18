<?php
namespace lib\entities;

use \InvalidArgumentException;

class Captcha extends \lib\Entity {
	const TYPE_QUESTION = 1;
	const TYPE_IMAGE = 2;

	protected $question, $result, $type;

	// SETTERS

	public function setQuestion($question) {
		if (!is_string($question) || empty($question)) {
			throw new InvalidArgumentException('Invalid captcha question');
		}

		$this->question = $question;
	}

	public function setResult($result) {
		if (!is_string($result) && !is_int($result)) {
			throw new InvalidArgumentException('Invalid captcha result');
		}

		$this->result = $result;
	}

	public function setType($type) {
		if ($type !== self::TYPE_QUESTION && $type !== self::TYPE_IMAGE) {
			throw new InvalidArgumentException('Invalid captcha type');
		}

		$this->type = $type;
	}

	// GETTERS

	public function question() {
		return $this->question;
	}

	public function result() {
		return $this->result;
	}

	public function type() {
		return $this->type;
	}
}