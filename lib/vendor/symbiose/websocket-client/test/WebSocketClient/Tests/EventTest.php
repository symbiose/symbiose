<?php

namespace WebSocketClient\Tests;

use PHPUnit_Framework_TestCase;
use React\EventLoop\Factory;
use React\EventLoop\StreamSelectLoop;
use WebSocketClient\TestsHelpers\Server;
use WebSocketClient\TestsHelpers\Client;
use Ratchet\ConnectionInterface;

class EventTest extends PHPUnit_Framework_TestCase
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

    public function testEvent()
    {
        $loop = $this->loop;

        $client = new Client($loop, $this->host, $this->port, $this->path);

        $server = $this->server;
        $this->server->setOnSubscribeCallback(function(ConnectionInterface $conn, $topic) use ($server) {
            /** @var \Ratchet\Wamp\Topic $topic */
            $server->broadcast($topic->getId(), 'this is my message');
        });

        $response = null;
        $client->setOnEventCallback(function (Client $conn, $topic, $data) use (&$response, $loop) {
            $response = array('topic' => $topic, 'message' => $data);
            $loop->stop();
        });

        $client->setOnWelcomeCallback(function (Client $conn, $data) {
            $conn->subscribe('test_topic');
        });

        $loop->run();

        $this->assertEquals('test_topic', $response['topic']);
        $this->assertEquals('this is my message', $response['message']);
    }
}