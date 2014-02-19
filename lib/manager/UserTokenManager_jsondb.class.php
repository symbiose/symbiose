<?php
namespace lib\manager;

use \lib\entities\UserToken;
use \RuntimeException;

class UserTokenManager_jsondb extends UserTokenManager {
	// GETTERS

	public function getById($tokenId) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$tokensData = $tokensFile->read()->filter(array('id' => $tokenId));

		if (count($tokensData) == 0) {
			return null;
		}

		return new UserToken($tokensData[0]);
	}

	public function getByUser($userId) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$tokensData = $tokensFile->read()->filter(array('userId' => $userId));

		if (count($tokensData) == 0) {
			return null;
		}

		return new UserToken($tokensData[0]);
	}

	public function userHasToken($userId) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$tokensData = $tokensFile->read()->filter(array('userId' => $userId));

		return (count($tokensData) > 0);
	}

	// SETTERS

	public function insert(UserToken $token) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$items = $tokensFile->read();

		if ($token['id'] !== null) {
			throw new RuntimeException('The token "'.$token['id'].'" is already registered');
		}
		if ($this->userHasToken($token['userId'])) { //Duplicate token ?
			throw new RuntimeException('The user "'.$token['userId'].'" has already a registered token');
		}

		if (count($items) > 0) {
			$last = $items->last();
			$tokenId = $last['id'] + 1;
		} else {
			$tokenId = 0;
		}
		$token->setId($tokenId);

		$item = $this->dao->createItem($token->toArray());
		$items[] = $item;

		$tokensFile->write($items);
	}

	public function update(UserToken $token) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$items = $tokensFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $token['id']) {
				$items[$i] = $this->dao->createItem($token->toArray());
				$tokensFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a token with id "'.$tokenId.'"');
	}

	public function delete($tokenId) {
		$tokensFile = $this->dao->open('core/users_tokens');
		$items = $tokensFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $tokenId) {
				unset($items[$i]);
				$tokensFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a token with id "'.$tokenId.'"');
	}
}