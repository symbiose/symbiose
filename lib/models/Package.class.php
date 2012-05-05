<?php
namespace lib\models;

/**
 * Package represente un paquet.
 * @author $imon
 * @version 1.0
 *
 */
abstract class Package extends \lib\WebosComponent {
	protected $source;
	protected $attributes;
	protected $dependencies;
	protected $files = array();
	protected $version;
	protected $locked;

	/**
	 * Initialiser le paquet.
	 * @param Webos $webos Le webos.
	 * @param Repository $repository Le depot sur lequel est le paquet.
	 * @param string $name Le nom du paquet.
	 */
	public function __construct(\lib\Webos $webos, Repository $repository, $name) {
		//On appelle le constructeur du parent
		parent::__construct($webos);

		//On enregistre les infos
		$this->name = $name;
		$this->repositorySource = $repository->getSource();
		$this->source = $this->repositorySource.'/packages/'.substr($name, 0, 1).'/'.$name;

		$this->locked = false;

		if ($this->webos->managers()->get('File')->exists('/etc/apt/locked.xml')) {
			$xml = new \DOMDocument;
			$xml->loadXML($this->webos->managers()->get('File')->get('/etc/apt/locked.xml')->contents());
			$packages = $xml->getElementsByTagName('package');
			foreach ($packages as $package) {
				if ($package->getAttribute('name') == $this->getName()) {
					$this->locked = (bool) ((int) $package->getAttribute('locked'));
				}
			}
		}

		//On charge les infos sur le paquet
		$this->load();

		$this->version = new \lib\Version($this->getAttribute('version'));
	}

	/**
	 * Charger les informations sur le paquet.
	 */
	abstract protected function load();

	/**
	 * Determiner si un attribut existe.
	 * @param string $attribute L'attribut.
	 * @return bool Vrai si l'attribut existe.
	 */
	public function isAttribute($attribute) {
		return array_key_exists($attribute, $this->attributes);
	}

	/**
	 * Recuperer un attribut.
	 * @param string $attribute L'attribut a recuperer.
	 * @return string La valeur de l'attribut.
	 */
	public function getAttribute($attribute) {
		if ($this->isAttribute($attribute))
			return $this->attributes[$attribute];
		else
			return false;
	}

	/**
	 * Recuperer le nom du paquet.
	 * @return Le nom du paquet.
	 */
	public function getName() {
		return $this->name;
	}

	/**
	 * Recuperer les attributs d'un paquet.
	 * @return array Un tableau contenant les attributs du paquet.
	 */
	public function getAttributes() {
		return $this->attributes;
	}

	/**
	 * Determiner si le paquet est installe ou non.
	 * @return bool Vrai si le paquet est installe.
	 */
	public function isInstalled() {
		return ($this instanceof InstalledPackage);
	}

	/**
	 * Recuperer la version du paquet.
	 * @return Version La version du paquet.
	 */
	public function getVersion() {
		return $this->version;
	}

	/**
	 * Recuperer la source du depot du paquet.
	 */
	public function getRepositorySource() {
		return $this->repositorySource;
	}

	/**
	 * Recuperer la liste des fichiers du paquet.
	 */
	public function getFiles() {
		return $this->files;
	}

	/**
	 * Determiner si un paquet peut etre dangereux pour le systeme.
	 * @return bool Vrai s'il n'est pas dangereux.
	 */
	public function isChecked() {
		foreach($this->files as $file) {
			//Si c'est un fichier PHP, le paquet peut etre dangereux
			if (preg_match('#\.php$#', $file))
				return false;
		}
		//Si on n'a trouve aucun fichier PHP, il n'est pas dangereux
		return true;
	}

	/**
	 * Determiner si un paquet peut etre manipule par l'utilisateur.
	 */
	public function isManagable() {
		if ($this->locked) return false;

		$authorisation = $this->webos->getAuthorization();
		$requiredAuthorisation = $authorisation->getArgumentAuthorizations($this->getName(), 'package', 'manage');
		return ($authorisation->can($requiredAuthorisation)) ? true : false;
	}

	public function isLocked() {
		return $this->locked;
	}
}