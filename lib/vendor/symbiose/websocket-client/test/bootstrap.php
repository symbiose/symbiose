<?php

$vendor = realpath(__DIR__ . '/../vendor');

if (file_exists($vendor . "/autoload.php")) {
    require $vendor . "/autoload.php";
} else {
    $vendor = realpath(__DIR__ . '/../../../');
    if (file_exists($vendor . "/autoload.php")) {
        require $vendor . "/autoload.php";
    } else {
        throw new Exception("Unable to load dependencies");
    }
}

require_once __DIR__ . "/Server.php";
require_once __DIR__ . "/Client.php";
require_once __DIR__ . "/../src/WebSocketClient/Autoloader.php";
WebSocketClient\Autoloader::register();