<?php
namespace lib\models;

/**
 * RemotePackage represente un paquet situe sur un depot distant.
 * @author $imon
 * @version 1.0
 *
 */
class RemotePackage extends AvailablePackage {
	/**
	 * Recuperer les informations sur le paquet.
	 */
	protected function load() {
		$xml = new \DOMDocument;
		if ($xml->load($this->source.'/package.xml') === false)
			throw new \InvalidArgumentException('Le paquet "'.$this->name.'" n\'existe pas');

		//On stocke les attributs du paquet
		$this->attributes = array();
		$attributes = $xml->getElementsByTagName('attributes')->item(0)->getElementsByTagName('attribute');

		foreach ($attributes as $attribute) {
			$this->attributes[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
		}

		//On recupere la liste des fichiers
		$this->files = array();
		$files = $xml->getElementsByTagName('files')->item(0)->getElementsByTagName('file');

		foreach ($files as $file) {
			$this->files[] = $file->getAttribute('path');
		}

		//On teste si il y a une icone associee
		$response = get_headers($this->source.'/icon.png');
		if (preg_match('#HTTP/1.[0-1] 200 OK#', $response[0])) {
			$this->attributes['icon'] = $this->source.'/icon.png';
		}
	}
}