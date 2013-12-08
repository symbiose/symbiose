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
		if (json_last_error() !== JSON_ERROR_NONE) {
			//Try with stripslashes()
			$reqsData = json_decode(stripslashes($this->httpRequest->postData('data')), true);

			if (json_last_error() !== JSON_ERROR_NONE) {
				$errMsg = '#'.json_last_error();
				if (function_exists('json_last_error_msg')) {
					$errMsg .= ' '.json_last_error_msg();
				}

				throw new \RuntimeException('Malformed JSON-encoded request ('.$errMsg.')', 400);
			}
		}

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
		if ($resp->cacheable()) {
			$this->httpResponse->setCacheable();
		}

		$this->httpResponse->setContent($resp);
	}
}