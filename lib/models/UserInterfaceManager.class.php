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
}