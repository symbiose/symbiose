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
		$translationManager = $this->managers()->getManagerOf('translation');

		return array(
			'language' => $translationManager->language(),
			'locale' => $translationManager->locale()
		);
	}
}