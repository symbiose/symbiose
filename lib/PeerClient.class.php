<?php
namespace lib;

use WebSocketClient\WebSocketClientInterface;

class PeerClient implements WebSocketClientInterface {
	protected $client;

	protected $onMessageCallback;

	public function __construct($onMessage = null) {
		$this->setOnMessage($onMessage);
	}

	public function setOnMessage($onMessageCallback) {
		if (is_callable($onMessageCallback)) {
			$this->onMessageCallback = $onMessageCallback;
		}
	}

	public function onMessage($data) {
		if (is_callable($this->onMessageCallback)) {
			$callback = $this->onMessageCallback;
			$callback($data);
		}
	}

	public function sendData($data) {
		$this->client->sendData($data);
	}

	public function setClient(WebSocketClient $client)
	{
		$this->client = $client;
	}
}