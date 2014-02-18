<?php
namespace lib;

/**
 * An XML configuration file.
 * @author Simon Ser
 * @since 1.0beta3
 */
class XmlConfig extends Config {
	/**
	 * Input data from XML.
	 * @param  string $xml The XML-encoded data.
	 */
	public function input($xml) {
		if (empty($xml)) {
			$this->data = array();
			return;
		}

		$doc = new \DOMDocument;
		$doc->loadXML($xml);

		$this->data = array();
		$attributes = $doc->getElementsByTagName('attribute');
		foreach ($attributes as $attribute) {
			$this->data[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
		}
	}

	/**
	 * Output data to XML.
	 * @param  array  $data The data.
	 * @return string       The XML-encoded data.
	 */
	public function output(array $data) {
		$doc = new \DOMDocument;

		$root = $doc->createElement('config');
		$doc->appendChild($root);

		foreach ($data as $attribute => $value) {
			$node = $doc->createElement('attribute');

			$node->setAttribute('name', $attribute);
			$node->setAttribute('value', $value);

			$root->appendChild($node);
		}

		return $doc->saveXML();
	}
}