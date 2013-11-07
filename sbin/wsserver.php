<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use lib\ApiWebSocketServer;

set_time_limit(0);

$serverConfigFilePath = '/etc/websocket-server.json';
$serverConfigFile = new \lib\JsonConfig('./' . $serverConfigFilePath);
$serverConfig = $serverConfigFile->read();

$enabled = (isset($serverConfig['enabled'])) ? $serverConfig['enabled'] : false;

if (!$enabled) {
	exit('Cannot start WebSocket server: server is not enabled in '.$serverConfigFilePath);
}

$port = (isset($serverConfig['port'])) ? $serverConfig['port'] : 9000;

$server = IoServer::factory(
	new HttpServer(
		new WsServer(
			new ApiWebSocketServer()
		)
	),
	$port
);

$server->run();