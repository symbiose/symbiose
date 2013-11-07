<?php
namespace lib;

/**
 * An API group response.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiGroupResponse implements ResponseContent {
	/**
	 * The response's id.
	 * @var int
	 */
	protected $id;

	/**
	 * The responses.
	 * @var array
	 */
	protected $responses = array();

	//GETTERS

	/**
	 * Generate the response content.
	 * @return string The response content.
	 */
	public function generate() {
		$groupResp = array();

		foreach($this->responses as $i => $resp) {
			$groupResp[$i] = array(
				'id' => $resp->id(),
				'success' => $resp->success(),
				'channels' => $resp->channels(),
				'out' => $resp->value(),
				'data' => $resp->data()
			);
		}

		return json_encode(array(
			'id' => $this->id(),
			'groupped' => true,
			'data' => $groupResp
		), JSON_FORCE_OBJECT);
	}

	/**
	 * Get this response's id.
	 * @return int The id.
	 */
	public function id() {
		return $this->id;
	}

	/**
	 * Get this group's responses.
	 * @return array The responses.
	 */
	public function responses() {
		return $this->responses;
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
	 * Set this group's responses.
	 * @param array $responses The responses.
	 */
	public function setResponses(array $responses) {
		$this->responses = $responses;
	}
}