<?php
namespace lib;

/**
 * An API group response.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiGroupResponse implements ResponseContent {
	/**
	 * The responses.
	 * @var array
	 */
	protected $responses = array();

	/**
	 * Generate the response content.
	 * @return string The response content.
	 */
	public function generate() {
		$groupResp = array();

		foreach($this->responses as $i => $resp) {
			$groupResp[$i] = array(
				'success' => $resp->success(),
				'channels' => $resp->channels(),
				'out' => $resp->value(),
				'data' => $resp->data()
			);
		}

		return json_encode($groupResp, JSON_FORCE_OBJECT);
	}

	/**
	 * Get this group's responses.
	 * @return array The responses.
	 */
	public function responses() {
		return $this->responses;
	}

	/**
	 * Set this group's responses.
	 * @param array $responses The responses.
	 */
	public function setResponses(array $responses) {
		$this->responses = $responses;
	}
}