<?php
namespace lib\models;

class Translation extends \lib\WebosComponent {
	protected $data = array();
	
	public function __construct($webos, array $data) {
		parent::__construct($webos);
		
		$this->data = $data;
	}
	
	public function get($original) {
		if (!array_key_exists($original, $this->data)) {
			return $original;
		}
		
		return $this->data[$original];
	}
}