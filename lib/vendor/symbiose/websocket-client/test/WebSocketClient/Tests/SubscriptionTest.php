<?php

namespace WebSocketClient\Tests;

use PHPUnit_Framework_TestCase;
use React\EventLoop\Factory;
use React\EventLoop\StreamSelectLoop;
use WebSocketClient\TestsHelpers\Server;
use WebSocketClient\TestsHelpers\Client;
use Ratchet\ConnectionInterface;


class SubscribtionTest extends PHPUnit_Framework_TestCase
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

    public function testSubscription()
    {
        $loop = $this->loop;

        $subscribed = null;
        $this->server->setOnSubscribeCallback(function(ConnectionInterface $conn, $topic) use (&$subscribed, $loop) {
            /** @var \Ratchet\Wamp\Topic $topic */
            $subscribed = $topic->getId();
            $loop->stop();
        });

        $client = new Client($loop, $this->host, $this->port, $this->path);

        $client->setOnWelcomeCallback(function (Client $conn, $data) use (&$response, $loop) {
            $conn->subscribe('this_is_my_topic');
        });

        $loop->run();

        $this->assertEquals('this_is_my_topic', $subscribed);
    }

    public function testUnSubscription()
    {
        $loop = $this->loop;

        $client = new Client($loop, $this->host, $this->port, $this->path);

        $unsubscribed = null;
        $this->server->setOnUnSubscribeCallback(function(ConnectionInterface $conn, $topic) use (&$unsubscribed, $loop) {
            /** @var \Ratchet\Wamp\Topic $topic */
            $unsubscribed = $topic->getId();
            $loop->stop();
        });

        $this->server->setOnSubscribeCallback(function(ConnectionInterface $conn, $topic) use ($client) {
            $client->unsubscribe('this_is_my_new_topic');
        });

        $client->setOnWelcomeCallback(function (Client $conn, $data) use (&$response, $loop) {
            $conn->subscribe('this_is_my_new_topic');
        });

        $loop->run();

        $this->assertEquals('this_is_my_new_topic', $unsubscribed);
    }
}