<?php
namespace lib\controllers;

use \lib\models\Config;

/**
 * Permet de gerer l'internationalisation.
 * @author $imon
 * @version 1.0
 */
class TranslationController extends \lib\ServerCallComponent {
	protected function getLanguage() {
		$conf = new Config($this->webos);
		if ($this->webos->managers()->get('File')->exists('~/.config/locale.xml')) {
			$conf->load('~/.config/locale.xml');
		}

		$lang = $this->webos->managers()->get('Translation')->getLanguage();

		if ($conf->exist('locale')) {
			$locale = $conf->get('locale');
		} else {
			$locale = $lang;
			if ($this->webos->getUser()->isConnected()) {
				$conf->set('locale', $locale);
				$conf->save('~/.config/locale.xml');
			}
		}

		return array('language' => $lang, 'locale' => $locale);
	}
}