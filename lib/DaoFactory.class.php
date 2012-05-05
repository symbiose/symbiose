<?php
namespace lib;

/**
 * Usine delivrant des objets DAO.
 * @author $imon
 * @version 1.0
 */
class DaoFactory extends \lib\WebosComponent {
	/**
	 * Recuperer un DAO manipulant des fichiers.
	 */
	public function files() {
		return new dao\FileDAO($this->webos);
	}

	/**
	 * Recuperer un DAO manipulant des bases de donnees (PDO).
	 */
	public static function pdo() {
		$db = new PDO('mysql:host=localhost;dbname=cloud-os', 'root', 'mysql');
		$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

		return $db;
	}
}