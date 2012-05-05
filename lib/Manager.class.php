<?php
namespace lib;

/**
 * Manager represente un gestionnaire d'acces aux donnees.
 * @author $imon
 * @version 1.0
 */
abstract class Manager {
	/**
	 * Le webos.
	 * @var Webos
	 */
	protected $webos;
	/**
	 * L'objet d'acces aux donnees.
	 * @var mixed
	 */
	protected $dao;

	/**
	 * Initialiser le gestionnaire.
	 * @param Webos $webos Le webos.
	 * @param $dao Le DAO.
	 */
	public function __construct(\lib\Webos $webos, $dao = null) {
		$this->webos = $webos;
		$this->dao = $dao;
	}

	public function __sleep() {
		throw new RuntimeException('Vous ne pouvez pas lin&eacute;ariser les managers');
	}
}