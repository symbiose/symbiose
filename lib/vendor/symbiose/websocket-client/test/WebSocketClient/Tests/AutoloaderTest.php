<?php

namespace WebSocketClient\Tests;

use PHPUnit_Framework_TestCase;
use WebSocketClient;
use WebSocketClient\Autoloader;

class AutoloaderTest extends PHPUnit_Framework_TestCase
{
    public function testAutoload()
    {
        $this->assertNull(Autoloader::autoload('Foo'), 'WebSocketClient\\Autoloader::autoload() is trying to load classes outside of the WebSocketClient namespace');
        $this->assertTrue(Autoloader::autoload('WebSocketClient'), 'WebSocketClient\\Autoloader::autoload() failed to autoload the WebSocketClient class');
    }
}