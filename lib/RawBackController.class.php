<?php
namespace lib;

/**
 * A raw data back controller.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class RawBackController extends BackController {
	public function __construct(Application $app, $module, $action) {
		parent::__construct($app, $module, $action);

		$this->responseContent = new RawResponse();

		$this->guardian = new Guardian($app);
	}

	public function execute() {
		try {
			$result = parent::execute();
		} catch(\Exception $e) {
			if ($this->app->httpResponse()->responseCode() == 200) {
				$this->app->httpResponse()->addHeader('HTTP/1.0 500 Internal Server Error');
			}

			$this->app->httpResponse()->addHeader('Content-Type: text/plain');
			$this->responseContent()->setValue($e->getMessage());
			return;
		}

		return $result;
	}
}