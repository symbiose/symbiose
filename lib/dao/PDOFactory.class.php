<?php
namespace core\dao;

class PDOFactory {
	public static function getConnexion(array $conf) {
		if (!isset($conf['dsn'])) {
			throw new \RuntimeException('No DSN specified for PDO');
		}

		if (!isset($conf['username'])) {
			$conf['username'] = '';
		}
		if (!isset($conf['password'])) {
			$conf['password'] = '';
		}
		if (!isset($conf['driver_options'])) {
			$conf['driver_options'] = array();
		}

		$db = new \PDO($conf['dsn'], $conf['username'], $conf['password'], $conf['driver_options']);
		$db->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

		return $db;
	}
}