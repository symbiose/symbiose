<?php
namespace lib;

use \DOMDocument;

/**
 * TranslatedDOMDocument represents a translated XML tree.
 * @author  $imon
 * @since   1.0beta2
 * @version 1.0
 */
class TranslatedDOMDocument extends DOMDocument {
	/**
	 * Retrieve elements and translate it.
	 * @param string $name Elements' tag name.
	 * @param string $lang The language.
	 * @param string $groupBy The attribute for element grouping.
	 * @return array Translated elements.
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