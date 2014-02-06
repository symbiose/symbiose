<?php
namespace lib\ctrl\api;

use \lib\ApiBackController;
use \lib\PeerServer;
use \lib\entities\OnlinePeer;
use \lib\entities\OfflinePeer;
use \RuntimeException;

/**
 * Manage peers.
 * @author $imon
 */
class PeerController extends ApiBackController {
	protected static $peerServer;

	protected function _getOnlinePeerData(OnlinePeer $peer, $isAttached = false) {
		$peerData = array(
			'registered' => ($peer['userId'] !== null),
			'online' => true
		);

		if ($isAttached) {
			$peerData['userId'] = $peer['userId'];
			$peerData['peerId'] = $peer['id'];
		}

		return $peerData;
	}

	protected function _getOfflinePeerData(OfflinePeer $peer, $isAttached = false) {
		$peerData = array(
			'registered' => true,
			'online' => false,
			'app' => $peer['app']
		);

		if ($isAttached) {
			$peerData['userId'] = $peer['userId'];
		}

		return $peerData;		
	}

	protected function _getPeerData(OnlinePeer $onlinePeer = null, OfflinePeer $offlinePeer = null, $isAttached = false) {
		if (empty($onlinePeer) && empty($offlinePeer)) {
			return null;
		}

		$offlinePeerData = array();
		$onlinePeerData = array();
		if (!empty($offlinePeer)) {
			if ($offlinePeer['public']) {
				$isAttached = true;
			}
			$offlinePeerData = $this->_getOfflinePeerData($offlinePeer, $isAttached);
		}
		if (!empty($onlinePeer)) {
			$onlinePeerData = $this->_getOnlinePeerData($onlinePeer, $isAttached);
		}

		return array_merge($offlinePeerData, $onlinePeerData);
	}

	// GETTERS

	public function executeListPeers($appName = null, $myPeerId = null) {
		$server = $this->peerServer();
		$manager = $this->managers()->getManagerOf('peer');
		$peerLinkManager = $this->managers()->getManagerOf('peerLink');
		$user = $this->app()->user();
		
		$currentOfflinePeer = null;
		if ($user->isLogged()) {
			$currentOfflinePeer = $manager->getByUserAndApp($user->id(), $appName);
		}

		$peers = array();
		$onlinePeers = $server->listPeers();
		foreach ($onlinePeers as $onlinePeer) {
			$offlinePeer = null;
			$isAttached = false;
			if ($onlinePeer['userId'] !== null && !empty($appName)) {
				$offlinePeer = $manager->getByUserAndApp($onlinePeer['userId'], $appName);

				if (!empty($currentOfflinePeer)) {
					$isAttached = $peerLinkManager->existsByPeers($currentOfflinePeer['id'], $offlinePeer['id']);
				}
			}

			$peers[] = $this->_getPeerData($onlinePeer, $offlinePeer, $isAttached);
		}

		return $peers;
	}

	public function executeGetPeer($peerId) {
		$server = $this->peerServer();

		$onlinePeer = $server->getPeer($peerId);
		$peerData = $this->_getPeerData($onlinePeer, null, true);

		if (empty($peerData)) {
			throw new RuntimeException('Cannot find peer with id "'.$peerId.'"', 404);
		}

		return $peerData;
	}

	public function executeGetPeerByUserAndApp($userId, $appName, $myPeerId = null) {
		$server = $this->peerServer();
		$manager = $this->managers()->getManagerOf('peer');
		$peerLinkManager = $this->managers()->getManagerOf('peerLink');
		$user = $this->app()->user();

		$offlinePeer = $manager->getByUserAndApp($userId, $appName);

		$isAttached = false;
		if ($user->isLogged()) {
			$currentOfflinePeer = $manager->getByUserAndApp($user->id(), $appName);
			if (!empty($currentOfflinePeer)) {
				$isAttached = $peerLinkManager->existsByPeers($currentOfflinePeer['id'], $offlinePeer['id']);
			}
		}

		$peerData = $this->_getPeerData(null, $offlinePeer, $isAttached);

		if (empty($peerData)) {
			throw new RuntimeException('Cannot find peer with user "'.$userId.'" and app "'.$appName.'"', 404);
		}

		return $peerData;
	}

	// PEER SERVER

	public static function setPeerServer(PeerServer &$peerServer) {
		self::$peerServer = $peerServer;
	}

	protected function peerServer() {
		if (empty(self::$peerServer)) {
			throw new RuntimeException('Cannot contact PeerServer, please try again');
		}

		return self::$peerServer;
	}
}