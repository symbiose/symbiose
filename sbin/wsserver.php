<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Ratchet\App;
use lib\ApiWebSocketServer;
use lib\PeerServer;

use Symfony\Component\Routing\Route;
use Ratchet\WebSocket\WsServer;

set_time_limit(0);

$serverConfigFilePath = '/etc/websocket-server.json';
$serverConfigFile = new \lib\JsonConfig('./' . $serverConfigFilePath);
$serverConfig = $serverConfigFile->read();

$enabled = (isset($serverConfig['enabled'])) ? $serverConfig['enabled'] : false;

if (!$enabled) {
	exit('Cannot start WebSocket server: server is not enabled in '.$serverConfigFilePath);
}

$port = (isset($serverConfig['port'])) ? $serverConfig['port'] : 9000;

$apiServer = new ApiWebSocketServer;
$peerServer = new PeerServer;

$app = new App('localhost', $port);
$app->route('/api', $apiServer);
$app->route('/peerjs', $peerServer);
$app->run();