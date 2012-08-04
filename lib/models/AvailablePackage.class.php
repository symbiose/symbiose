<?php
namespace lib\models;

/**
 * AvailablePackage represente un paquet disponible pour installation.
 * @author $imon
 * @version 1.0
 */
abstract class AvailablePackage extends Package {
	/**
	 * Installer les dependances d'un paquet.
	 */
	protected function _installDependencies() {
		//On recupere les dependances
		$dependencies = explode(',', $this->getAttribute('dependencies'));

		//Pour chaque dependance
		foreach ($dependencies as $dep) {
			//On enleve les espaces en trop
			$dep = trim($dep);

			if ($dep != null) {
				//On verifie le le paquet existe
				if (!$this->webos->managers()->get('Package')->isPackage($dep)) {
					throw new RuntimeException('Impossible d\'installer le paquet "'.$this->getName().'" : dependance "'.$dep.'" non satisfaite');
				}

				$pkg = $this->webos->managers()->get('Package')->getPackage($dep);
				if (!$pkg->isInstalled()) {
					$pkg->install();
				}
			}
		}
	}

	/**
	 * Telecharger le paquet.
	 */
	protected function _download() {
		$zip = fopen($this->source.'/package.zip', 'r'); //Fichier source
		$dest = fopen('tmp/'.$this->getName().'.zip', 'w'); //Fichier de destination

		echo 'R&eacute;ception de : '.$this->source.'/package.zip<br />';

		//On copie
		$copiedBits = stream_copy_to_stream($zip, $dest);

		if (!$copiedBits > 0) //Si rien n'a ete copie
			throw new RuntimeException('Impossible d\'acc&eacute;der &agrave; "'.$this->source.'/package.zip"');
	}

	/**
	 * Extraire le paquet.
	 */
	protected function _extract() {
		echo 'D&eacute;paquetage de '.$this->getName().' (&agrave; partir de "/tmp/'.$this->getName().'.zip")...<br />';

		if ($this->webos->managers()->get('File')->exists('/tmp/'.$this->getName()))
			$this->webos->managers()->get('File')->get('/tmp/'.$this->getName())->delete();

		$dest = $this->webos->managers()->get('File')->createDir('/tmp/'.$this->getName().'/');

		$zip = new \ZipArchive;
		$zip->open('tmp/'.$this->getName().'.zip');
		$zip->extractTo('tmp/'.$this->getName().'/');
		$zip->close();
		$this->webos->managers()->get('File')->get('/tmp/'.$this->getName().'.zip')->delete();
	}

	/**
	 * Copier les fichiers du paquet.
	 */
	protected function _copyFiles() {
		if (empty($dir))
			echo 'Copie des fichiers...<br />';

		$tmpDir = '/tmp/'.$this->getName().'/';

		//On copie...
		foreach ($this->files as $file) {
			//Si c'est un dossier
			if ($this->webos->managers()->get('File')->get($tmpDir.'/'.$file)->isDir()) {
				//On cree le dossier s'il n'existe pas
				if (!$this->webos->managers()->get('File')->exists($tmpDir.'/'.$file))
					$this->webos->managers()->get('File')->createDir($tmpDir.'/'.$file, '/'.$file);
			} else { //C'est un fichier, on le copie
				$this->webos->managers()->get('File')->get($tmpDir.'/'.$file)->copy('/'.$file);
			}
		}

		//On supprime le dossier temporaire
		$this->webos->managers()->get('File')->get($tmpDir)->delete();
	}

	/**
	 * Enregistrer le paquet dans la base de donnees locale.
	 */
	protected function _register() {
		//On ajoute la paquet au depot local
		$this->webos->managers()->get('Package')->getLocalRepository()->addPackage($this);
	}

	/**
	 * Installer le paquet.
	 */
	public function install() {
		if ($this->locked)
			throw new Exception('Le paquet "'.$this->getName().'" est verrouill&eacute;, aucune modification ne peut lui &ecirc;tre apport&eacute;e');

		if ($this->webos->managers()->get('Package')->getLocalRepository()->isPackage($this->getName())) { //C'est une mise a jour
			$installed = $this->webos->managers()->get('Package')->getLocalRepository()->getPackage($this->getName());
			//On supprime deja le paquet existant
			$installed->remove();
			//Maintenant, on peut installer ce paquet sans risque
		}

		$this->_installDependencies();
		$this->_download();
		$this->_extract();
		$this->_copyFiles();
		$this->_register();
	}
}