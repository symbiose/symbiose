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

$hostnames = (isset($serverConfig['hostname'])) ? $serverConfig['hostname'] : 'localhost';
if (!is_array($hostnames)) {
	$hostnames = array($hostnames);
}

$port = (isset($serverConfig['port'])) ? $serverConfig['port'] : 9000;

echo 'Starting WebSocket server at '.$hostnames[0].':'.$port.'...'."\n";

//Sessions
$sessionProvider = new SessionProvider;
$sessionHandler = $sessionProvider->handler();

//Servers
$apiServer = new RatchetSessionProvider(new ApiWebSocketServer, $sessionHandler);
$peerServer = new PeerServer($hostnames[0], $port);
$decoratedPeerServer = new RatchetSessionProvider($peerServer, $sessionHandler);
$peerHttpServer = new PeerHttpServer($peerServer); //HTTP servers don't support SessionProvider

//Provide the peer server to the associated controller
PeerController::setPeerServer($peerServer);

// Bind to 0.0.0.0 to accept remote connections
// See http://socketo.me/docs/troubleshooting
$app = new App($hostnames[0], $port, '0.0.0.0');

foreach ($hostnames as $host) {
	//Webos' API. Accessible from the same origin only
	$app->route('/api', $apiServer, array(), $host);

	//PeerJS server. Accessible from all origins
	$app->route('/peerjs', $decoratedPeerServer, array('*'), $host);
	$app->route('/peerjs/id', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/id', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/offer', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/candidate', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/answer', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/leave', $peerHttpServer, array('*'), $host);
}

$app->run(); //Start the server