<?php
namespace lib;

use lib\entities\OnlinePeer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\Factory as EventLoopFactory;
use \WebSocketClient;

class PeerServer implements MessageComponentInterface {
	/*protected $config = array(
		'defaultApplicationName' => 'default',
		'externalIceServers' => array(
			array('url' => 'stun:stun.l.google.com:19302'),
			array('url' => 'stun:stun.sipgate.net'),
			array('url' => 'stun:217.10.68.152'),
			array('url' => 'stun:stun.sipgate.net:10000'),
			array('url' => 'stun:217.10.68.152:10000')
		),
		'cmdPacketType' => 'easyrtcCmd',
		'cmdMsgType' => array(
			'error' => 'error',
			'list' => 'list',
			'token' => 'token'
		)
	);*/

	protected $hostname;
	protected $port;

	protected $clients;
	protected $peers;

	public function __construct($hostname, $port) {
		$this->clients = new \SplObjectStorage;
		$this->peers = array();
		$this->hostname = $hostname;
		$this->port = $port;
	}

	protected function _getApi(ConnectionInterface $conn, array $reqData = array()) {
		$request = new HTTPRequest($conn->Session);

		$api = new Api;
		$api->emulate($reqData, $request);

		return $api;
	}

	//MessageComponentInterface methods

	public function onOpen(ConnectionInterface $conn) {
		// Store the new connection to send messages to later
		$this->clients->attach($conn);

		echo "New connection! ({$conn->resourceId})\n";
		
		$params = $conn->WebSocket->request->getQuery()->getAll();
		$peerId = (isset($params['id'])) ? urldecode($params['id']) : null;
		$key = (isset($params['key'])) ? urldecode($params['key']) : null;
		$peerToken = (isset($params['token'])) ? urldecode($params['token']) : null;

		//No ID/token specified ?
		if (empty($peerId) || empty($peerToken)) {
			$conn->send(json_encode(array(
				'type' => 'ERROR',
				'payload' => array('msg' => 'Empty ID or token')
			)));
			$conn->close();
		}

		//Check ID
		if (!preg_match('#^[a-zA-Z0-9]+(@[a-zA-Z0-9\./:-]+)?$#', $peerId)) {
			$conn->send(json_encode(array(
				'type' => 'ERROR',
				'payload' => array('msg' => 'Bad ID: '.$peerId)
			)));
			$conn->close();
			return;
		}

		//ID already taken?
		if ($this->peerIdExists($peerId)) {
			$conn->send(json_encode(array(
				'type' => 'ID-TAKEN',
				'payload' => array('msg' => 'ID is already taken')
			)));
			$conn->close();
			return;
		}

		$peerData = array(
			'connectionId' => $conn->resourceId,
			'id' => $peerId,
			'token' => $peerToken
		);
		$api = $this->_getApi($conn);
		$user = $api->user();
		if ($user->isLogged()) {
			$peerData['userId'] = $user->id();
		}
		$this->insertPeer($this->_buildPeer($peerData));

		//Send welcome message
		$welcomeMsg = json_encode(array(
			'type' => 'OPEN'
		));
		$conn->send($welcomeMsg);
	}

	protected function _sendMsgToClient(ConnectionInterface $from, $dst, $msg) {
		$msgSent = false;

		$src = $this->getPeerByConnId($from->resourceId);
		$src['id'];

		try {
			foreach($this->clients as $conn) {
				$peer = $this->getPeerByConnId($conn->resourceId);
				if ($peer['id'] == $dst) {
					echo 'Sending data from '.$src.' to '.$dst.' ('.strlen($msg).')'."\n";
					$conn->send($msg);
					$msgSent = true;
					break;
				}
			}
		} catch (\Exception $e) {
			// This happens when a peer disconnects without closing connections and
			// the associated WebSocket has not closed.

			/*foreach($this->clients as $conn) {
				if ($conn->resourceId == $dst) {
					$this->onClose($conn);
					break;
				}
			}

			// Tell other side to stop trying.
			// TODO: $this->onMessage() can trigger an infinite loop
			$leaveMsg = json_encode(array(
				'type' => 'LEAVE',
				'src' => $dst,
				'dst' => $src
			));
			$this->onMessage($leaveMsg);*/
			return;
		}

		return $msgSent;
	}

