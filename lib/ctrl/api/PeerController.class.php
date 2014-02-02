<?php
namespace lib\ctrl\api;

use \lib\ApiBackController;
use \lib\PeerServer;
use \lib\entities\OnlinePeer;
use \lib\entities\OfflinePeer;

/**
 * Manage peers.
 * @author $imon
 */
class PeerController extends ApiBackController {
	protected static $peerServer;

	protected function _getOnlinePeerData(OnlinePeer $peer) {
		return array(
			'peerId' => $peer['id'], //Peer ID
			'registered' => ($peer['userId'] === null),
			'online' => true
		);
	}

	protected function _getOfflinePeerData(OfflinePeer $peer) {
		return array(
			'registered' => true,
			'online' => false
		);
	}

	protected function _getPeerData(OnlinePeer $onlinePeer = null, OfflinePeer $offlinePeer = null) {
		if (empty($onlinePeer) && empty($offlinePeer)) {
			return null;
		}

		$onlinePeerData = array();
		$offlinePeerData = array();
		if (!empty($onlinePeer)) {
			$onlinePeerData = $this->_getOnlinePeerData($onlinePeer);
		}
		if (!empty($offlinePeer)) {
			$offlinePeerData = $this->_getOfflinePeerData($offlinePeer);
		}

		return array_merge($offlinePeerData, $onlinePeerData);
	}

	public function executeListPeers($appName = null) {
		$server = $this->peerServer();
		//$manager = $this->managers()->getManagerOf('peer'); //TODO

		$peers = array();
		$onlinePeers = $server->listPeers();
		foreach ($onlinePeers as $onlinePeer) {
			$peers[] = $this->_getPeerData($onlinePeer);
		}

		return $peers;
	}

	public function executeGetPeer($peerId) {

	}

	public function executeGetPeerByUser($userId) {

	}

	// Peer server

	public static function setPeerServer(PeerServer &$peerServer) {
		self::$peerServer = $peerServer;
	}

	protected function peerServer() {
		return self::$peerServer;
	}
}