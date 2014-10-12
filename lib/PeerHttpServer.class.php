<?php
namespace lib;

use Ratchet\Http\HttpServerInterface;
use Ratchet\ConnectionInterface;
use Guzzle\Http\Message\RequestInterface;
use Guzzle\Http\Message\Response;
use \Exception;

/**
 * HTTP PeerJS server.
 */
class PeerHttpServer implements HttpServerInterface {
	const PEERID_LENGTH = 10;
	const ALLOW_DISCOVERY = 1;

	protected $peerServer;

	public function __construct(PeerServer $peerServer) {
		$this->peerServer = $peerServer;
	}

	public function onOpen(ConnectionInterface $from, RequestInterface $request = null) {
		$requestPath = $request->getPath();
		$pathParts = explode('/', preg_replace('#^/peerjs/#', '', $requestPath)); //Remove /peerjs
		$action = array_pop($pathParts);

		$query = $request->getQuery();
		$peerId = (isset($query['id'])) ? $query['id'] : null;
		$peerToken = (isset($query['token'])) ? $query['token'] : null;

		$respStatus = 200;
		$respHeaders = array(
			'Access-Control-Allow-Origin' => '*'
		);
		$respBody = null;

		switch ($action) {
			case 'id':
				$respHeaders['Content-Type'] = 'text/html';

				if ($peerId === null) {
					do {
						$peerId = substr(sha1(uniqid('', true) . mt_rand()), 0, self::PEERID_LENGTH);
					} while ($this->peerServer->peerIdExists($peerId));
				}

				$respBody = $peerId;
				break;
			case 'peers':
				if (self::ALLOW_DISCOVERY) {
					$peers = $this->peerServer->listPeers();
					$list = array();

					foreach ($peers as $peer) {
						$list[] = $peer['id'];
					}

					$respBody = $list;
				} else {
					$respStatus = 401; // Access denied
				}
				break;
			case 'offer':
			case 'candidate':
			case 'answer':
			case 'leave':
				//TODO: start streaming?
			default:
				$respStatus = 400; //Bad request
		}

		if (is_array($respBody)) { // Encode to JSON
			$respHeaders['Content-Type'] = 'application/json';
			$respBody = json_encode($respBody);
		}

		//Send response
		$response = new Response($respStatus, $respHeaders, (string)$respBody);
		$from->send((string)$response);
		$from->close();
	}

	public function onMessage(ConnectionInterface $from, $msg) {}
	public function onError(ConnectionInterface $from, Exception $e) {}
	public function onClose(ConnectionInterface $from) {}
}