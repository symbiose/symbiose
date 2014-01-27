<?php
namespace lib;

use WebSocketClient\WebSocketClientInterface;

class PeerClient implements WebSocketClientInterface {
	private $client;

	protected $onMessage;

	public function __construct($onMessage = null) {
		$this->setOnMessage($onMessage);
	}

	public function setOnMessage($onMessage) {
		if (is_callable($this->onMessage)) {
			$this->onMessage = $onMessage;
		}
	}

	public function onMessage($data) {
		if (is_callable($this->onMessage)) {
			$this->onMessage($data);
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