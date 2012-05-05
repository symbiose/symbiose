<?php
namespace lib;

/**
 * Managers represente les gestionnaires.
 * @author $imon
 * @version 1.0
 */
class Managers extends \lib\WebosComponent {
	/**
	 * Tableau contenant les gestionnaires.
	 * @var array
	 */
	protected $managers = array();
	/**
	 * L'objet d'acces aux DAOs.
	 * @var Daos
	 */
	protected $daos;

	/**
	 * Initialiser la classe.
	 * @param Webos $webos
	 */
	public function __construct(\lib\Webos $webos) {
		parent::__construct($webos);

		$this->daos = new Daos($webos);
	}

	/**
	 * Recuperer un gestionnaire pour un module.
	 * @param string $module le nom du module.
	 * @return Manager Le gestionnaire.
	 * @throws InvalidArgumentException
	 */
	public function get($module) {
		$module = ucfirst($module);
		if (!is_string($module) || empty ($module)) {
			throw new InvalidArgumentException('Le module spécifié est invalide');
		}

		if (!isset($this->managers[$module])) {
			$api = $this->daos->api($module);
			if (empty($api)) {
				$manager = '\lib\models\\' . $module . 'Manager';
				$this->managers[$module] = new $manager($this->webos);
			} else {
				$dao = $this->daos->get($module);
				$manager = '\lib\models\\' . $module . 'Manager_' . $api;
				$this->managers[$module] = new $manager($this->webos, $dao);
			}
		}

		return $this->managers[$module];
	}
}