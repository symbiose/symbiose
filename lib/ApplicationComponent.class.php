<?php
namespace lib;

/**
 * An application component.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class ApplicationComponent {
	/**
	 * The application.
	 * @var Application
	 */
	protected $app;

	/**
	 * Initialize this application component.
	 * @param Application $app The application.
	 */
	public function __construct(Application $app) {
		$this->app = $app;
	}

	/**
	 * Get the application.
	 * @return Application
	 */
	public function app() {
		return $this->app;
	}
}