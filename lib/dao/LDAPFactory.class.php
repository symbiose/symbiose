<?php
namespace lib\dao;

class LDAPFactory {
	public static function getConnexion(array $config, \lib\Application $app) {
		if (!isset($config['host'])) {
			$config['host'] = null;
		}
		if (!isset($config['port'])) {
			$config['port'] = 389;
		}

		$conn = ldap_connect($config['host'], $config['port']);

		if ($conn === false) {
			throw new \RuntimeException('Cannot connect to LDAP server "'.$config['host'].'" on port '.$config['port']);
		}

		ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3);

		return $conn;
	}
}