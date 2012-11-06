<?php
namespace lib\models;

/**
 * UserInterfaceManager gere les interfaces utilisateur (UIs).
 * @author $imon
 * @version 1.1
 * @since 1.0 alpha 1 - 26 nov. 2011
 */
abstract class UserInterfaceManager extends \lib\Manager {
	/**
	 * Recuperer l'interface utilisateur par defaut.
	 * @return string Le nom de l'UI par defaut.
	 */
	abstract public function getDefault();

	/**
	 * Recuperer la liste des interfaces utilisateur disponibles.
	 * @return array La liste des interfaces utilisateur.
	 */
	abstract public function getList();

	/**
	 * Marquer l'interface comme interface par defaut.
	 * @param string $name Le nom de l'interface.
	 * @param bool $value Vrai si l'interface doit etre marquee comme par defaut.
	 */
	abstract public function setDefault($name, $value);

	/**
	 * Modifier les types de l'interface.
	 * @param string $name Le nom de l'interface.
	 * @param array $value Un tableau listant les types.
	 */
	abstract public function setTypes($name, $types);
	
	/**
	 * Ajouter une interface a la liste.
	 * @param string $name Le nom de l'interface.
	 */
	abstract public function add($name);
	
	/**
	 * Supprimer une interface de la liste.
	 * @param string $name Le nom de l'interface.
	 */
	abstract public function remove($name);
}