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
			return false;
		}

		return true;
	}

	// SETTERS

	public function insert(User $user) {
		$usersFile = $this->dao->open('core/users');
		$items = $usersFile->read();

		if ($this->usernameExists($user['username'])) { //Duplicate username ?
			throw new RuntimeException('The username "'.$user['username'].'" is already registered');
		}
		if ($this->emailExists($user['email'])) { //Duplicate email ?
			throw new RuntimeException('The email "'.$user['email'].'" is already registered');
		}

		if (count($items) > 0) {
			$last = $items->last();
			$userId = $last['id'] + 1;
		} else {
			$userId = 0;
		}
		$user->setId($userId);

		$item = $this->dao->createItem($user->toArray());
		$items[] = $item;

		$usersFile->write($items);
	}

	public function update(User $user) {
		$usersFile = $this->dao->open('core/users');
		$items = $usersFile->read();

		$currentUser = $this->getById($user['id']);
		if (empty($currentUser)) {
			throw new RuntimeException('Cannot find a user with id "'.$user['id'].'"');
		}
		if ($currentUser['username'] != $user['username'] && $this->usernameExists($user['username'])) { //Duplicate username ?
			throw new RuntimeException('The username "'.$user['username'].'" is already registered');
		}
		if ($currentUser['email'] != $user['email'] && $this->emailExists($user['email'])) { //Duplicate email ?
			throw new RuntimeException('The email "'.$user['email'].'" is already registered');
		}

		$userItem = $this->dao->createItem($user->toArray());

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $user['id']) {
				$items[$i] = $userItem;
				$usersFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a user with id "'.$user['id'].'"');
	}

	public function delete($userId) {
		$usersFile = $this->dao->open('core/users');
		$items = $usersFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $userId) {
				unset($items[$i]);
				$usersFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a user with id "'.$userId.'"');
	}

	public function updatePassword($userId, $newPassword) {
		$hashedPassword = $this->hashPassword($newPassword);

		$usersFile = $this->dao->open('core/users');
		$items = $usersFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $userId) {
				$currentItem['password'] = $hashedPassword;
				$items[$i] = $currentItem;
				$usersFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a user with id "'.$userId.'"');
	}
}