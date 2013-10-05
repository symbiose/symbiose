<?php
namespace lib\dao\jsondb;

class File {
	protected $db;
	protected $index;

	protected $items;

	public function __construct(Database $db, $index) {
		$this->db = $db;
		$this->index = $index;
	}

	protected function _getPath() {
		return $this->db->root().'/'.$this->index.'.json';
	}

	protected function _retrieveItems() {
		$path = $this->_getPath();

		if (!file_exists($path)) {
			$this->items = new Collection();
			return;
		}

		$json = file_get_contents($path);

		if ($json === false) {
			throw new \RuntimeException('Cannot open data file "'.$this->index.'" ("'.$path.'" : error while reading)');
		}

		$data = json_decode($json, true);

		if (json_last_error() !== JSON_ERROR_NONE) {
			throw new \RuntimeException('Cannot open data file "'.$this->index.'" ("'.$path.'" : malformed JSON)');
		}

		$this->items = new Collection($data);
	}

	public function read() {
		if (empty($this->items)) {
			$this->_retrieveItems();
		}

		return $this->items;
	}

	public function write(Collection $items) {
		$path = $this->_getPath();

		$this->items = $items;

		//if (defined('JSON_PRETTY_PRINT')) { //PHP >= 5.4
		//	$json = json_encode($items->convertToArray(), JSON_PRETTY_PRINT); //JSON_PRETTY_PRINT: for debugging issues
		//} else {
			$json = json_encode($items->convertToArray());
		//}

		if ($json === false) {
			throw new \RuntimeException('Cannot encode data to JSON');
		}

		$parentPath = dirname($path);
		if (!is_dir($parentPath)) {
			mkdir($parentPath, 0777, true);
			chmod($parentPath, 0777);
		}

		$alreadyExists = file_exists($path);

		$result = file_put_contents($path, $json);

		if ($result === false) {
			throw new \RuntimeException('Cannot open data file "'.$this->index.'" ("'.$path.'" : error while writing)');
		}

		if (!$alreadyExists) {
			chmod($path, 0777);
		}
	}
}