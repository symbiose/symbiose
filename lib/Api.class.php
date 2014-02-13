<?php
namespace lib;

/**
 * An API call.
 * @author Simon Ser
 * @since 1.0beta3
 */
class Api extends \lib\Application {
	/**
	 * True if this API is emulated, false otherwise.
	 * @var boolean
	 */
	protected $emulated = false;

	/**
	 * If this request is emulated, the data.
	 * @var array
	 */
	protected $emulatedData = array();

	/**
	 * Initialize this call.
	 */
	public function __construct() {
		parent::__construct();

		$this->name = 'api';
	}

	protected function _getData($key) {
		if ($this->emulated) {
			return $this->emulatedData[$key];
		} elseif ($this->httpRequest->postExists($key)) {
			return $this->httpRequest->postData($key);
		} else {
			return $this->httpRequest->getData($key);
		}
	}

	/**
	 * Get this call's controller.
	 * @return BackController The controller.
	 */
	public function getController() {
		//Determine the controller's name & action
		$moduleName = $this->_getData('module');
		$moduleAction = $this->_getData('action');

		//And then create the controller
		return $this->buildController($moduleName, $moduleAction);
	}

	/**
	 * Emulate this API.
	 * @param  array $data The data.
	 */
	public function emulate(array $data, HTTPRequest $httpRequest = null) {
		$this->emulated = true;
		$this->emulatedData = $data;

		if (!empty($httpRequest)) {
			$this->httpRequest = $httpRequest;
		}
	}

	/**
	 * Check if this API is emulated.
	 * @return boolean True if this API is emulated, false otherwise.
	 */
	public function emulated() {
		return $this->emulated;
	}

	public function run() {
		$reqId = (int) $this->_getData('id');
		$moduleArgs = $this->_getData('arguments');

		if (is_string($moduleArgs)) {
			$moduleArgs = json_decode(urldecode($moduleArgs), true);

			if (json_last_error() !== JSON_ERROR_NONE) {
				//Try with stripslashes()
				$moduleArgs = json_decode(stripslashes(urldecode($moduleArgs)), true);

				if (json_last_error() !== JSON_ERROR_NONE) {
					$errMsg = '#'.json_last_error();
					if (function_exists('json_last_error_msg')) {
						$errMsg .= ' '.json_last_error_msg();
					}

					throw new \RuntimeException('Malformed JSON-encoded arguments ('.$errMsg.')', 400);
				}
			}
		}

		$controller = $this->getController();
		$controller->execute($moduleArgs);

		$resp = $controller->responseContent();

		if (!$this->emulated()) { //Do not set headers if the API si emulated
			$this->httpResponse->addHeader('Content-Type: application/json');

			if ($resp->cacheable()) {
				$this->httpResponse->setCacheable();
			}
		}

		$resp->setId($reqId);
		$this->httpResponse->setContent($resp);
	}
}