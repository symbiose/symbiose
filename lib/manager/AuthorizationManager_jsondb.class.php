<?php
namespace lib\manager;

use lib\entities\UserAuthorization;

class AuthorizationManager_jsondb extends AuthorizationManager {
	//GETTERS

	public function getByUserId($userId) {
		$authsFile = $this->dao->open('core/users_permissions');
		$authsCollection = $authsFile->read()->filter(array('userId' => $userId));

		$list = array();
		foreach($authsCollection as $authData) {
			$auth = new UserAuthorization($authData);

			$list[] = $auth;
		}

		return $list;
	}

	//SETTERS

	public function insertUserAuth(UserAuthorization $auth) {
		$authsFile = $this->dao->open('core/users_permissions');
		$items = $authsFile->read();

		if (count($items) > 0) {
			$last = $items->last();
			$authId = $last['id'] + 1;
		} else {
			$authId = 0;
		}
		$auth->setId($authId);

		$item = $this->dao->createItem($auth->toArray());
		$items[] = $item;

		$authsFile->write($items);
	}

	public function deleteUserAuth($authId) {
		$authsFile = $this->dao->open('core/users_permissions');
		$items = $authsFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $authId) {
				unset($items[$i]);
				$authsFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a user authorization with id "'.$authId.'"');
	}
}