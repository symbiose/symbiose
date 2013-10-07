<?php
namespace lib;

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
}