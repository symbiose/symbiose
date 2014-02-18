<?php

namespace WebSocketClient\Tests;

use PHPUnit_Framework_TestCase;
use React\EventLoop\Factory;
use React\EventLoop\StreamSelectLoop;
use WebSocketClient\TestsHelpers\Server;
use WebSocketClient\TestsHelpers\Client;
use Ratchet\ConnectionInterface;

class PublishTest extends PHPUnit_Framework_TestCase
{
    private $host = '127.0.0.1';
    private $port;
    private $path = '/mytest';

    /** @var StreamSelectLoop */
    private $loop;

    /** @var Server */
    private $server;

    public function setUp()
    {
        $this->port = !empty($GLOBALS['port']) ? (int)$GLOBALS['port'] : 8080;
        $this->loop = Factory::create();
        $this->server = new Server($this->loop, $this->port, $this->path);

        $loop = $this->loop;
        $this->loop->addPeriodicTimer(10, function () use ($loop) {
            $loop->stop();
        });
    }

    public function tearDown()
    {
        $this->server->close();
    }

    public function testPublish()
    {
        $loop = $this->loop;

        $client = new Client($loop, $this->host, $this->port, $this->path);

        $published = null;
        $this->server->setOnPublishCallback(function(ConnectionInterface $conn, $topic, $event) use (&$published, $loop) {
            /** @var \Ratchet\Wamp\Topic $topic */
            $published = array('topic' => $topic->getId(), 'message' => $event);
            $loop->stop();
        });

        $response = null;
        $client->setOnWelcomeCallback(function (Client $conn, $data) use (&$response, $loop) {
            $conn->publish('mytopic', 'my_message');
        });

        $loop->run();

        $this->assertEquals('mytopic', $published['topic']);
        $this->assertEquals('my_message', $published['message']);
    }
}