<?php
namespace lib;

/**
 * Daos permet de gerer les differents DAOs.
 * @author $imon
 * @version 1.0
 */
class Daos extends \lib\WebosComponent {
	/**
	 * Tableau contenant les DAOs instancies.
	 * @var array
	 */
	protected $daos = array();
	/**
	 * Tableau faisant correspondre les modules aux DAOs.
	 * @var array
	 */
	protected $modules = array(
		'File' => 'files',
		'User' => 'files',
		'UserInterface' => 'files',
		'Package' => 'files',
		'Translation' => 'files'
	);

	/**
	 * Recuperer le DAO associe au module specifie.
	 * @param string $module Le nom du module.
	 * @throws InvalidArgumentException
	 */
	public function get($module) {
		$module = ucfirst($module);
		if (!is_string($module) || empty($module)) {
			throw new InvalidArgumentException('Le module spécifié est invalide');
		}

		$api = $this->api($module);

		if (empty($api)) {
			return;
		}

		if (!isset($this->daos[$api])) {
			$api = $this->modules[$module];
			$method = $api;
			$factory = new DaoFactory($this->webos);
			$this->daos[$api] = $factory->$api();
		}

		return $this->daos[$api];
	}

	public function api($module) {
		if (!array_key_exists($module, $this->modules))
			return;
		return $this->modules[$module];
	}

	public function __sleep() {
		throw new RuntimeException('Vous ne pouvez pas lin&eacute;ariser les DAOs');
	}
}
