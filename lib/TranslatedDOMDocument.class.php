<?php
namespace lib;

use \DOMDocument;

/**
 * TranslatedDOMDocument represente une structure XML traduite.
 * @author  $imon
 * @since   1.0beta2
 * @version 1.0
 */
class TranslatedDOMDocument extends DOMDocument {
	/**
	 * Recuperer tous les elements de la structure en les traduisant.
	 * @param string $name Le nom des elements.
	 * @param string $lang La langue des elements a recuperer.
	 * @param string $groupBy L'attribut selon lequel on doit grouper les elements.
	 * @return array Les elements traduits.
	 */
	public function getTranslatedElementsByTagName($name, $lang, $groupBy = null) {
		$elements = $this->getElementsByTagName($name);
		$translatedElements = array();

		foreach ($elements as $el) {
			if ($el->hasAttribute('lang')) {
				if ($el->getAttribute('lang') == $lang) {
					if (!empty($groupBy) && $el->hasAttribute($groupBy)) {
						$translatedElements[$el->getAttribute($groupBy)] = $el;
					} else {
						$translatedElements[] = $el;
					}
				}
			} else {
				if (!empty($groupBy) && $el->hasAttribute($groupBy)) {
					$translatedElements[$el->getAttribute($groupBy)] = $el;
				} else {
					$translatedElements[] = $el;
				}
			}
		}

		return $translatedElements;
	}
}