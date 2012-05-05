<?php
namespace lib\models;

/**
 * RemoteRepository represente le depot local (contenant les paquets installes).
 * @author $imon
 * @version 1.0
 *
 */
class LocalRepository extends Repository {
	/**
	 * Initialise les informations sur le depot.
	 * @param Webos $webos Le webos.
	 */
	public function __construct(\lib\Webos $webos) {
		//On appelle le constructeur parent
		parent::__construct($webos, '/etc/apt/');
	}

	/**
	 * Charge les informations sur le depot.
	 */
	protected function load() {
		$this->packages = array();
		if (!$this->webos->managers()->get('File')->exists($this->source.'/packages.xml')) {
			return;
		}

		$xml = new \DOMDocument;
		$xml->loadXML($this->webos->managers()->get('File')->get($this->source.'/packages.xml')->contents());

		$packages = $xml->getElementsByTagName('package');

		foreach ($packages as $package) {
			try {
				$this->packages[$package->getAttribute('name')] = new InstalledPackage($this->webos, $this, $package->getAttribute('name'));
			} catch (\Exception $e) {
				continue;
			}
		}
	}

	/**
	 * Ajoute un paquet a la liste des paquets installes.
	 * @param Package $package Le paquet a ajouter.
	 */
	public function addPackage(Package $package) {
		//Si le paquet est deja installe, on enleve l'ancien
		if ($this->isPackage($package->getName())) {
			$oldPackage = $this->getPackage($package->getName());
			$oldPackage->remove();
		}

		$xml = new \DOMDocument('1.0');
		if ($this->webos->managers()->get('File')->exists($this->source.'/packages.xml')) {
			$xml->loadXML($this->webos->managers()->get('File')->get($this->source.'/packages.xml')->contents());
			$root = $xml->getElementsByTagName('packages')->item(0);
		} else {
			$root = $xml->createElement('packages');
			$xml->appendChild($root);
		}

		$element = $xml->createElement('package');
		$root->appendChild($element);

		$name = $xml->createAttribute('name');
		$name->appendChild($xml->createTextNode($package->getName()));
		$element->appendChild($name);

		$version = $xml->createAttribute('version');
		$version->appendChild($xml->createTextNode($package->getVersion()->getVersion()));
		$element->appendChild($version);

		$this->webos->managers()->get('File')->get($this->source.'/packages.xml')->setContents($xml->saveXML());

		$xml = new \DOMDocument('1.0');

		$root = $xml->createElement('package');
		$xml->appendChild($root);

		$xml_attributes = $xml->createElement('attributes');
		$root->appendChild($xml_attributes);

		$attributes = $package->getAttributes();
		$attributes['installed_time'] = time();
		$attributes['source'] = $package->getRepositorySource();

		foreach ($attributes as $attribute => $value) {
			$node = $xml->createElement('attribute');
			$xml_attributes->appendChild($node);

			$name = $xml->createAttribute('name');
			$name->appendChild($xml->createTextNode($attribute));
			$node->appendChild($name);

			$val = $xml->createAttribute('value');
			$val->appendChild($xml->createTextNode($value));
			$node->appendChild($val);
		}

		$files = $package->getFiles();

		$xml_files = $xml->createElement('files');
		$root->appendChild($xml_files);

		foreach ($files as $file) {
			$node = $xml->createElement('file');
			$xml_files->appendChild($node);

			$path = $xml->createAttribute('path');
			$path->appendChild($xml->createTextNode($file));
			$node->appendChild($path);
		}

		$this->webos->managers()->get('File')->createFile($this->source.'/packages/'.$package->getName().'.xml')->setContents($xml->saveXML());

		$newPackage = new InstalledPackage($this->webos, $this, $package->getName());

		$this->packages[$package->getName()] = $newPackage;
	}

	public function removePackage(Package $package) {
		//Si le paquet n'est pas dans la liste, on ne fait rien
		if (!$this->isPackage($package->getName())) {
			return;
		}

		$xml = new \DOMDocument;
		if ($this->webos->managers()->get('File')->exists($this->source.'/packages.xml')) {
			$xml->loadXML($this->webos->managers()->get('File')->get($this->source.'/packages.xml')->contents());
			$root = $xml->getElementsByTagName('packages')->item(0);
		} else {
			return;
		}

		$packages = $root->getElementsByTagName('package');

		foreach ($packages as $xml_package) {
			if ($xml_package->getAttribute('name') == $package->getName()) {
				$root->removeChild($xml_package);
			}
		}

		$this->webos->managers()->get('File')->get($this->source.'/packages.xml')->setContents($xml->saveXML());

		$this->webos->managers()->get('File')->get($this->source.'/packages/'.$package->getName().'.xml')->delete();

		unset($this->packages[$package->getName()]);
	}
}