<?php
namespace lib;

use Ratchet\Http\HttpServerInterface;
use Ratchet\Http\HttpServer;
use Ratchet\ConnectionInterface;
use Guzzle\Http\Message\RequestInterface;
use Guzzle\Http\Message\Response;
use \Exception;

/**
 * HTTP PeerJS server.
 */
class PeerHttpServer implements HttpServerInterface {
	const PEERID_LENGTH = 10;

	protected $peerServer;

	public function __construct(PeerServer $peerServer) {
		$this->peerServer = $peerServer;
	}

	public function onOpen(ConnectionInterface $from, RequestInterface $request = null) {
		echo "New HTTP connection!\n";

		//Variables in URLs are not supported in Ratchet for now
		//See https://github.com/cboden/Ratchet/pull/143
		$requestPath = $request->getPath();
		$pathParts = explode('/', preg_replace('#^/peerjs/#', '', $requestPath)); //Remove /peerjs
		$action = array_pop($pathParts);
		$peerToken = array_pop($pathParts);
		$peerId = array_pop($pathParts);
		$key = array_pop($pathParts);

		$respStatus = 200;
		$respHeaders = array(
			'X-Powered-By' => \Ratchet\VERSION,
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
			case 'offer':
			case 'candidate':
			case 'answer':
			case 'leave':
				//TODO: start streaming?
			default:
				$respStatus = 400; //Bad request
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