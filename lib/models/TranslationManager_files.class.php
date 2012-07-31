<?php
namespace lib\models;

class TranslationManager_files extends TranslationManager {
	public function load($path, $locale = null) {
		if (empty($locale) || !$this->_checkLanguage($locale)) {
			$locale = $this->getLanguage();
		}
		
		$file = $this->webos->managers()->get('File')->get('/usr/share/locale/' . $locale . '/' . $path . '.ini');
		$contents = $file->contents();
		
		$data = array();
		
		$lines = explode("\n", $contents);
		foreach($lines as $line) {
			$array = explode('=', $line, 2);
			$data[$array[0]] = $array[1];
		}
		
		return new Translation($this->webos, $data);
	}
}