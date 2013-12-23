<?php
namespace lib\dao;

use \lib\dao\ldap\LdapConnection;

class LDAPFactory {
	public static function getConnexion(array $config, \lib\Application $app) {
		if (!isset($config['host'])) {
			$config['host'] = null;
		}
		if (!isset($config['port'])) {
			$config['port'] = 389;
		}

		$conn = LdapConnection::init($config['host'], $config['port']);

		if (isset($config['baseDn'])) {
			$conn->setBaseDn($config['baseDn']);
		}

		if (!isset($config['bindRdn'])) {
			$config['bindRdn'] = null;
		}
		if (!isset($config['bindPassword'])) {
			$config['bindPassword'] = null;
		}

		$conn->bind($config['bindRdn'], $config['bindPassword']);

		return $conn;
	}
}