	protected function _sendMsgToServer(ConnectionInterface $from, $dst, $msgData) {
		$srcId = $this->getPeerByConnId($from->resourceId);
		$srcId['id'];
		$src = $srcId.'@'.$this->hostname().':'.$this->port().'/peerjs';

		$dstData = parse_url($dst);
		if (!isset($dstData['user']) || !isset($dstData['host'])) {
			return false;
		}

		$dstId = $dstData['user'];
		$dstHost = $dstData['host'];
		$dstPort = (isset($dstData['port'])) ? $dstData['port'] : 80;
		$dstPath = (isset($dstData['path'])) ? $dstData['path'] : '/';
		$dstPath .= '?id='.urlencode($src);

		$msgData['src'] = $src;
		$msgData['dst'] = $dstId;

		//Check that the dst is located on another server
		if ($dstHost == $this->hostname() && $dstPort == $this->port()) {
			return $this->_sendMsgToServer($from, $dstId, $msgData);
		}

		$peerClient = new PeerClient;
		$loop = EventLoopFactory::create();
		$client = new WebSocketClient($peerClient, $loop, $dstHost, $dstPort, $dstPath);

		$peerClient->setOnMessage(function ($data) use($peerClient, $client, $msgData) {
			switch ($data['type']) {
				case 'OPEN': //Connection accepted
					$peerClient->sendData($msgData);
					$client->getSocket()->on('end', function() use ($client) { //Wait the message to be sent before closing this connection
						$client->disconnect();
					});
					$client->getSocket()->end();
					break;
				case 'ID-TAKEN':
				case 'ERROR':
				default:
					$client->disconnect();
					break;
			}
		});

		$loop->run();

		return true;
	}

	protected function _handleTransmission(ConnectionInterface $from, $msgData) {

		$msgData = $this->getPeerByConnId($from->resourceId);
		$msgData['src']['id'];
		$type = $msgData['type'];
		$src = $msgData['src'];
		$dst = (isset($msgData['dst'])) ? $msgData['dst'] : null;

		$msg = json_encode($msgData);

		if (!in_array($type, array('LEAVE', 'CANDIDATE', 'OFFER', 'ANSWER'))) {
			echo 'Error: Unknown message type "'.$type.'"';
			return;
		}

		$msgSent = false;

		if ($dst !== null) {
			if (strpos($dst, '@') !== false) {
				$msgSent = $this->_sendMsgToServer($from, $dst, $msgData);
			} else {
				$msgSent = $this->_sendMsgToClient($from, $dst, $msg);
			}
		}

		if (!$msgSent) {
			if ($type != 'LEAVE' && $type != 'EXPIRE') {
				//TODO: keep message in cache to send it later, when the other peer will reconnect
				echo 'Peer '.$dst.' not found!'."\n";
			} elseif ($type == 'LEAVE' && $dst === null) {
				$this->onClose($from);
			} else {
				// Unavailable destination specified with message LEAVE or EXPIRE
				// Ignore
			}
		}
	}

	public function onMessage(ConnectionInterface $from, $msg) {
		echo 'Received data from '.$from->resourceId.' ('.strlen($msg).')'."\n";

		$msgData = json_decode($msg, true);

		if (json_last_error() != JSON_ERROR_NONE) {
			echo 'Error: Invalid JSON data ('.json_last_error().')';
			return;
		}

		$this->_handleTransmission($from, $msgData);
	}

	public function onClose(ConnectionInterface $conn) {
		// The connection is closed, remove it, as we can no longer send it messages
		$this->clients->detach($conn);

		//Delete peer
		$peer = $this->getPeerByConnId($conn->resourceId);
		if (!empty($peer)) {
			$this->deletePeer($peer['id']);
		}

		echo "Connection {$conn->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface $conn, \Exception $e) {
		echo "An error has occurred: {$e->getMessage()}\n";

		$conn->close();
	}

	//Other methods

	protected function _buildPeer(array $peerData) {
		return new OnlinePeer($peerData);
	}

	public function peerIdExists($id) {
		foreach ($this->peers as $peer) {
			if ($peer['id'] == $id) {
				return true;
			}
		}

		return false;
	}

	public function getPeer($id) {
		foreach ($this->peers as $peer) {
			if ($peer['id'] == $id) {
				return $peer;
			}
		}

		return null;
	}

	public function getPeerByConnId($connId) {
		if (!isset($this->peers[$connId])) {
			return null;
		}

		return $this->peers[$connId];
	}

	public function listPeers() {
		return array_values($this->peers);
	}

	public function listPeersByUser($userId) {
		$list = array();
		foreach ($this->peers as $peer) {
			if ($peer['userId'] == $userId) {
				$list[] = $peer;
			}
		}

		return $list;
	}

	public function insertPeer($peer) {
		return $this->updatePeer($peer);
	}

	public function updatePeer($peer) {
		$this->peers[$peer['connectionId']] = $peer;
	}

	public function deletePeer($id) {
		foreach ($this->peers as $i => $peer) {
			if ($peer['id'] == $id) {
				unset($this->peers[$i]);
				return;
			}
		}

		throw new \RuntimeException('Cannot find peer with ID "'.$id.'"');
	}

	public function hostname() {
		return $this->hostname;
	}

	public function port() {
		return $this->port;
	}
}
