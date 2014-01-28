<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Ratchet\App;
use lib\ApiWebSocketServer;
use lib\PeerServer;
use lib\JsonConfig;

set_time_limit(0); //No time limit

//Load config
$serverConfigFilePath = '/etc/websocket-server.json';
$serverConfigFile = new JsonConfig('./' . $serverConfigFilePath);
$serverConfig = $serverConfigFile->read();

$enabled = (isset($serverConfig['enabled'])) ? $serverConfig['enabled'] : false;

if (!$enabled) { //WebSocket server not enabled
	exit('Cannot start WebSocket server: server is not enabled in '.$serverConfigFilePath);
}

$hostname = (isset($serverConfig['hostname'])) ? $serverConfig['hostname'] : 'localhost';
$port = (isset($serverConfig['port'])) ? $serverConfig['port'] : 9000;

$_SERVER['SERVER_NAME'] = $hostname; //Set global var. Useful for PeerServer

echo 'Starting WebSocket server...'."\n";

$apiServer = new ApiWebSocketServer;
$peerServer = new PeerServer;

$app = new App($hostname, $port, '0.0.0.0'); // 0.0.0.0 to accept remote connections
$app->route('/api', $apiServer); //Webos' API. Accessible from the same origin only
$app->route('/peerjs', $peerServer, array('*')); //PeerJS server. Accessible from all origins
$app->run(); //Start the server