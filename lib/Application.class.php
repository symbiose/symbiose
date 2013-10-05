<?php
namespace lib;

/**
 * An application (e.g. interface booter/API).
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class Application {
	/**
	 * The HTTP request.
	 * @var HTTPRequest
	 */
	protected $httpRequest;

	/**
	 * The HTTP response.
	 * @var HTTPResponse
	 */
	protected $httpResponse;

	/**
	 * The user.
	 * @var User
	 */
	protected $user;

	/**
	 * The application's name.
	 * @var string
	 */
	protected $name;

	/**
	 * Initialize a new application.
	 */
	public function __construct() {
		$this->httpRequest = new HTTPRequest;
		$this->httpResponse = new HTTPResponse;

		$this->user = new User($this);
	}

	/**
	 * Build a controller.
	 * @param  string $module The controller's module.
	 * @param  string $action The controller's action.
	 * @return BackController The controller.
	 */
	public function buildController($module, $action) {
		$controllerClass = 'lib\\ctrl\\'.$this->name.'\\'.ucfirst($module).'Controller';

		return new $controllerClass($this, $module, $action);
	}

	/**
	 * Launch the application.
	 */
	abstract public function run();

	/**
	 * Render the application.
	 */
	public function render() {
		$this->run();

		$this->httpResponse->send();
	}

	/**
	 * Get the HTTP request.
	 * @return HTTPRequest
	 */
	public function httpRequest() {
		return $this->httpRequest;
	}

	/**
	 * Get the HTTP response.
	 * @return HTTPResponse
	 */
	public function httpResponse() {
		return $this->httpResponse;
	}

	/**
	 * Get the user.
	 * @return User
	 */
	public function user() {
		return $this->user;
	}

	/**
	 * Get this application's name.
	 * @return string
	 */
	public function name() {
		return $this->name;
	}
}