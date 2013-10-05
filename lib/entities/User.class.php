<?php
namespace lib\entities;

use \InvalidArgumentException;

class User extends \lib\Entity {
	protected $username, $realname, $password, $email, $disabled;

	// SETTERS

	public function setUsername($username) {
		$error = null;
		if (!is_string($username) || empty($username)) {
			$error = 'empty username';
		}
		if (!preg_match('#^[a-z0-9-_\.]+$#i', $username)) {
			$error = 'only alphanumeric characters and "-", "_", "." are allowed';
		}
		if ($error !== null) {
			throw new InvalidArgumentException('Invalid username "'.$username.'" ('.$error.')');
		}

		$this->username = $username;
	}

	public function setRealname($realname) {
		if (!is_string($realname) || empty($realname)) {
			throw new InvalidArgumentException('Invalid user real name (empty name)');
		}

		$this->realname = $realname;
	}

	public function setPassword($password) {
		if (!is_string($password) || empty($password)) {
			throw new InvalidArgumentException('Invalid user password (empty password)');
		}
		if (strlen($password) < 4) {
			throw new InvalidArgumentException('Invalid user password (password is too short, at least 4 characters are required)');
		}

		$this->password = $password;
	}

	public function setEmail($email) {
		if (!is_string($email) || empty($email)) {
			throw new InvalidArgumentException('Invalid user e-mail (empty e-mail)');
		}
		if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
			throw new InvalidArgumentException('Invalid user e-mail (not an e-mail adress)');
		}

		$this->email = $email;
	}

	public function setDisabled($isDisabled) {
		if (!is_bool($isDisabled)) {
			throw new InvalidArgumentException('Invalid user disabled value "'.$isDisabled.'"');
		}

		$this->disabled = $isDisabled;
	}

	// GETTERS

	public function username() {
		return $this->username;
	}

	public function realname() {
		return $this->realname;
	}

	public function password() {
		return $this->password;
	}

	public function email() {
		return $this->email;
	}

	public function disabled() {
		return ($this->disabled == true) ? true : false;
	}
}