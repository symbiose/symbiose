<?php
namespace lib;

if (!isset($_SESSION)) {
	session_start();
}

class User extends ApplicationComponent {
	public function id() {
		if (!$this->isLogged()) {
			return null;
		}

		return $_SESSION['user_data_id'];
	}

	public function username() {
		if (!$this->isLogged()) {
			return null;
		}

		return $_SESSION['user_data_username'];
	}

	public function isLogged() {
		return (isset($_SESSION['user_logged']) && $_SESSION['user_logged'] === true);
	}

	public function loggedIn($userId, $username) {
		if (!is_int($userId)) {
			throw new \InvalidArgumentException('Invalid user id');
		}
		if (!is_string($username) || empty($username)) {
			throw new \InvalidArgumentException('Invalid username');
		}

		$_SESSION['user_logged'] = true;
		$_SESSION['user_data_id'] = $userId;
		$_SESSION['user_data_username'] = $username;
	}

	public function loggedOut() {
		$_SESSION['user_logged'] = false;
		$_SESSION['user_data_id'] = null;
		$_SESSION['user_data_username'] = null;
	}
}