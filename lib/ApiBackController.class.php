<?php
namespace lib;

/**
 * An API back controller.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class ApiBackController extends BackController {
	public function __construct(Api $app, $module, $action) {
		parent::__construct($app, $module, $action);

		$this->responseContent = new ApiResponse();

		$this->guardian = new ApiGuardian($app);
	}

	protected function _controlAuthorizations(array $args) {
		$user = $this->app()->user();
		$authManager = $this->managers()->getManagerOf('authorization');

		$userAuths = array();

		if ($user->isLogged()) {
			$userAuths = $authManager->getByUserId($user->id());
		}

		$this->guardian->controlAccess($this->module(), 'execute'.ucfirst($this->action()), $args, $userAuths);
	}

	public function execute(array $args = array()) {
		$method = 'execute'.ucfirst($this->action());

		$result = null;
		try {
			$this->_controlAuthorizations($args);

			$result = $this->_callMethod($method, $args);
		} catch (\ErrorException $e) {
			$errMsg = htmlspecialchars('[#'.$e->getSeverity().'] ' . $e->getMessage() . ' in '.$e->getFile().':'.$e->getLine()."\n".'Stack trace:'."\n".$e->getTraceAsString());

			$this->responseContent()->setSuccess(false);
			$this->responseContent()->setChannel(2, $errMsg);
			$this->responseContent()->setValue($errMsg);
		} catch(\Exception $e) {
			$errMsg = htmlspecialchars($e->getMessage());

			$this->responseContent()->setSuccess(false);
			$this->responseContent()->setChannel(2, $errMsg);
			$this->responseContent()->setValue($errMsg);
		}

		if (is_array($result)) {
			$this->responseContent()->setData($result);
		}

		return $result;
	}

	protected function guardian() {
		return $this->guardian;
	}
}