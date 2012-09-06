<?php
namespace lib\models;

/**
 * TranslationManager permet de gerer les traductions.
 * @author $imon
 * @version 1.0
 * @since 1.0 - 30 juil. 2012
 */
abstract class TranslationManager extends \lib\Manager {
	/**
	 * Le language de l'utilisateur.
	 * @var string
	 */
	protected $language = 'en_EN';
	
	/**
	 * Charger une traduction.
	 * @param string $path Le chemin de la traduction.
	 * @param string $locale La langue. Si non specifie, la langue choisie par l'utilisateur sera utilisee.
	 * @return Translation La traduction.
	 */
	abstract public function load($path, $locale = null);
	
	/**
	 * Recuperer la langue de l'utilisateur.
	 * @return string La langue.
	 */
	public function getLanguage() {
		return $this->language;
	}
	
	/**
	 * Definir la langue de l'utilisateur.
	 * @param string $locale La langue.
	 * @return bool Vrai si le changement a ete effectue.
	 */
	public function setLanguage($locale) {
		if ($this->_checkLanguage($locale)) {
			$this->language = $locale;
			return true;
		} else {
			return false;
		}
	}
	
	/**
	 * Verifier la conformite d'une langue.
	 * @param string $locale La langue.
	 * @return bool Vrai si la langue est correcte.
	 */
	protected function _checkLanguage($locale) {
		return preg_match('#[a-z]{2}_[A-Z]{2}#', $locale);
	}
	
	/**
	 * Detecter la langue de l'utilisateur.
	 * @return string La langue detectee.
	 */
	public function detectLanguage() {
		$languages = explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']);
		$language = $languages[0];
		$language = str_replace('-', '_', $language);
		
		$parts = explode('_', $language);
		if (!array_key_exists(1, $parts)) {
			$parts[1] = strtoupper($parts[0]);
		}
		$locale = implode('_', $parts);
		
		if ($this->setLanguage($locale)) {
			return $locale;
		} else {
			return $this->getLanguage();
		}
	}
}