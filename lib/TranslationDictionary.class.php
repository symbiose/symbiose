<?php
namespace lib;

/**
 * A translation dictionary.
 * @author Simon Ser
 * @since 1.0beta3
 */
class TranslationDictionary {
	/**
	 * The dictionary data.
	 * @var array
	 */
	protected $data = array();

	/**
	 * Initialize this dictionary.
	 * @param array $data The dictionary data.
	 */
	public function __construct(array $data = array()) {
		$this->data = $data;
	}

	/**
	 * Get a translation in this dictionary.
	 * @param  string $key       The translation's key in this dictionary.
	 * @param  array  $variables Variablesto specify to the translation.
	 * @return string            The translation.
	 */
	public function get($key, $variables = array()) {
		if (!array_key_exists($key, $this->data)) {
			$translation = $key;
		} else {
			$translation = $this->data[$key];
		}
		
		if (count($variables) > 0) {
			foreach($variables as $index => $value) {
				$translation = str_replace('${'.$index.'}', $value, $translation);
			}
		}
		
		return $translation;
	}
}