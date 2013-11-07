<?php
namespace lib;

/**
 * An API call group.
 * @author Simon Ser
 * @since 1.0beta3
 */
class ApiGroup extends \lib\Application {
	/**
	 * Initialize this call group.
	 */
	public function __construct() {
		parent::__construct();

		$this->name = 'apiGroup';
	}

	public function run() {
		$reqId = (int) $this->httpRequest->postData('id');
		$reqsData = json_decode($this->httpRequest->postData('data'), true);

		foreach($reqsData as $requestData) {
			$apiCall = new Api();
			$apiCall->emulate($requestData);
			$apiCall->run();

			$responses[] = $apiCall->httpResponse()->content();
		}

		$resp = new ApiGroupResponse;
		$resp->setResponses($responses);
		$resp->setId($reqId);

		$this->httpResponse->addHeader('Content-Type: application/json');
		$this->httpResponse->setContent($resp);
	}
}