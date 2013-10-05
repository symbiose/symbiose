<?php
namespace lib\ctrl\api;

/**
 * Manage internationalization.
 * @author $imon
 */
class TranslationController extends \lib\ApiBackController {
	/**
	 * Get the user language.
	 */
	public function executeGetLanguage() {
		$configManager = $this->managers()->getManagerOf('config');
		$translationManager = $this->managers()->getManagerOf('translation');
		$user = $this->app()->user();

		$configFile = $configManager->open('~/.config/locale.xml');
		$config = $configFile->read();

		//Detect the browser locale
		$browserLocale = $translationManager->detectLanguage();

		$locale = (isset($config['locale'])) ? $config['locale'] : $browserLocale;
		$language = (isset($config['language'])) ? $config['language'] : $browserLocale;

		if ($user->isLogged()) {
			$config['locale'] = $locale;
			$config['language'] = $language;
			$configFile->write($config);
		}

		return array('language' => $language, 'locale' => $locale);
	}
}