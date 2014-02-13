<?php

use React\EventLoop\StreamSelectLoop;
use React\Socket\Connection;
use React\Stream\Stream;
use WebSocketClient\WebSocketClientInterface;
use \RuntimeException;

/**
 * Class WebSocketClient
 */
class WebSocketClient
{
    const VERSION = '0.1.4';
    const TOKEN_LENGHT = 16;

    /** @var string $key */
    private $key;

    /** @var StreamSelectLoop $loop */
    private $loop;

    /** @var WebSocketClientInterface $client */
    private $client;

    /** @var string $host */
    private $host;

    /** @var int $port */
    private $port;

    /** @var string $path */
    private $path;

    /** @var Connection $socket */
    private $socket;

    /** @var bool $connected */
    private $connected = false;

    /** @var array $callbacks */
    private $callbacks = array();

    /**
     * @param WebSocketClientInterface $client
     * @param StreamSelectLoop $loop
     * @param string $host
     * @param int $port
     * @param string $path
     */
    function __construct(WebSocketClientInterface $client, StreamSelectLoop $loop, $host = '127.0.0.1', $port = 8080, $path = '/')
    {
        $this->setLoop($loop)
            ->setHost($host)
            ->setPort($port)
            ->setPath($path)
            ->setClient($client)
            ->setKey($this->generateToken(self::TOKEN_LENGHT));

        $this->connect();
        $client->setClient($this);
    }

    /**
     * Disconnect on destruct
     */
    function __destruct()
    {
        $this->disconnect();
    }

    /**
     * Connect client to server
     *
     * @return self
     */
    public function connect()
    {
        $root = $this;
        $client = stream_socket_client("tcp://{$this->getHost()}:{$this->getPort()}", $errno, $errstr);

        if (!$client) {
            throw new RuntimeException('Cannot connect to socket ([#'.$errno.'] '.$errstr.')');
        }

        $this->setSocket(new Connection($client, $this->getLoop()));
        $this->getSocket()->on('data', function ($data) use ($root) {
            $data = $root->parseIncomingRaw($data);
            $root->parseData($data);
        });
        $this->getSocket()->write($this->createHeader());

        return $this;
    }

    /**
     * Disconnect from server
     */
    public function disconnect()
    {
        $this->connected = false;
        $this->socket->close();
    }

    /**
     * @return bool
     */
    public function isConnected()
    {
        return $this->connected;
    }

    /**
     * @param $data
     * @param $header
     */
    private function receiveData($data, $header)
    {
        if (!$this->isConnected()) {
            $this->disconnect();
            return;
        }

        $this->client->onMessage($data);
    }

    /**
     * @param $data
     * @param string $type
     * @param bool $masked
     */
    public function sendData($data, $type = 'text', $masked = true)
    {
        if (!$this->isConnected()) {
            $this->disconnect();
            return;
        }

        $this->getSocket()->write($this->hybi10Encode(json_encode($data)));
    }

