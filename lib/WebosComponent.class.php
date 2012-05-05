<?php
namespace lib;

/**
 * WebosComponent represente un composant (une partie) du webos.
 * @author $imon
 * @version 1.0
 */
abstract class WebosComponent {
	/**
	 * Le webos.
	 * @var Webos
	 */
	protected $webos;

	/**
	 * Initialiser le composant.
	 * @param Webos $webos Le webos.
	 */
	public function __construct(\lib\Webos $webos) {
		//On stocke en memoire le webos
		$this->webos = $webos;
	}

	/**
	 * Definir le webos.
	 * @param Webos $webos Le webos.
	 */
	public function setWebos(Webos $webos) {
		$this->webos = $webos;
		$vars = get_object_vars($this);
		foreach ($vars as $key => $value) {
			if ($this->$key instanceof WebosComponent) {
				$this->$key->setWebos($webos);
			}
		}
	}

	/**
	 * Recuperer le webos.
	 * @return Webos
	 */
	public function webos() {
		return $this->webos;
	}

	public function __sleep() {
		$vars = get_object_vars($this);
		unset($vars['webos']);
		return array_keys($vars);
	}
}