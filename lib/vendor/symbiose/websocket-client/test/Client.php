<?php

namespace WebSocketClient\TestsHelpers;

use Closure;
use WebSocketClient;
use WebSocketClient\WebSocketClientInterface;
use React\EventLoop\StreamSelectLoop;

class Client implements WebSocketClientInterface
{
    /** @var string $host */
    private $host;

    /** @var int $port */
    private $port;

    /** @var string $path */
    private $path;

    /** @var WebSocketClient $socket */
    private $socket;

    /** @var WebSocketClient $client */
    private $client;

    /** @var callable $onWelcomeCallback */
    private $onWelcomeCallback;

    /** @var callable $onWelcomeCallback */
    private $onEventCallback;

    /**
     * Init websocket client
     *
     * @param StreamSelectLoop $loop
     * @param string $host
     * @param int $port
     * @param string $path
     */
    function __construct(StreamSelectLoop $loop, $host, $port, $path)
    {
        $this->setHost($host)
            ->setPort($port)
            ->setPath($path);

        $this->setSocket(
            new WebSocketClient($this, $loop, $this->getHost(), $this->getPort(), $this->getPath())
        );
    }

    /**
     * @param array $data
     * @return void
     */
    public function onWelcome(array $data)
    {
        if ($this->onWelcomeCallback instanceof Closure) {
            $closure = $this->onWelcomeCallback;
            $closure($this, $data);
        }
    }

    /**
     * @param string $topic
     * @param array $data
     * @return void
     */
    public function onEvent($topic, $data)
    {
        if ($this->onEventCallback instanceof Closure) {
            $closure = $this->onEventCallback;
            $closure($this, $topic, $data);
        }
    }

    /**
     * @param $proc
     * @param $args
     * @param callable $callback
     */
    public function call($proc, $args, Closure $callback = null)
    {
        $this->client->call($proc, $args, $callback);
    }

    /**
     * Subscribe to a topic
     *
     * @param string $topic
     */
    public function subscribe($topic)
    {
        $this->getClient()->subscribe($topic);
    }

    /**
     * Subscribe to a topic
     *
     * @param string $topic
     */
    public function unsubscribe($topic)
    {
        $this->getClient()->unsubscribe($topic);
    }

    /**
     * @param $topic
     * @param $message
     */
    public function publish($topic, $message)
    {
        $this->getClient()->publish($topic, $message);
    }

    /**
     * @param WebSocketClient $client
     * @return self
     */
    function setClient(WebSocketClient $client)
    {
        $this->client = $client;
        return $this;
    }

    /**
     * @return WebSocketClient
     */
    function getClient()
    {
        return $this->client;
    }

    /**
     * @param callable $callback
     * @return self
     */
    public function setOnWelcomeCallback(Closure $callback)
    {
        $this->onWelcomeCallback = $callback;
        return $this;
    }

    /**
     * @param callable $onEventCallback
     * @return self
     */
    public function setOnEventCallback(Closure $onEventCallback)
    {
        $this->onEventCallback = $onEventCallback;
        return $this;
    }


    /**
     * @param string $host
     * @return self
     */
    public function setHost($host)
    {
        $this->host = (string)$host;
        return $this;

    }

    /**
     * @return string
     */
    public function getHost()
    {
        return $this->host;
    }

    /**
     * @param string $path
     * @return self
     */
    public function setPath($path)
    {
        $this->path = (string)$path;
        return $this;
    }

    /**
     * @return string
     */
    public function getPath()
    {
        return $this->path;
    }

    /**
     * @param int $port
     * @return self
     */
    public function setPort($port)
    {
        $this->port = (int)$port;
        return $this;
    }

    /**
     * @return int
     */
    public function getPort()
    {
        return $this->port;
    }

    /**
     * @param WebSocketClient $socket
     * @return self
     */
    public function setSocket(WebSocketClient $socket)
    {
        $this->socket = $socket;
        return $this;
    }

    /**
     * @return WebSocketClient
     */
    public function getSocket()
    {
        return $this->socket;
    }
}
