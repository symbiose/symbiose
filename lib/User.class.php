<?php
namespace lib;

class User extends ApplicationComponent {
	public function id() {
		$session = $this->app()->httpRequest()->session();

		if (!$this->isLogged()) {
			return null;
		}

		return $session->get('user_data_id');
	}

	public function username() {
		$session = $this->app()->httpRequest()->session();

		if (!$this->isLogged()) {
			return null;
		}

		return $session->get('user_data_username');
	}

	public function isLogged() {
		$session = $this->app()->httpRequest()->session();

		return ($session->has('user_logged') && $session->get('user_logged') === true);
	}

	public function loggedIn($userId, $username) {
		$session = $this->app()->httpRequest()->session();

		if (!is_int($userId)) {
			throw new \InvalidArgumentException('Invalid user id');
		}
		if (!is_string($username) || empty($username)) {
			throw new \InvalidArgumentException('Invalid username');
		}

		$session->set('user_logged', true);
		$session->set('user_data_id', $userId);
		$session->set('user_data_username', $username);
	}

	public function loggedOut() {
		$session = $this->app()->httpRequest()->session();

		$session->set('user_logged', false);
		$session->set('user_data_id', null);
		$session->set('user_data_username', null);
	}
}