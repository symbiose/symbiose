<?php
namespace lib;

use Evenement\EventEmitter;

/**
 * A raw data response.
 * @author Simon Ser
 * @since 1.0beta3
 */
class RawResponse implements ResponseContent {
	/**
	 * The response's raw content.
	 * @var string
	 */
	protected $value = '';

	/**
	 * The event emitter.
	 * @var  EventEmitter
	 */
	protected $emitter;

	/**
	 * Generate the response content.
	 * @return string The response content.
	 */
	public function generate() {
		return $this->value;
	}

	/**
	 * Set this response content's value.
	 * @param string $value The response content's value.
	 */
	public function setValue($value) {
		$this->value = $value;
	}

	/**
	 * Get this response content's value.
	 * @return string $value The response content's value.
	 */
	public function value() {
		return $this->value;
	}

	/**
	 * Output some contents.
	 * @param  string $out The output.
	 */
	public function output($out) {
		if (empty($this->emitter)) {
			$this->value .= $out;
		} else {
			$this->emitter->emit('output', array($out));
		}
	}

	/**
	 * Get this event emitter.
	 * @return EventEmitter The event emitter.
	 */
	public function emitter() {
		if (empty($this->emitter)) {
			$this->emitter = new EventEmitter();
		}

		return $this->emitter;
	}
}