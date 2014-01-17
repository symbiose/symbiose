<?php
namespace lib;

/**
 * A temporary directory.
 * @author Simon Ser
 * @since 1.0beta4
 */
class TemporaryDirectory {
	/**
	 * The directory's name.
	 * @var string
	 */
	protected $name;

	/**
	 * Initialize the temporary directory.
	 */
	public function __construct() {
		$this->name = date('Y-m-d-H-i-s').'_'.substr(sha1(microtime() + rand(0, 100)), 0, 10);
	}

	/**
	 * Get this directory's path.
	 * @return string
	 */
	protected function _rootPath() {
		return '/tmp/'.$this->name.'/';
	}

	/**
	 * Get this directory's internal path.
	 * @return string
	 */
	protected function _rootInternalPath() {
		return __DIR__.'/../'.$this->_rootPath();
	}

	/**
	 * Get this directory's path, and create it if it doesn't exist.
	 * @return string The path to the temporary directory.
	 */
	public function root() {
		$root = $this->_rootInternalPath();

		if (!is_dir($root)) {
			if (!mkdir($root, 0777, true)) {
				throw new \RuntimeException('Cannot create temporary folder "'.$root.'"');
			}
			chmod($root, 0777);
		}

		return $this->_rootPath();
	}

	/**
	 * Flush this temporary directory.
	 */
	public function flush() {
		$root = $this->root(); //Create dir if it doesn't exist

		$this->_flushTree($this->_rootInternalPath());
	}

	/**
	 * Delete a whole directory.
	 * @param  string  $dir       The directory's path.
	 * @param  boolean $deleteDir If set to true, the given directory will be deleted.
	 */
	protected function _flushTree($dir, $deleteDir = false) {
		$files = array_diff(scandir($dir), array('.','..'));

		foreach ($files as $file) {
			(is_dir($dir.'/'.$file)) ? $this->_flushTree($dir.'/'.$file, true) : unlink($dir.'/'.$file); 
		}

		if ($deleteDir) {
			rmdir($dir);
		}
	}

	/**
	 * @see self#root()
	 */
	public function __toString() {
		try {
			return $this->root();
		} catch (\Exception $e) {
			return '';
		}
	}

	/**
	 * Delete this temporary directory.
	 */
	public function __destruct() {
		$this->flush();
		rmdir($this->_rootInternalPath());
	}
}