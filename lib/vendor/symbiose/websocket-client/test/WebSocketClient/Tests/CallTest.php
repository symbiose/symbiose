<?php

namespace WebSocketClient\Tests;

use PHPUnit_Framework_TestCase;
use React\EventLoop\Factory;
use React\EventLoop\StreamSelectLoop;
use WebSocketClient\TestsHelpers\Server;
use WebSocketClient\TestsHelpers\Client;

class CallTest extends PHPUnit_Framework_TestCase
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

    public function testCall()
    {
        $loop = $this->loop;

        $client = new Client($loop, $this->host, $this->port, $this->path);

        $response = null;
        $client->setOnWelcomeCallback(function (Client $conn, $data) use (&$response, $loop) {
            $conn->call('mymethod', array('my_value'), function($data) use (&$response, $loop) {
                $response = $data;
                $loop->stop();
            });
        });

        $loop->run();

        $this->assertEquals('my_value', $response[0]);
    }
}