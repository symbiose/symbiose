<?php
namespace lib\dao;

class JSONDBFactory {
	public static function getLocalConnexion() {
		$db = new jsondb\Database(__DIR__.'/../../var/lib/jsondb/');

		return $db;
	}
}