    /**
     * Parse received data
     *
     * @param $response
     */
    private function parseData($response)
    {
        if (!$this->connected && isset($response['Sec-Websocket-Accept'])) {
            if (base64_encode(pack('H*', sha1($this->key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'))) === $response['Sec-Websocket-Accept']) {
                $this->connected = true;
            }
        }

        if ($this->connected && !empty($response['content'])) {
            $content = trim($response['content']);

            //Very ugly, but does not work with it
            //Don't know why
            //If you do, please e-mail me ASAP!
            $firstBracket = strpos($content, '{');
            $lastBracket = strrpos($content, '}');
            $content = utf8_encode(substr($content, $firstBracket, $lastBracket - 1));
            $data = json_decode($content, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                unset($response['status']);
                unset($response['content']);
                $this->receiveData($data, $response);
            } else {
                echo 'JSON decode error [#'.json_last_error().']';
            }
        }
    }

    /**
     * Create header for websocket client
     *
     * @return string
     */
    private function createHeader()
    {
        $host = $this->getHost();
        if ($host === '127.0.0.1' || $host === '0.0.0.0') {
            $host = 'localhost';
        }

        return "GET {$this->getPath()} HTTP/1.1" . "\r\n" .
        "Origin: null" . "\r\n" .
        "Host: {$host}:{$this->getPort()}" . "\r\n" .
        "Sec-WebSocket-Key: {$this->getKey()}" . "\r\n" .
        "User-Agent: PHPWebSocketClient/" . self::VERSION . "\r\n" .
        "Upgrade: websocket" . "\r\n" .
        "Connection: Upgrade" . "\r\n" .
        "Sec-WebSocket-Version: 13" . "\r\n" . "\r\n";
    }

    /**
     * Parse raw incoming data
     *
     * @param $header
     * @return array
     */
    private function parseIncomingRaw($header)
    {
        $retval = array();
        $content = "";
        $fields = explode("\r\n", preg_replace('/\x0D\x0A[\x09\x20]+/', ' ', $header));
        foreach ($fields as $field) {
            if (preg_match('/([^:]+): (.+)/m', $field, $match)) {
                $match[1] = preg_replace_callback('/(?<=^|[\x09\x20\x2D])./', function ($matches) {
                    return strtoupper($matches[0]);
                }, strtolower(trim($match[1])));
                if (isset($retval[$match[1]])) {
                    $retval[$match[1]] = array($retval[$match[1]], $match[2]);
                } else {
                    $retval[$match[1]] = trim($match[2]);
                }
            } else if (preg_match('!HTTP/1\.\d (\d)* .!', $field)) {
                $retval["status"] = $field;
            } else {
                $content .= $field . "\r\n";
            }
        }
        $retval['content'] = $content;

        return $retval;
    }

    /**
     * Generate token
     *
     * @param int $length
     * @return string
     */
    private function generateToken($length)
    {
        $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!"§$%&/()=[]{}';

        $useChars = array();
        // select some random chars:
        for ($i = 0; $i < $length; $i++) {
            $useChars[] = $characters[mt_rand(0, strlen($characters) - 1)];
        }
        // Add numbers
        array_push($useChars, rand(0, 9), rand(0, 9), rand(0, 9));
        shuffle($useChars);
        $randomString = trim(implode('', $useChars));
        $randomString = substr($randomString, 0, self::TOKEN_LENGHT);

        return base64_encode($randomString);
    }

    /**
     * Generate token
     *
     * @param int $length
     * @return string
     */
    public function generateAlphaNumToken($length)
    {
        $characters = str_split('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

        srand((float)microtime() * 1000000);

        $token = '';

        do {
            shuffle($characters);
            $token .= $characters[mt_rand(0, (count($characters) - 1))];
        } while (strlen($token) < $length);

        return $token;
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
     * @param Connection $socket
     * @return self
     */
    public function setSocket(Connection $socket)
    {
        $this->socket = $socket;
        return $this;
    }

    /**
     * @return Connection
     */
    public function getSocket()
    {
        return $this->socket;
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
     * @param string $key
     * @return self
     */
    public function setKey($key)
    {
        $this->key = (string)$key;
        return $this;
    }

    /**
     * @return string
     */
    public function getKey()
    {
        return $this->key;
    }

    /**
     * @param string $path
     * @return self
     */
    public function setPath($path)
    {
        $this->path = $path;
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
     * @param WebSocketClientInterface $client
     * @return self
     */
    public function setClient(WebSocketClientInterface $client)
    {
        $this->client = $client;
        return $this;
    }

    /**
     * @return WebSocketClientInterface
     */
    public function getClient()
    {
        return $this->client;
    }

    /**
     * @param StreamSelectLoop $loop
     * @return self
     */
    public function setLoop(StreamSelectLoop $loop)
    {
        $this->loop = $loop;
        return $this;
    }

    /**
     * @return StreamSelectLoop
     */
    public function getLoop()
    {
        return $this->loop;
    }

    /**
     * @param $payload
     * @param string $type
     * @param bool $masked
     * @return bool|string
     */
    private function hybi10Encode($payload, $type = 'text', $masked = true)
    {
        $frameHead = array();
        $frame = '';
        $payloadLength = strlen($payload);

        switch ($type) {
            case 'text':
                // first byte indicates FIN, Text-Frame (10000001):
                $frameHead[0] = 129;
                break;

            case 'close':
                // first byte indicates FIN, Close Frame(10001000):
                $frameHead[0] = 136;
                break;

            case 'ping':
                // first byte indicates FIN, Ping frame (10001001):
                $frameHead[0] = 137;
                break;

            case 'pong':
                // first byte indicates FIN, Pong frame (10001010):
                $frameHead[0] = 138;
                break;
        }

        // set mask and payload length (using 1, 3 or 9 bytes)
        if ($payloadLength > 65535) {
            $payloadLengthBin = str_split(sprintf('%064b', $payloadLength), 8);
            $frameHead[1] = ($masked === true) ? 255 : 127;
            for ($i = 0; $i < 8; $i++) {
                $frameHead[$i + 2] = bindec($payloadLengthBin[$i]);
            }

            // most significant bit MUST be 0 (close connection if frame too big)
            if ($frameHead[2] > 127) {
                $this->close(1004);
                return false;
            }
        } elseif ($payloadLength > 125) {
            $payloadLengthBin = str_split(sprintf('%016b', $payloadLength), 8);
            $frameHead[1] = ($masked === true) ? 254 : 126;
            $frameHead[2] = bindec($payloadLengthBin[0]);
            $frameHead[3] = bindec($payloadLengthBin[1]);
        } else {
            $frameHead[1] = ($masked === true) ? $payloadLength + 128 : $payloadLength;
        }

        // convert frame-head to string:
        foreach (array_keys($frameHead) as $i) {
            $frameHead[$i] = chr($frameHead[$i]);
        }

        if ($masked === true) {
            // generate a random mask:
            $mask = array();
            for ($i = 0; $i < 4; $i++) {
                $mask[$i] = chr(rand(0, 255));
            }

            $frameHead = array_merge($frameHead, $mask);
        }
        $frame = implode('', $frameHead);
        // append payload to frame:
        for ($i = 0; $i < $payloadLength; $i++) {
            $frame .= ($masked === true) ? $payload[$i] ^ $mask[$i % 4] : $payload[$i];
        }

        return $frame;
    }

    /**
     * @param $data
     * @return null|string
     */
    private function hybi10Decode($data)
    {
        if (empty($data)) {
            return null;
        }

        $bytes = $data;
        $dataLength = '';
        $mask = '';
        $coded_data = '';
        $decodedData = '';
        $secondByte = sprintf('%08b', ord($bytes[1]));
        $masked = ($secondByte[0] == '1') ? true : false;
        $dataLength = ($masked === true) ? ord($bytes[1]) & 127 : ord($bytes[1]);

        if ($masked === true) {
            if ($dataLength === 126) {
                $mask = substr($bytes, 4, 4);
                $coded_data = substr($bytes, 8);
            } elseif ($dataLength === 127) {
                $mask = substr($bytes, 10, 4);
                $coded_data = substr($bytes, 14);
            } else {
                $mask = substr($bytes, 2, 4);
                $coded_data = substr($bytes, 6);
            }
            for ($i = 0; $i < strlen($coded_data); $i++) {
                $decodedData .= $coded_data[$i] ^ $mask[$i % 4];
            }
        } else {
            if ($dataLength === 126) {
                $decodedData = substr($bytes, 4);
            } elseif ($dataLength === 127) {
                $decodedData = substr($bytes, 10);
            } else {
                $decodedData = substr($bytes, 2);
            }
        }

        return $decodedData;
    }
}
