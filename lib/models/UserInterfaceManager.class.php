<?php
namespace lib\models;

/**
 * UserInterfaceManager gere les interfaces utilisateur (UIs).
 * @author $imon
 * @version 1.0
 * @since 1.0 - 26 nov. 2011
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
}