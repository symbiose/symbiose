<?php
namespace lib\manager;

use \lib\TranslationDictionary;

class TranslationManager_localfs extends TranslationManager {
	public function load($path, $locale = null) {
		$dao = $this->dao;

		if (empty($locale) || !$this->_checkLanguage($locale)) {
			$locale = $this->language();
		}

		$filepath = '/usr/share/locale/' . $locale . '/' . $path . '.ini';
		if (!$dao->exists($filepath)) {
			return new TranslationDictionary();
		}

		$contents = $dao->read($filepath);
		
		$dictData = array();
		
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
			
			$dictData[$array[0]] = $array[1];
		}
		
		return new TranslationDictionary($dictData);
	}

	protected function _loadUserConfig() {
		$configFile = new \lib\XmlConfig($this->dao->toInternalPath('~/.config/locale.xml'));
		$config = $configFile->read();

		//Detect the browser locale
		$browserLocale = $this->detectLanguage();

		$locale = (isset($config['locale'])) ? $config['locale'] : $browserLocale;
		$language = (isset($config['language'])) ? $config['language'] : $browserLocale;

		if ($this->dao->exists('~')) { //If the user is logged
			$config['locale'] = $locale;
			$config['language'] = $language;
			$configFile->write($config);
		}

		$this->locale = $locale;
		$this->language = $language;
	}

	public function language() {
		$this->_loadUserConfig();

		return $this->language;
	}

	public function locale() {
		$this->_loadUserConfig();

		return $this->locale;
	}
}