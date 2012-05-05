<?php
namespace lib;

/**
 * Record represente un enregistrement.
 * @author $imon
 * @version 1.0
 */
abstract class Record implements ArrayAccess {
	/**
	 * Erreurs surevenues.
	 * @var array
	 */
	protected $errors = array();
	/**
	 * Identifiant de l'enregistrement.
	 * @var int
	 */
	protected $id;

	/**
	 * Definir les donnees de l'enregistrement.
	 * @param array $donnees Les donnees.
	 */
	public function __construct(array $donnees = array()) {
		if (!empty($donnees)) {
			$this->hydrate($donnees);
		}
	}

	/**
	 * Definir si l'enregistrement est nouveau.
	 * @return bool Vrai si l'enregistrement est nouveau.
	 */
	public function isNew() {
		return empty ($this->id);
	}

	/**
	 * Recuperer les erreurs.
	 * @return array Un tableau contenant les erreurs.
	 */
	public function errors() {
		return $this->errors;
	}

	/**
	 * Recuperer l'identifiant de l'enregistrement.
	 * @return int l'identifiant.
	 */
	public function id() {
		return $this->id;
	}

	/**
	 * Definir l'identifiant de l'enregistrement.
	 * @param int $id
	 */
	public function setId($id) {
		$this->id = (int) $id;
	}

	/**
	 * Remplir les donnees de l'enregistrement.
	 * @param array $donnees Les donnees.
	 */
	public function hydrate(array $donnees) {
		foreach ($donnees as $attribut => $valeur) {
			$methode = 'set' . str_replace(' ', '', ucwords(str_replace('_', ' ', $attribut)));

			if (is_callable(array(
					$this,
					$methode
				))) {
				$this->$methode($valeur);
			}
		}
	}

	/**
	 * Recuperer une donnee.
	 * @param string $var La donnee.
	 * @return mixed La valeur de la donnee.
	 */
	public function offsetGet($var) {
		if (isset ($this->$var) && is_callable(array (
				$this,
				$var
			))) {
			return $this->$var();
		}
	}

	/**
	 * Definir une donnee.
	 * @param string $var La donnee.
	 * @param mixed $value Le nouvelle valeur de la donnee.
	 */
	public function offsetSet($var, $value) {
		$method = 'set' . ucfirst($var);

		if (isset ($this->$var) && is_callable(array (
				$this,
				$method
			))) {
			$this->$method($value);
		}
	}

	/**
	 * Definir si une donnee existe.
	 * @param string $var La donnee.
	 * @return bool Vrai si la donnee existe.
	 */
	public function offsetExists($var) {
		return isset ($this->$var) && is_callable(array(
			$this,
			$var
		));
	}

	/**
	 * Supprimer une donnee.
	 * @param string $var La donnee.
	 * @throws Exception
	 */
	public function offsetUnset($var) {
		throw new Exception('Impossible de supprimer une quelconque valeur');
	}
}