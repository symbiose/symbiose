<?php
namespace lib\models;

class TranslationManager_files extends TranslationManager {
	public function load($path, $locale = null) {
		if (empty($locale) || !$this->_checkLanguage($locale)) {
			$locale = $this->getLanguage();
		}
		
		$filepath = '/usr/share/locale/' . $locale . '/' . $path . '.ini';
		if (!$this->webos->managers()->get('File')->exists($filepath)) {
			return new Translation($this->webos);
		}
		
		$file = $this->webos->managers()->get('File')->get($filepath);
		$contents = $file->contents();
		
		$data = array();
		
		$lines = explode("\n", $contents);
		foreach($lines as $line) {
			$line = trim($line);
			
			if (substr($line, 0, 1) == ';') { //C'est un commentaire
				continue;
			}
			
			$array = explode('=', $line, 2);
			
			if (count($array) != 2) {
				continue;
			}
			if (empty($array[0]) || empty($array[1])) {
				continue;
			}
			
			$data[$array[0]] = $array[1];
		}
		
		return new Translation($this->webos, $data);
	}
}