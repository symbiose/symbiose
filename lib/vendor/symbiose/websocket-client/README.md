WebSocket client
================

A simple WebSocket client implemented in php.

## Requirements

This library uses PHP 5.3+.

## Install

It is recommended that you install the WebSocket client library [through composer](http://getcomposer.org).

```JSON
{
    "require": {
        "symbiose/websocket-client": "dev-master"
    }
}
```

## Usage

Here is an example of a simple WebSocket client:

```PHP
class Client implements WebSocketClient\WebSocketClientInterface {
    private $client;

    public function onMessage($topic, $message) {}

    public function sendData($data) {
        $this->client->sendData($data);
    }

    public function setClient(WebSocketClient $client) {
        $this->client = $client;
    }
}

$loop = React\EventLoop\Factory::create();

$client = new WebSocketClient(new Client, $loop);

$loop->run();
```
