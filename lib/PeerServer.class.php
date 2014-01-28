<?php
namespace lib;

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

	protected $clients;

	protected $clientsIds;

	public function __construct() {
		$this->clients = new \SplObjectStorage;
		$this->clientsIds = array();
	}

	public function onOpen(ConnectionInterface $conn) {
		// Store the new connection to send messages to later
		$this->clients->attach($conn);

		echo "New connection! ({$conn->resourceId})\n";
		
		$params = $conn->WebSocket->request->getQuery()->getAll();
		$username = urldecode($params['id']);

		//Check ID
		if (!preg_match('#^[a-zA-Z0-9]+(@[a-zA-Z0-9\./:-]+)?$#', $username)) {
			$conn->send(json_encode(array(
				'type' => 'ERROR',
				'payload' => array('msg' => 'Bad ID : '.$username)
			)));
			$conn->close();
			return;
		}

		//ID already taken?
		if (in_array($username, $this->clientsIds)) {
			$conn->send(json_encode(array(
				'type' => 'ID-TAKEN',
				'payload' => array('msg' => 'ID is taken')
			)));
			$conn->close();
			return;
		}

		$this->clientsIds[$conn->resourceId] = $username;

		//Send welcome message
		$welcomeMsg = json_encode(array(
			'type' => 'OPEN'
		));
		$conn->send($welcomeMsg);
	}

	protected function _sendMsgToClient(ConnectionInterface $from, $dst, $msg) {
		$msgSent = false;

		$src = $this->clientsIds[$from->resourceId];

		try {
			foreach($this->clients as $conn) {
				if ($this->clientsIds[$conn->resourceId] == $dst) {
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
		$srcId = $this->clientsIds[$from->resourceId];
		//TODO
		$src = $srcId.'@'.$_SERVER['SERVER_NAME'].':9000/peerjs';

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
	}

	protected function _handleTransmission(ConnectionInterface $from, $msgData) {
		$msgData['src'] = $this->clientsIds[$from->resourceId];

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

		if (isset($this->clientsIds[$conn->resourceId])) {
			unset($this->clientsIds[$conn->resourceId]);
		}

		echo "Connection {$conn->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface $conn, \Exception $e) {
		echo "An error has occurred: {$e->getMessage()}\n";

		$conn->close();
	}

	public function run() {
		echo "Starting server...\n";

		$this->server->run();
	}
}