<?php
namespace lib;

use Ratchet\Wamp\WampServerInterface;
use Ratchet\ConnectionInterface as Conn;

class ApiWebSocketServer implements WampServerInterface {
	protected $subscribedTopics = array();
	protected $clients;

	public function __construct() {
		$this->clients = new \SplObjectStorage;
	}

	protected function _handleRequest(Conn $from, $reqData) {
		$request = new HTTPRequest($from->Session);

		$apiCall = new Api;
		$apiCall->emulate($reqData, $request);
		$apiCall->run();

		$resp = $apiCall->httpResponse()->content();

		return $resp;
	}

	protected function _handleRequestGroup(Conn $from, $reqsData) {
		$responses = array();

		foreach($reqsData as $reqData) {
			$responses[] = $this->_handleRequest($from, $reqData);
		}

		$resp = new ApiGroupResponse;
		$resp->setResponses($responses);

		return $resp;
	}

	public function onOpen(Conn $conn) {
		// Store the new connection to send messages to later
		$this->clients->attach($conn);

		echo "New connection! ({$conn->resourceId})\n";
	}

	public function publish($topicId, $event) {
		if (!array_key_exists($topicId, $this->subscribedTopics)) {
			return; // No suscribers
		}

		$topic = $this->subscribedTopics[$topicId];
		$topic->broadcast($event);
	}

	public function onPublish(Conn $conn, $topic, $event, array $exclude, array $eligible) {
		$topic->broadcast($event);
	}

	public function onCall(Conn $from, $callId, $topic, array $params) {
		echo 'Received data from '.$from->resourceId."\n";

		if ($topic->getId() == 'api.call') {
			if (!isset($params['id']) || !is_int($params['id'])) {
				var_dump($params);
				$from->callError($callId, $topic, 'Bad request: invalid call id');
				return;
			}

			// Handle HTTP headers
			if (isset($params['http_headers']) && is_array($params['http_headers'])) {
				if (isset($params['http_headers']['Accept-Language'])) {
					$_SERVER['HTTP_ACCEPT_LANGUAGE'] = $params['http_headers']['Accept-Language'];
				}
			}

			try {
				if (isset($params['groupped']) && $params['groupped'] == true) {
					$resp = $this->_handleRequestGroup($from, $params['data']);
				} else {
					$resp = $this->_handleRequest($from, $params['data']);
				}
			} catch (Exception $e) {
				$errMsg = $e->getMessage();

				$resp = new ApiResponse();
				$resp->setSuccess(false);
				$resp->setValue($errMsg);
				$resp->setChannel(2, $errMsg);
			}

			$resp->setId($params['id']);

			$respData = $resp->generateArray();

			echo 'Sending data to '.$from->resourceId."\n";
			$from->callResult($callId, $respData);
		} else {
			$from->callError($callId, $topic, 'Bad request: unsupported topic "'.$topic->getId().'"');
		}
	}

	public function onClose(Conn $conn) {
		// The connection is closed, remove it, as we can no longer send it messages
		$this->clients->detach($conn);

		echo "Connection {$conn->resourceId} has disconnected\n";
	}

	public function onSubscribe(Conn $conn, $topic) {
		// When a visitor subscribes to a topic link the Topic object in a  lookup array
		if (!array_key_exists($topic->getId(), $this->subscribedTopics)) {
			$this->subscribedTopics[$topic->getId()] = $topic;
		}
	}

	public function onUnSubscribe(Conn $conn, $topic) {}

	public function onError(Conn $conn, \Exception $e) {
		echo "An error has occurred: {$e->getMessage()}\n";

		$conn->close();
	}

	public function run() {
		echo "Starting API WebSocket server...\n";

		$this->server->run();
	}
}