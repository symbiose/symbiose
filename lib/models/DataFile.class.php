<?php
namespace lib\models;

/**
 * A file containing raw data.
 * @author $imon
 * @since 1.0beta3
 */
class DataFile extends \lib\WebosComponent {
	/**
	 * The file.
	 * @var File
	 */
	protected $file;

	/**
	 * The data.
	 * @var array
	 */
	protected $data = array();

	/**
	 * Initialize this data file.
	 */
	public function __construct(\lib\Webos $webos) {
		parent::__construct($webos);
	}

	/**
	 * Load a file.
	 * @param string $file The file.
	 */
	public function load($file) {
		if (!$this->webos->managers()->get('File')->exists($file)) {
			return false;
		}

		$this->file = $this->webos->managers()->get('File')->get($file);

		$json = $this->file->contents();

		$this->data = json_decode($json, true);
	}

	/**
	 * Get the current file.
	 * @return File The file.
	 */
	public function getFile() {
		return $this->file;
	}
	
	/**
	 * Get this data, encoded in JSON.
	 * @return string The JSON-encoded data.
	 */
	public function saveJSON() {
		return json_encode($this->data);
	}

	/**
	 * Save this file's data.
	 * @param string [$file] The file.
	 */
	public function save($file = null) {
		if (empty($file)) {
			$file = $this->file;
		} else {
			if (!$this->webos->managers()->get('File')->exists($file)) {
				$file = $this->webos->managers()->get('File')->createFile($file);
			} else {
				$file = $this->webos->managers()->get('File')->get($file);
			}
		}
		
		$out = $this->saveJSON();

		$file->setContents($out);
	}

	/**
	 * Get this file's data.
	 * @return array The data.
	 */
	public function getData() {
		return $this->data;
	}

	/**
	 * Set this file's data.
	 * @param array $data The data.
	 */
	public function setData(array $data) {
		$this->data = $data;
	}
}