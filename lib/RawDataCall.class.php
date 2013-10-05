<?php
namespace lib;

/**
 * A raw data call.
 * @author Simon Ser
 * @since 1.0beta3
 */
class RawDataCall extends \lib\Application {
	const DEFAULT_MODULE = 'file';

	/**
	 * Initialize this call.
	 */
	public function __construct() {
		parent::__construct();

		$this->name = 'rawDataCall';
	}

	/**
	 * Get this call's controller.
	 * @return BackController The controller.
	 */
	public function getController() {
		//Determine the controller's name
		$moduleName = ($this->httpRequest->getExists('type')) ? $this->httpRequest->getData('type') : self::DEFAULT_MODULE;

		//And then create the controller
		return $this->buildController($moduleName, 'index');
	}

	public function run() {
		$controller = $this->getController();
		$controller->execute();

		$out = $controller->responseContent()->value();

		//Enable cache
		$cacheOffset = 7 * 24 * 3600;
		$this->httpResponse->addHeader('Cache-Control: max-age=' . $cacheOffset . ', must-revalidate');
		$this->httpResponse->removeHeader('Pragma');
		$this->httpResponse->removeHeader('Expires');

		$this->httpResponse->addHeader('Content-Length: ' . strlen($out));

		//Set the response content
		$this->httpResponse->setContent($controller->responseContent());
	}
}