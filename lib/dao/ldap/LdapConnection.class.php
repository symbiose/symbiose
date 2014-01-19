<?php
namespace lib\dao\ldap;

use \RuntimeException;

/**
 * An LDAP connection.
 */
class LdapConnection {
	protected static $filterSpecialChars = array('(', ')', '*', '|', '&', '!', '=', '>', '<', '~');

	protected $host, $port;
	protected $conn;
	protected $baseDn;

	public function __construct($host = null, $port = 389) {
		$this->host = $host;
		$this->port = $port;

		$conn = ldap_connect($host, $port);
		if ($conn === false) {
			throw new RuntimeException('Cannot connect to LDAP server "'.$host.'" on port '.$port);
		}

		ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3);

		$this->conn = $conn;
	}

	public function sanitizeFilter($filter) {
		$specialChars = self::$filterSpecialChars;
		return str_replace($specialChars, '', $filter);
	}

	public function connection() {
		return $this->conn;
	}

	public function host() {
		return $this->host;
	}

	public function port() {
		return $this->port;
	}

	public function baseDn() {
		return $this->baseDn;
	}

	public function setBaseDn($dn) {
		$this->baseDn = $dn;
	}

	public function bind($rdn = null, $password = null) {
		$result = ldap_bind($this->conn, $rdn, $password);
		if ($result === false) {
			$errMsg = 'Cannot connect to LDAP server "'.$this->host.'" on port '.$this->port;
			if (!empty($rdn)) {
				$errMsg .= ' as "'.$rdn.'"';
				if (empty($password)) {
					$errMsg .= ' without password';
				}
			} else {
				$errMsg .= ' as anonymous';
			}

			throw new RuntimeException($errMsg);
		}
	}

	public function search($filter, array $params = array(), $baseDn = null) {
		if (empty($baseDn)) {
			$baseDn = $this->baseDn();
		}

		//Default params
		$params = array(
			'scope' => 'sub',
			'sizelimit' => 0,
			'timelimit' => 0,
			'attrsonly' => false,
			'attributes' => array()
		) + $params;

		$result = ldap_search($this->conn, $baseDn, $filter, $params['attributes'], $params['attrsonly'], $params['sizelimit'], $params['timelimit']);
		if ($result === false) {
			throw new RuntimeException('Failed to search in the LDAP tree : '.ldap_error($this->conn));
		}

		$data = ldap_get_entries($this->conn, $result);

		return $data;
	}

	public function close() {
		ldap_close($this->conn);
	}

	public static function init($host = null, $port = 389) {
		return new self($host, $port);
	}
}