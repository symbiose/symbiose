<?php
namespace lib;

/**
 * An API response.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiResponse implements ResponseContent {
	/**
	 * The response's id.
	 * @var int
	 */
	protected $id;

	/**
	 * The response's data.
	 * @var array
	 */
	protected $data = array();

	/**
	 * The response's status code (similar to HTTP status codes).
	 * @var int
	 */
	protected $statusCode = 200;

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
	 * True if the response is can be cached, false otherwise.
	 * @var boolean
	 */
	protected $cacheable = false;

	//GETTERS

	/**
	 * Generate the response content.
	 * @return string The response content.
	 */
	public function generate() {
		$resp = array(
			'id' => $this->id(),
			'success' => $this->success(),
			'statusCode' => $this->statusCode(),
			'channels' => $this->channels(),
			'out' => $this->value(),
			'data' => $this->data()
		);

		return json_encode($resp, JSON_FORCE_OBJECT);
	}

	/**
	 * Get this response's id.
	 * @return int The id.
	 */
	public function id() {
		return $this->id;
	}

	/**
	 * Get this response content's data.
	 * @return array The data.
	 */
	public function data() {
		return $this->data;
	}

	/**
	 * Get this status code.
	 * @return int The status code.
	 */
	public function statusCode() {
		return $this->statusCode;
	}

	/**
	 * Check if this response is a success.
	 * @return boolean True if there was no error, false otherwise.
	 */
	public function success() {
		return ((int) substr($this->statusCode(), 0, 1) == 2);
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
	 * Check if this response is cacheable.
	 * @return boolean True if the response is can be cached, false otherwise.
	 */
	public function cacheable() {
		return $this->cacheable;
	}

	//SETTERS

	/**
	 * Set this response content's id.
	 * @param int $id The id.
	 */
	public function setId($id) {
		if (!is_int($id)) {
			throw new \InvalidArgumentException('Invalid response id "'.$id.'"');
		}

		$this->id = $id;
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
		if (!is_string($value)) {
			throw new \InvalidArgumentException('Invalid response value "'.$value.'"');
		}

		$this->value = $value;
	}

	/**
	 * Set this status' code.
	 * @param int $code The status code.
	 */
	public function setStatusCode($code) {
		if (!is_int($code) || strlen($code) != 3) {
			throw new \InvalidArgumentException('Invalid response status code "'.$code.'"');
		}

		$this->statusCode = $code;
	}

	/**
	 * Set this response content's success.
	 * @param boolean $value The success value.
	 */
	public function setSuccess($value) {
		if (!is_bool($value)) {
			throw new \InvalidArgumentException('Invalid response success "'.$value.'"');
		}

		$this->setStatusCode(($value) ? 200 : 500);
	}

	/**
	 * Set a channel's value.
	 * @param int    $no    The channel number.
	 * @param string $value The value.
	 */
	public function setChannel($no, $value) {
		$this->channels[$no] = $value;
	}

	/**
	 * Set this response's cacheable value.
	 * @param boolean $value The cacheable value.
	 */
	public function setCacheable($value) {
		if (!is_bool($value)) {
			throw new \InvalidArgumentException('Invalid response cacheable value "'.$value.'"');
		}

		$this->cacheable = $value;
	}
}