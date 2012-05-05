<?php
namespace lib\models;

/**
 * Repository represente un depot.
 * @author $imon
 * @version 1.0
 *
 */
abstract class Repository extends \lib\WebosComponent {
	protected $source;
	protected $attributes;
	protected $packages;

	/**
	 * Initialise les informations sur le depot.
	 * @param Webos $webos Le webos.
	 * @param string $source L'URL du depot.
	 */
	public function __construct(\lib\Webos $webos, $source) {
		//On appelle le constructeur parent
		parent::__construct($webos);

		$this->source = $source;

		//On charge les infos sur le depot
		$this->load();
	}

	/**
	 * Charge les informations sur le depot.
	 */
	abstract protected function load();

	/**
	 * Determine si un attribut existe.
	 * @param string $attribute L'attribut.
	 * @return bool Vrai si l'attribut existe.
	 */
	public function isAttribute($attribute) {
		return array_key_exists($attribute, $this->attributes);
	}

	/**
	 * Recuperer la liste de tous les paquets situes sur le depot.
	 * @return array Un tableay contenant la liste des paquets.
	 */
	public function getPackages() {
		return $this->packages;
	}

	/**
	 * Determiner si un paquet existe sur ce depot.
	 * @param string $package Le nom du paquet.
	 * @return bool Vrai si le paquet existe.
	 */
	public function isPackage($package) {
		return array_key_exists($package, $this->packages);
	}

	/**
	 * Recuperer un paquet sur ce depot.
	 * @param string $package Le nom du paquet.
	 * @return bool|Package Le paquet, s'il existe.
	 */
	public function getPackage($package) {
		if ($this->isPackage($package))
			return $this->packages[$package];
		else
			return false;
	}

	/**
	 * Recuperer tous les attributs d'un depot.
	 * @return array Un tableau contenant les attributs.
	 */
	public function getAttributes() {
		return $this->attributes;
	}

	/**
	 * Recuperer un attribut.
	 * @param string $attribute L'attribut.
	 * @return string La valeur de l'attribut.
	 */
	public function getAttribute($attribute) {
		if ($this->isAttribute($attribute))
			return $this->attributes[$attribute];
		else
			return false;
	}

	/**
	 * Retourne l'URL du depot.
	 * @return L'URL du depot.
	 */
	public function getSource() {
		return $this->source;
	}

	public function setWebos(\lib\Webos $webos) {
		parent::setWebos($webos);

		foreach ($this->packages as $name => $pkg) {
			$this->packages[$name]->setWebos($webos);
		}
	}
}