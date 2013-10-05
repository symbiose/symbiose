<?php
namespace lib;

/**
 * A configuration file.
 * @author Simon Ser
 * @since 1.0beta3
 */
abstract class Config {
	/**
	 * The configuration's path.
	 * @var string
	 */
	protected $path;

	/**
	 * The config data.
	 * @var array
	 */
	protected $data = null;

	/**
	 * Initialize the configuration file.
	 * @param Application $app    The application.
	 * @param string      $module The module.
	 */
	public function __construct($path) {
		$this->path = $path;
	}

	/**
	 * Input data from plain text.
	 * @param  string $input The plain text data.
	 */
	abstract public function input($input);

	/**
	 * Read the configuration's file data.
	 * @return array The data.
	 */
	public function read() {
		if (empty($this->data)) {
			if (!file_exists($this->path)) {
				$this->data = array();
			} else {
				$input = file_get_contents($this->path);

				if ($input === false) {
					$this->data = array();
				} else {
					$this->input($input);
				}
			}
		}

		return $this->data;
	}

	/**
	 * Output data to plain text.
	 * @param  array  $data The data.
	 * @return string       The plain text data.
	 */
	abstract public function output(array $data);

	/**
	 * Write data into this configuration file.
	 * @param  array  $data The data.
	 */
	public function write(array $data) {
		$output = $this->output($data);

		$result = file_put_contents($this->path, $output);

		if ($result === false) {
			throw new \RuntimeException('Cannot open configuration file "'.$this->path.'" (error while writing)');
		}

		$this->data = $data;
	}
}