<?php
namespace lib\manager;

/**
 * Manage translations.
 * @author $imon
 */
abstract class TranslationManager extends \lib\Manager {
	/**
	 * @var string The user language.
	 */
	protected $language;

	/**
	 * @var string The default language.
	 */
	protected $defaultLanguage = 'en_EN';

	/**
	 * Load a translation.
	 * @param string $path The translation's path.
	 * @param string $locale The language. If not specified, the user language will be chosen.
	 * @return Translation The translation.
	 */
	abstract public function load($path, $locale = null);

	/**
	 * Get the user language.
	 * @return string The language.
	 */
	public function language() {
		if (empty($this->language)) {
			$this->language = $this->detectLanguage();
		}

		return $this->language;
	}

	/**
	 * Get the default language.
	 * @return string The default language.
	 */
	public function defaultLanguage() {
		return $this->defaultLanguage;
	}
	
	/**
	 * Set the user language.
	 * @param string $locale The locale.
	 * @return bool True if there was no error.
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
	 * Check a locale.
	 * @param string $locale The locale.
	 * @return bool True if the passed string is a locale.
	 */
	protected function _checkLanguage($locale) {
		return preg_match('#[a-z]{2}_[A-Z]{2}#', $locale);
	}
	
	/**
	 * Detect the user locale.
	 * @return string The detected locale.
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
			return $this->defaultLanguage();
		}
	}
}