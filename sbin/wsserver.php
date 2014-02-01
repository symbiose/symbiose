<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Ratchet\App;
use Ratchet\Session\SessionProvider;
use lib\ApiWebSocketServer;
use lib\PeerServer;
use lib\JsonConfig;
//use lib\LocalSessionHandler;
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

$app = new App($hostname, $port, '0.0.0.0'); // 0.0.0.0 to accept remote connections
$app->route('/api', new SessionProvider($apiServer, new SessionHandler)); //Webos' API. Accessible from the same origin only
$app->route('/peerjs', $peerServer, array('*')); //PeerJS server. Accessible from all origins
//$app->route('/peerjs/{id}/{token}/id', $peerServer, array('*'));
$app->run(); //Start the server