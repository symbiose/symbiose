<?php
namespace lib\manager;

use \lib\entities\User;
use \lib\entities\UserToken;
use \RuntimeException;

class UserManager_jsondb extends UserManager {
	// GETTERS

	// Users

	public function listAll() {
		$usersFile = $this->dao->open('core/users');

		$usersData = $usersFile->read();
		$list = array();

		foreach($usersData as $userData) {
			$list[] = new User($userData);
		}

		return $list;
	}
	
	public function countAll() {
		$usersFile = $this->dao->open('core/users');

		$users = $usersFile->read();
		return count($users);
	}

	public function exists($userId) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('id' => $userId));

		return (count($usersData) > 0);
	}

	public function getById($userId) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('id' => $userId));

		if (count($usersData) == 0) {
			return null;
		}

		return new User($usersData[0]);
	}

	public function getByUsername($username) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('username' => $username));

		if (count($usersData) == 0) {
			return null;
		}

		return new User($usersData[0]);
	}

	public function usernameExists($username) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('username' => $username));

		return (count($usersData) > 0);
	}

	public function getByEmail($email) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('email' => $email));

		if (count($usersData) == 0) {
			return null;
		}

		return new User($usersData[0]);
	}

	public function emailExists($email) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('email' => $email));

		return (count($usersData) > 0);
	}

	public function checkPassword($userId, $password) {
		$usersFile = $this->dao->open('core/users');
		$usersData = $usersFile->read()->filter(array('id' => $userId));

		if (count($usersData) == 0) {
			return false;
		}

		$userData = $usersData[0];

		if (!isset($userData['password']) || empty($userData['password'])) {
			return false;
		}

		if (strlen($userData['password']) == 40) { //SHA1 support for old accounts (before 1.0 beta 3)
			$hashedPassword = sha1($password);
		} else {
			$hashedPassword = $this->hashPassword($password);
		}

		return ($hashedPassword === $userData['password']);
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