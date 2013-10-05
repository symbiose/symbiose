<?php
namespace lib;

/**
 * An API response.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiResponse implements ResponseContent {
	/**
	 * The response's data.
	 * @var array
	 */
	protected $data = array();

	/**
	 * The response's status. True if there is no error, false otherwise.
	 * @var boolean
	 */
	protected $success = true;

	/**
	 * The response's value.
	 * @var string
	 */
	protected $value = '';

	/**
	 * The response's channels.
	 * @var array
	 */
	protected $channels = array();

	/**
	 * Generate the response content.
	 * @return string The response content.
	 */
	public function generate() {
		$resp = array(
			'success' => $this->success,
			'channels' => $this->channels,
			'out' => $this->value,
			'data' => $this->data
		);

		return json_encode($resp, JSON_FORCE_OBJECT);
	}

	/**
	 * Get this response content's data.
	 * @return array The data.
	 */
	public function data() {
		return $this->data;
	}

	/**
	 * Check if this response is a success.
	 * @return boolean True if there was no error, false otherwise.
	 */
	public function success() {
		return $this->success;
	}

	/**
	 * Get this response content's value.
	 * @return string The value.
	 */
	public function value() {
		return $this->value;
	}

	/**
	 * Get this response content's channels.
	 * @return array The channels.
	 */
	public function channels() {
		return $this->channels;
	}

	/**
	 * Set this response content's data.
	 * @param array $data The data.
	 */
	public function setData(array $data) {
		$this->data = $data;
	}

	/**
	 * Set this response content's value.
	 * @param string $value The value.
	 */
	public function setValue($value) {
		$this->value = $value;
	}

	/**
	 * Set this response content's success.
	 * @param boolean $value The success value.
	 */
	public function setSuccess($value) {
		$this->success = ($value) ? true : false;
	}

	/**
	 * Set a channel's value.
	 * @param int    $no    The channel number.
	 * @param string $value The value.
	 */
	public function setChannel($no, $value) {
		$this->channels[$no] = $value;
	}
}