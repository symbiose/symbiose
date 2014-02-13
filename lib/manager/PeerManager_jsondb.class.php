<?php
namespace lib\manager;

use \lib\entities\OfflinePeer;

class PeerManager_jsondb extends PeerManager {
	const PEERS_DB = 'peers/peers';

	// GETTERS

	public function getById($peerId) {
		$peersFile = $this->dao->open(self::PEERS_DB);
		$peersData = $peersFile->read()->filter(array('id' => $peerId));

		if (count($peersData) == 0) {
			return null;
		}

		return new OfflinePeer($peersData[0]);
	}

	public function getByUserAndApp($userId, $appName) {
		$peersFile = $this->dao->open(self::PEERS_DB);
		$peersData = $peersFile->read()->filter(array('app' => $appName, 'userId' => $userId));

		if (count($peersData) == 0) {
			return null;
		}

		return new OfflinePeer($peersData[0]);
	}

	public function listByUser($userId) {
		$peersFile = $this->dao->open(self::PEERS_DB);

		$peersData = $peersFile->read()->filter(array('userId' => $userId));
		$list = array();

		foreach($peersData as $peerData) {
			$list[] = new OfflinePeer($peerData);
		}

		return $list;
	}

	public function listByApp($appName) {
		$peersFile = $this->dao->open(self::PEERS_DB);
		$peersData = $peersFile->read()->filter(array('app' => $appName));

		foreach($peersData as $peerData) {
			$list[] = new OfflinePeer($peerData);
		}

		return $list;
	}

	public function appExistsForUser($userId, $appName) {
		$peersFile = $this->dao->open(self::PEERS_DB);
		$peersData = $peersFile->read()->filter(array('app' => $appName, 'userId' => $userId));

		return (count($peersData) == 0);
	}

	// SETTERS
	
	public function insert(OfflinePeer $peer) {
		if ($this->appExistsForUser($peer['userId'], $peer['app'])) { //Duplicate peer ?
			throw new RuntimeException('The user "'.$peer['userId'].'" already has a registered peer for the app "'.$peer['app'].'"');
		}

		$peersFile = $this->dao->open(self::PEERS_DB);
		$items = $peersFile->read();

		if (count($items) > 0) {
			$last = $items->last();
			$peerId = $last['id'] + 1;
		} else {
			$peerId = 0;
		}
		$peer->setId($peerId);

		$item = $this->dao->createItem($peer->toArray());
		$items[] = $item;

		$peersFile->write($items);
	}

	public function update(OfflinePeer $peer) {
		$currentPeer = $this->getById($peer['id']);
		if (empty($currentPeer)) { //Non-existing peer ?
			throw new RuntimeException('The peer "'.$peer['id'].'" doesn\'t exist');
		}
		if ($currentPeer['app'] != $peer['app'] && $this->appExistsForUser($peer['userId'], $peer['app'])) { //Duplicate peer ?
			throw new RuntimeException('The user "'.$peer['userId'].'" already has a registered peer for the app "'.$peer['app'].'"');
		}

		$peersFile = $this->dao->open(self::PEERS_DB);
		$items = $peersFile->read();

		$peerItem = $this->dao->createItem($peer->toArray());

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $peer['id']) {
				$items[$i] = $peerItem;
				$peersFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a peer with id "'.$peer['id'].'"');
	}

	public function delete($peerId) {
		$peersFile = $this->dao->open(self::PEERS_DB);
		$items = $peersFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $peerId) {
				unset($items[$i]);
				$peersFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a peer with id "'.$peerId.'"');
	}
}