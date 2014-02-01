<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Ratchet\App;
use Ratchet\Session\SessionProvider;
use lib\ApiWebSocketServer;
use lib\PeerServer;
use lib\PeerHttpServer;
use lib\JsonConfig;
use \SessionHandler;

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

echo 'Starting WebSocket server...'."\n";

$apiServer = new ApiWebSocketServer;
$peerServer = new PeerServer($hostname, $port);
$peerHttpServer = new PeerHttpServer($peerServer);
$sessionHandler = new SessionHandler;

$app = new App($hostname, $port, '0.0.0.0'); // 0.0.0.0 to accept remote connections

//Webos' API. Accessible from the same origin only
$app->route('/api', new SessionProvider($apiServer, $sessionHandler)); 

//PeerJS server. Accessible from all origins
$app->route('/peerjs', new SessionProvider($peerServer, $sessionHandler), array('*'));
$app->route('/peerjs/id', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/id', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/offer', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/candidate', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/answer', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/leave', $peerHttpServer, array('*'));

$app->run(); //Start the server