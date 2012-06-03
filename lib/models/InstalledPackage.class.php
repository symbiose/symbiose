<?php
namespace lib\models;

/**
 * InstalledPackage represente un paquet installe.
 * @author $imon
 * @version 1.0
 *
 */
class InstalledPackage extends Package {
	/**
	 * Initialiser le paquet.
	 * @param Webos $webos Le webos.
	 * @param LocalRepository $repository Le depot sur lequel est le paquet.
	 * @param string $name Le nom du paquet.
	 */
	public function __construct(\lib\Webos $webos, LocalRepository $repository, $name) {
		//On appelle le constructeur du parent
		parent::__construct($webos, $repository, $name);

		$this->source = $repository->getSource().'/packages/'.$name.'.xml';
	}

	/**
	 * Recupere les inforamtions sur le paquet.
	 */
	protected function load() {
		$xml = new \DOMDocument;
		if (!$this->webos->managers()->get('File')->exists($this->getRepositorySource().'/packages/'.$this->getName().'.xml'))
			throw new InvalidArgumentException('Le paquet "'.$this->getName().'" n\'existe pas');

		$xml->loadXML($this->webos->managers()->get('File')->get($this->getRepositorySource().'/packages/'.$this->getName().'.xml')->contents());
		$this->attributes = array();
		$attributes = $xml->getElementsByTagName('attributes')->item(0)->getElementsByTagName('attribute');

		foreach ($attributes as $attribute) {
			$this->attributes[$attribute->getAttribute('name')] = $attribute->getAttribute('value');
		}

		$this->files = array();
		$files = $xml->getElementsByTagName('files')->item(0)->getElementsByTagName('file');

		foreach ($files as $file) {
			$this->files[] = $file->getAttribute('path');
		}
	}

	/**
	 * Supprime un paquet.
	 */
	public function remove() {
		if ($this->locked)
			throw new Exception('Le paquet "'.$this->getName().'" est verrouill&eacute;, aucune modification ne peut lui &ecirc;tre apport&eacute;e');

		echo 'Suppression de '.$this->getName().'...<br />';

		//On recupere la liste des fichiers qui composent le paquet
		$files = $this->getFiles();

		foreach ($files as $file) {
			//On veut recuperer le chemin virtuel, on ajoute un "/" devant
			$path = '/'.$file;

			if (!$this->webos->managers()->get('File')->exists($path)) {
				echo 'Attention : impossible de supprimer "'.$path.'" : le fichier n\'existe pas.<br />';
				continue;
			}

			$file = $this->webos->managers()->get('File')->get($path);

			//C'est un dossier
			if ($this->webos->managers()->get('File')->get($file)->isDir()) {
				//On compte les fichiers contenus dans ce dossier
				$filesInDirectory = $this->webos->managers()->get('File')->get($file)->contents();
				$nbrFiles = count($filesInDirectory);

				//Si le dossier est vide, on le supprime
				if ($nbrFiles == 0) {
					$this->webos->managers()->get('File')->get($file)->delete();
				}
			} else { //C'est un fichier, on le supprime
				$this->webos->managers()->get('File')->get($file)->delete();
			}
		}

		//On retire la paquet du depot local
		$this->webos->managers()->get('Package')->getLocalRepository()->removePackage($this);
	}
}