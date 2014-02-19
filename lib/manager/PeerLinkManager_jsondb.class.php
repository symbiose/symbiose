<?php
namespace lib\manager;

use \lib\entities\PeerLink;

class PeerLinkManager_jsondb extends PeerLinkManager {
	const LINKS_DB = 'peers/links';

	// GETTERS

	public function getById($linkId) {
		$linksFile = $this->dao->open(self::LINKS_DB);
		$linksData = $linksFile->read()->filter(array('id' => $peerId));

		if (count($linksData) == 0) {
			return null;
		}

		return new PeerLink($linksData[0]);
	}

	public function getByPeers($leftPeerId, $rightPeerId) {
		$linksFile = $this->dao->open(self::LINKS_DB);

		$rightLinksData = $linksFile->read()->filter(array(
			'leftPeer' => $leftPeerId,
			'rightPeer' => $rightPeerId
		));

		if (count($rightLinksData) > 0) {
			return new PeerLink($rightLinksData[0]);
		}

		$leftLinksData = $linksFile->read()->filter(array(
			'leftPeer' => $rightPeerId,
			'rightPeer' => $leftPeerId
		));

		if (count($leftLinksData) > 0) {
			return new PeerLink($leftLinksData[0]);
		}

		return null;
	}

	public function listByPeer($peerId) {
		$linksFile = $this->dao->open(self::LINKS_DB);

		$rightLinksData = $linksFile->read()->filter(array('leftPeer' => $peerId));
		$leftLinksData = $linksFile->read()->filter(array('rightPeer' => $peerId));
		$linksData = array_merge($rightLinksData, $leftLinksData);
		$list = array();

		foreach($linksData as $linkData) {
			$list[] = new PeerLink($linkData);
		}

		return $list;
	}

	public function existsByPeers($leftPeerId, $rightPeerId) {
		$link = $this->getByPeers($leftPeerId, $rightPeerId);

		return (!empty($link));
	}

	public function confirmedByPeers($leftPeerId, $rightPeerId) {
		$link = $this->getByPeers($leftPeerId, $rightPeerId);

		return (!empty($link) && $link['confirmed']);
	}

	// SETTERS

	public function insert(PeerLink $link) {
		if ($this->existsByPeers($link['leftPeer'], $link['rightPeer'])) { //Duplicate link ?
			throw new RuntimeException('The link between peers "'.$link['leftPeer'].'" and "'.$link['rightPeer'].'" already exists');
		}

		$linksFile = $this->dao->open(self::LINKS_DB);
		$items = $linksFile->read();

		if (count($items) > 0) {
			$last = $items->last();
			$linkId = $last['id'] + 1;
		} else {
			$linkId = 0;
		}
		$link->setId($linkId);

		$item = $this->dao->createItem($link->toArray());
		$items[] = $item;

		$linksFile->write($items);
	}

	public function update(PeerLink $link) {
		$currentLink = $this->getById($link['id']);
		if (empty($currentPeer)) { //Non-existing link ?
			throw new RuntimeException('The peer "'.$peer['id'].'" doesn\'t exist');
		}
		if (($currentLink['leftPeer'] != $link['leftPeer'] || $currentLink['rightPeer'] != $link['rightPeer']) && $this->existsByPeers($link['leftPeer'], $link['rightPeer'])) { //Duplicate link ?
			throw new RuntimeException('The link between peers "'.$link['leftPeer'].'" and "'.$link['rightPeer'].'" already exists');
		}

		$linksFile = $this->dao->open(self::LINKS_DB);
		$items = $linksFile->read();

		$linkItem = $this->dao->createItem($link->toArray());

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $link['id']) {
				$items[$i] = $linkItem;
				$linksFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a link with id "'.$link['id'].'"');
	}

	public function delete($linkId) {
		$linksFile = $this->dao->open(self::LINKS_DB);
		$items = $linksFile->read();

		foreach ($items as $i => $currentItem) {
			if ($currentItem['id'] == $linkId) {
				unset($items[$i]);
				$linksFile->write($items);
				return;
			}
		}

		throw new RuntimeException('Cannot find a link with id "'.$linkId.'"');
	}
}