<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use \Memcache;
use Ratchet\App;
use Ratchet\Session\SessionProvider as RatchetSessionProvider;
use lib\ApiWebSocketServer;
use lib\PeerServer;
use lib\PeerHttpServer;
use lib\JsonConfig;
use lib\SessionProvider;
use lib\ctrl\api\PeerController;

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

echo 'Starting WebSocket server at '.$hostname.':'.$port.'...'."\n";

//Sessions
$sessionProvider = new SessionProvider;
$sessionHandler = $sessionProvider->handler();

//Servers
$apiServer = new ApiWebSocketServer;
$peerServer = new PeerServer($hostname, $port);
$peerHttpServer = new PeerHttpServer($peerServer); //HTTP servers doesn't support SessionProvider

//Provide the peer server to the associated controller
PeerController::setPeerServer($peerServer);

$app = new App($hostname, $port, '0.0.0.0'); // 0.0.0.0 to accept remote connections

//Webos' API. Accessible from the same origin only
$app->route('/api', new RatchetSessionProvider($apiServer, $sessionHandler));

//PeerJS server. Accessible from all origins
$app->route('/peerjs', new RatchetSessionProvider($peerServer, $sessionHandler), array('*'));
$app->route('/peerjs/id', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/id', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/offer', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/candidate', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/answer', $peerHttpServer, array('*'));
$app->route('/peerjs/{id}/{token}/leave', $peerHttpServer, array('*'));

$app->run(); //Start the server