<?php
require_once(dirname(__FILE__).'/../boot/ini.php');

use Symfony\Component\Routing\Route;
use Ratchet\App;
use Ratchet\Session\SessionProvider as RatchetSessionProvider;
use Ratchet\Http\HttpServer;
use Ratchet\Wamp\WampServer;
use lib\HttpServer as WebosHttpServer;
use lib\ApiWebSocketServer;
use lib\PeerServer;
use lib\PeerHttpServer;
use lib\JsonConfig;
use lib\SessionProvider;
use lib\ctrl\api\PeerController;
use lib\ctrl\api\WebSocketController;

set_time_limit(0); //No time limit

//Load config
$serverConfigFilePath = '/etc/websocket-server.json';
$serverConfigFile = new JsonConfig('./' . $serverConfigFilePath);
$serverConfig = $serverConfigFile->read();

// Parse arguments if run in CLI
$sapiType = php_sapi_name();
if (substr($sapiType, 0, 3) == 'cli') {
	$options = getopt('p:f', array('port:', 'force'));

	/*if (isset($options['f']) || isset($options['force'])) {
		$serverConfig['enabled'] = true;
	}*/
	if (isset($options['p']) || isset($options['port'])) {
		$serverConfig['port'] = (isset($options['p'])) ? $options['p'] : $options['port'];
	}
}

$enabled = (isset($serverConfig['enabled'])) ? $serverConfig['enabled'] : false;
if (!$enabled) { // Server not enabled
	exit('Cannot start HTTP server: server is not enabled in '.$serverConfigFilePath);
}

// Fill proc file with current pid
if (function_exists('posix_getpid')) {
	$pid = posix_getpid();
	$pidFile = dirname(__FILE__).'/../'.WebSocketController::SERVER_PID_FILE;

	$dirname = dirname($pidFile);
	if (!is_dir($dirname)) {
		mkdir($dirname, 0777, true);
	}

	file_put_contents($pidFile, $pid);
} else {
	echo 'Warning: could not determine the server process id using posix_getpid()';
}

// Determine server hostnames
$hostnames = (isset($serverConfig['hostname'])) ? $serverConfig['hostname'] : 'localhost';
if (!is_array($hostnames)) {
	if (empty($hostnames)) {
		$hostnames = '*';
	}
	$hostnames = array($hostnames);
}

$port = (isset($serverConfig['port'])) ? $serverConfig['port'] : 9000;

echo 'Starting server at '.$hostnames[0].':'.$port.'...'."\n";

//Sessions
$sessionProvider = new SessionProvider;
$sessionHandler = $sessionProvider->handler();

//Servers
$httpServer = new WebosHttpServer($sessionHandler);
$apiServer = new ApiWebSocketServer;
$decoratedApiServer = new RatchetSessionProvider(new WampServer($apiServer), $sessionHandler);
$peerServer = new PeerServer($hostnames[0], $port);
$decoratedPeerServer = new RatchetSessionProvider($peerServer, $sessionHandler);
$peerHttpServer = new PeerHttpServer($peerServer); //HTTP servers don't support SessionProvider

//Provide the peer server to the associated controller
PeerController::setPeerServer($peerServer);
PeerController::setApiServer($apiServer);

// Bind to 0.0.0.0 to accept remote connections
// See http://socketo.me/docs/troubleshooting
$app = new App($hostnames[0], $port, '0.0.0.0', null);

foreach ($hostnames as $host) {
	//Webos' API
	$app->route('/api/ws', $decoratedApiServer, array('*'), $host);

	//PeerJS server. Accessible from all origins
	$app->route('/peerjs', $decoratedPeerServer, array('*'), $host);
	$app->route('/peerjs/id', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/peers', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/id', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/offer', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/candidate', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/answer', $peerHttpServer, array('*'), $host);
	$app->route('/peerjs/{id}/{token}/leave', $peerHttpServer, array('*'), $host);

	// Built-in HTTP server
	$app->route('/', $httpServer, array('*'), $host);
	$app->route('/api', $httpServer, array('*'), $host);
	$app->route('/api/group', $httpServer, array('*'), $host);
	$app->route('/sbin/apicall.php', $httpServer, array('*'), $host); // @deprecated
	$app->route('/sbin/apicallgroup.php', $httpServer, array('*'), $host); // @deprecated
	$app->route('/sbin/rawdatacall.php', $httpServer, array('*'), $host);
	$app->route(new Route('/{ui}.html', array(), array('ui' => '[a-zA-Z0-9-_.]+')), $httpServer, array('*'), $host);
	$app->route(new Route('/{dir}/{any}', array(), array(
		'dir' => '(bin|boot|etc|home|tmp|usr|var)',
		'any' => '.*'
	)), $httpServer, array('*'), $host);
	$app->route('/webos.webapp', $httpServer, array('*'), $host);
	$app->route('/hello', $httpServer, array('*'), $host);
}

$app->run(); //Start the server