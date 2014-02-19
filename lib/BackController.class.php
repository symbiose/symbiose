<?php
namespace lib;

/**
 * An back controller.
 * Back controllers are stored in /lib/ctrl.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class BackController extends ApplicationComponent {
	/**
	 * The module.
	 * @var string
	 */
	protected $module = '';

	/**
	 * The action.
	 * @var string
	 */
	protected $action = '';

	/**
	 * The managers.
	 * @var Managers
	 */
	protected $managers;

	/**
	 * The response's content.
	 * @var ResponseContent
	 */
	protected $responseContent;

	/**
	 * Initialize the back controller.
	 * @param Application $app    The application.
	 * @param string      $module The module.
	 * @param string      $action The action.
	 */
	public function __construct(Application $app, $module, $action) {
		parent::__construct($app);

		$this->setModule($module);
		$this->setAction($action);

		$daos = new Daos($app);
		$this->managers = new Managers($daos);
	}

	/**
	 * Execute the back controller.
	 */
	public function execute() {
		$method = 'execute'.ucfirst($this->action);

		return $this->_callMethod($method, array($this->app->httpRequest()));
	}

	/**
	 * Call one of this controller's methods.
	 * @param  string $method The method's name.
	 * @param  array  $args   Arguments to provide to the method.
	 * @return mixed          The value returned by the method.
	 */
	protected function _callMethod($method, array $args = array()) {
		if (!is_callable(array($this, $method))) {
			throw new \RuntimeException('Unknown action "'.$this->action().'" in this controller "'.$this->module().'"');
		}

		return call_user_func_array(array($this, $method), array_values($args));
	}

	/**
	 * Get this back controller's module.
	 * @return string
	 */
	public function module() {
		return $this->module;
	}

	/**
	 * Get this back controller's action.
	 * @return string
	 */
	public function action() {
		return $this->action;
	}

	/**
	 * Get this back controller's managers.
	 * @return Managers The managers.
	 */
	protected function managers() {
		return $this->managers;
	}

	/**
	 * Get this back controller's response's content.
	 * @return ResponseContent
	 */
	public function responseContent() {
		return $this->responseContent;
	}

	/**
	 * Set this back controller's module.
	 * @param string $module The module.
	 */
	public function setModule($module) {
		if (!is_string($module) || empty($module)) {
			throw new \InvalidArgumentException('Invalid module name');
		}

		$this->module = $module;
	}

	/**
	 * Set this back controller's action.
	 * @param string $module The action.
	 */
	public function setAction($action) {
		if (!is_string($action) || empty($action)) {
			throw new \InvalidArgumentException('Invalid action name');
		}

		$this->action = $action;
	}
}