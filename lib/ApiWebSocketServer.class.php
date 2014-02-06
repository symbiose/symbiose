<?php
namespace lib;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class ApiWebSocketServer implements MessageComponentInterface {
	protected $clients;

	public function __construct() {
		$this->clients = new \SplObjectStorage;
	}

	protected function _handleRequest(ConnectionInterface $from, $reqData) {
		$request = new HTTPRequest($from->Session);

		$apiCall = new Api;
		$apiCall->emulate($reqData, $request);
		$apiCall->run();

		$resp = $apiCall->httpResponse()->content();

		return $resp;
	}

	protected function _handleRequestGroup(ConnectionInterface $from, $reqsData) {
		$responses = array();

		foreach($reqsData as $reqData) {
			$responses[] = $this->_handleRequest($from, $reqData);
		}

		$resp = new ApiGroupResponse;
		$resp->setResponses($responses);

		return $resp;
	}

	public function onOpen(ConnectionInterface $conn) {
		// Store the new connection to send messages to later
		$this->clients->attach($conn);

		echo "New connection! ({$conn->resourceId})\n";
	}

	public function onMessage(ConnectionInterface $from, $msg) {
		echo 'Received data from '.$from->resourceId.' ('.strlen($msg).')'."\n";

		try {
			$req = json_decode($msg, true);

			if (json_last_error() !== JSON_ERROR_NONE || empty($req)) {
				throw new \RuntimeException('Bad request: invalid JSON (#'.json_last_error().'): '.$input);
			}

			if (!isset($req['id']) || !is_int($req['id'])) {
				throw new \RuntimeException('Bad request: invalid request id');
			}
			if (!isset($req['data']) || !is_array($req['data'])) {
				throw new \RuntimeException('Bad request: invalid request data');
			}
			if (isset($req['http_headers']) && is_array($req['http_headers'])) {
				if (isset($req['http_headers']['Accept-Language'])) {
					$_SERVER['HTTP_ACCEPT_LANGUAGE'] = $req['http_headers']['Accept-Language'];
				}
			}

			$reqId = $req['id'];

			if (isset($req['groupped']) && $req['groupped'] == true) {
				$resp = $this->_handleRequestGroup($from, $req['data']);
			} else {
				$resp = $this->_handleRequest($from, $req['data']);
			}

			$resp->setId($reqId);
		} catch (Exception $e) {
			$errMsg = $e->getMessage();

			$resp = new ApiResponse();
			$resp->setSuccess(false);
			$resp->setValue($errMsg);
			$resp->setChannel(2, $errMsg);
		}

		$output = $resp->generate();
		
		echo 'Sending data to '.$from->resourceId.' ('.strlen($output).')'."\n";
		$from->send($output);
	}

	public function onClose(ConnectionInterface $conn) {
		// The connection is closed, remove it, as we can no longer send it messages
		$this->clients->detach($conn);

		echo "Connection {$conn->resourceId} has disconnected\n";
	}

	public function onError(ConnectionInterface $conn, \Exception $e) {
		echo "An error has occurred: {$e->getMessage()}\n";

		$conn->close();
	}

	public function run() {
		echo "Starting API WebSocket server...\n";

		$this->server->run();
	}
}