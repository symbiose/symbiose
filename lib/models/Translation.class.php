<?php
namespace lib\models;

class Translation extends \lib\WebosComponent {
	protected $data = array();
	
	public function __construct($webos, array $data = array()) {
		parent::__construct($webos);
		
		$this->data = $data;
	}
	
	public function get($original, $variables = array()) {
		if (!array_key_exists($original, $this->data)) {
			$translation = $original;
		} else {
			$translation = $this->data[$original];
		}
		
		if (count($variables) > 0) {
			foreach($variables as $index => $value) {
				$translation = str_replace('${'.$index.'}', $value, $translation);
			}
		}
		
		return $translation;
	}
}