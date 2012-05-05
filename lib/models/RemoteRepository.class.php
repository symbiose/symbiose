<?php
namespace lib\models;

/**
 * RemoteRepository represente un depot distant.
 * @author $imon
 * @version 1.0
 *
 */
class RemoteRepository extends Repository {
	/**
	 * Charge les informations sur le depot.
	 */
	protected function load() {
		//Infos sur le depot
		$xml = new \DOMDocument;
		if ($xml->load($this->source.'/repository.xml') === false)
			throw new \InvalidArgumentException('Le d&eacute;p&ocirc;t "'.$this->source.'" n\'existe pas');

		$attributes = $xml->getElementsByTagName('attribute');

		$this->attributes = array();

		foreach ($attributes as $attribute) {
			$this->attributes[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
		}

		echo 'Atteint "'.$this->source.'/repository.xml'.'"...'."\n";

		//Liste des paquets
		$xml = new \DOMDocument;
		if ($xml->load($this->source.'/packages.xml') === false)
			throw new \InvalidArgumentException('Le d&eacute;p&ocirc;t "'.$this->source.'" n\'existe pas');

		$this->packages = array();
		$packages = $xml->getElementsByTagName('package');

		$webosVersion = $this->webos->managers()->get('Server')->getWebosVersion();
		foreach ($packages as $package) {
			try {
				$this->packages[$package->getAttribute('name')] = new RemotePackage($this->webos, $this, $package->getAttribute('name'));
			} catch (\Exception $e) {
				continue;
			}
		}

		echo 'Atteint "'.$this->source.'/packages.xml'.'"...'."\n";
	}

	/**
	 * Enleve le depot.
	 */
	public function remove() {
		$file = $this->webos->managers()->get('File')->get('/etc/apt/repositories.xml');

		$xml = new \DOMDocument;
		$xml->loadXML($file->contents());
		$repositories = $xml->getElementsByTagName('repository');

		foreach ($repositories as $repository) {
			if ($repository->getAttribute('url') == $this->source) {
				$repository->parentNode->removeChild($repository);
			}
		}

		$file->setContents($xml->saveXML());
	}
}