<?php
namespace lib\models;

class UserManager_pdo extends UserManager {
	public function getUsersList() {
		$sql = 'SELECT id, username, realname FROM users ORDER BY username';
		$query = $this->dao->query($sql);

		$list = array ();

		while ($user = $query->fetch(PDO :: FETCH_ASSOC)) {
			$list[$user['id']] = $user;
		}

		$query->closeCursor();

		return $list;
	}

	public function getPassword(User $user) {
		$sql = 'SELECT password FROM users_passwords WHERE id = :id';
		$query = $this->dao->prepare($sql);
		$query->bindValue(':id', (int) $user->getId(), PDO :: PARAM_INT);
		$query->execute();

		if ($data = $query->fetch(PDO :: FETCH_ASSOC)) {
			return $data['password'];
		}
	}

	public function getAuthorisations($userId) {
		$sql = 'SELECT name FROM users_authorisations WHERE user_id = :id';
		$query = $this->dao->prepare($sql);
		$query->bindValue(':id', (int) $userId, PDO :: PARAM_INT);
		$query->execute();

		$list = array ();

		while ($authorisation = $query->fetch(PDO :: FETCH_ASSOC)) {
			$list[] = $authorisation['name'];
		}

		$query->closeCursor();

		return $list;
	}
}