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
	 * @var string The user locale.
	 */
	protected $locale;

	/**
	 * @var string The default locale.
	 */
	protected $defaultLocale = 'en_EN';

	/**
	 * Load a translation.
	 * @param string $path The translation's path.
	 * @param string $locale The language. If not specified, the user language will be chosen.
	 * @return Translation The translation.
	 */
	abstract public function load($path, $locale = null);

	/**
	 * Get the user language.
	 * @return string The locale.
	 */
	public function language() {
		if (empty($this->language)) {
			$this->language = $this->detectLanguage();
		}

		return $this->language;
	}

	/**
	 * Get the user locale.
	 * @return string The locale.
	 */
	public function locale() {
		if (empty($this->locale)) {
			$this->locale = $this->detectLanguage();
		}

		return $this->locale;
	}

	/**
	 * Get the default language.
	 * @return string The default language.
	 */
	public function defaultLocale() {
		return $this->defaultLocale;
	}
	
	/**
	 * Set the user language.
	 * @param string $locale The locale.
	 * @return bool True if there was no error.
	 */
	public function setLanguage($locale) {
		if (!$this->_checkLocale($locale)) {
			throw new \InvalidArgumentException('Invalid locale "'.$locale.'"');
		}

		$this->language = $locale;
	}
	
	/**
	 * Check a locale.
	 * @param string $locale The locale.
	 * @return bool True if the passed string is a locale.
	 */
	protected function _checkLocale($locale) {
		return preg_match('#[a-z]{2}_[A-Z]{2}#', $locale);
	}
	
	/**
	 * Detect the browser language.
	 * @return string The detected language.
	 */
	public function detectLanguage() {
		if (!isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
			return $this->defaultLocale();
		}

		$languages = explode(',', $_SERVER['HTTP_ACCEPT_LANGUAGE']);

		if (count($languages) == 0) {
			return $this->defaultLocale();
		}

		$language = $languages[0];
		$language = str_replace('-', '_', $language);

		$parts = explode('_', $language);
		if (!array_key_exists(1, $parts)) {
			$parts[1] = strtoupper($parts[0]);
		}
		$locale = implode('_', $parts);

		if ($this->_checkLocale($locale)) {
			$this->setLanguage($locale);
			return $locale;
		} else {
			return $this->defaultLocale();
		}
	}
}