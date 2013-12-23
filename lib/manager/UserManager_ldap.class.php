<?php
namespace lib\manager;

use \lib\entities\User;
use \RuntimeException;

class UserManager_ldap extends UserManager {
	// GETTERS

	protected function _buildUser($userData) {
		return new User(array(
			'id' => $userData['uidnumber'][0],
			'username' => $userData['uid'][0],
			'realname' => $userData['cn'][0],
			'email' => $userData['mail'][0]
		));
	}

	public function listAll() {
		$result = $this->dao->search('(&(objectClass=posixAccount)(uid=*))');

		$list = array();

		for($i = 0; $i < $result['count']; $i++) {
			$item = $result[$i];
			$list[] = $this->_buildUser($item);
		}

		return $list;
	}
	
	public function countAll() {
		$result = $this->dao->search('(&(objectClass=posixAccount)(uid=*))');

		return $result['count'];
	}

	protected function _searchById($userId) {
		return $this->dao->search('(&(objectClass=posixAccount)(uidnumber='.(int) $userId.'))', array('sizelimit' => 1));
	}

	public function exists($userId) {
		$result = $this->_searchById($userId);

		return ($result['count'] > 0);
	}

	public function getById($userId) {
		$result = $this->_searchById($userId);

		if ($result['count'] == 0) {
			return null;
		}

		return $this->_buildUser($result[0]);
	}

	protected function _searchByUsername($username) {
		return $this->dao->search('(&(objectClass=posixAccount)(uid='.$this->dao->sanitizeFilter($username).'))', array('sizelimit' => 1));
	}

	public function getByUsername($username) {
		$result = $this->_searchByUsername($username);

		if ($result['count'] == 0) {
			return null;
		}

		return $this->_buildUser($result[0]);
	}

	public function usernameExists($username) {
		$result = $this->_searchByUsername($username);

		return ($result['count'] > 0);
	}

	protected function _searchByEmail($email) {
		return $this->dao->search('(&(objectClass=posixAccount)(mail='.$this->dao->sanitizeFilter($email).'))', array('sizelimit' => 1));
	}

	public function getByEmail($email) {
		$result = $this->_searchByEmail($username);

		if ($result['count'] == 0) {
			return null;
		}

		return $this->_buildUser($result[0]);
	}

	public function emailExists($email) {
		$result = $this->_searchByEmail($username);

		return ($result['count'] > 0);
	}

	public function checkPassword($userId, $password) {
		//First, search for the user's DN
		$result = $this->_searchById($userId);

		if ($result['count'] == 0) {
			return false;
		}

		$userDn = $result[0]['dn'];

		//Open a new connection to the LDAP server...
		$connClass = get_class($this->dao);
		$newConn = $connClass::init($this->dao->host(), $this->dao->port());

		//...And try to login
		try {
			$newConn->bind($userDn, $password);
		} catch(\Exception $e) {
			$newConn->close();
			return false;
		}

		$newConn->close();

		return true;
	}

	// SETTERS

	public function insert(User $user) {
		throw new RuntimeException('Not implemented for the moment!');
	}

	public function update(User $user) {
		throw new RuntimeException('Not implemented for the moment!');
	}

	public function delete($userId) {
		throw new RuntimeException('Not implemented for the moment!');
	}

	public function updatePassword($userId, $newPassword) {
		throw new RuntimeException('Not implemented for the moment!');
	}
}