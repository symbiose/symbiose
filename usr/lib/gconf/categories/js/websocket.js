var $confWindow = args.getParam(0);
var $content = $confWindow.window('content');

$confWindow.window('dialog', true).window('loading', true);

Webos.require('/usr/lib/webos/data.js', function() {
	$confWindow.window('loading', false);

	var tabs = $.w.tabs().appendTo($content);

	//Server status
	var $currentStatus = $.w.container();
	tabs.tabs('tab', 'Status', $currentStatus);

	var $currentStatusText = $.w.label().appendTo($currentStatus);

	var $startServerBtn = $.w.button('Start server').click(function() {
		startServer();
	}).appendTo($currentStatus);
	var $stopServerBtn = $.w.button('Stop server').click(function() {
		stopServer();
	}).appendTo($currentStatus);
	var $restartServerBtn = $.w.button('Restart server').click(function() {
		restartServer();
	}).appendTo($currentStatus);

	//Server config
	var $config = $.w.container();
	tabs.tabs('tab', 'Configuration', $config);

	var $noConfig = $.w.label('Cannot change WebSocket server config: server not supported.').appendTo($config);

	var $form = $.w.entryContainer().appendTo($config);

	var controls = {
		enabled: $.w.switchButton('Enable the WebSocket server'),
		autoStart: $.w.switchButton('Start automatically the WebSocket server if not running'),
		port: $.w.numberEntry('Server port: '),
		protocol: $.w.selectButton('Protocol: ', { ws: 'ws (unsecure connection)', wss: 'wss (secure connection)' })
	};

	for (var controlName in controls) {
		controls[controlName].appendTo($form);
	}

	var $btns = $.w.buttonContainer().appendTo($form);
	var $applyBtn = $.w.button('Update config').click(function() {
		updateConfig();
	}).appendTo($btns);

	//protocol
	if (window.location.protocol != 'https:') {
		controls.protocol.selectButton('option', 'disabled', true);
	}

	var displayServerControls = function(serverStatus) {
		if (!serverStatus.supported || !serverStatus.enabled) {
			$startServerBtn.hide();
			$stopServerBtn.hide();
			$restartServerBtn.hide();
		} else if (serverStatus.started) {
			$startServerBtn.hide();
			$stopServerBtn.show();
			$restartServerBtn.show();
		} else {
			$startServerBtn.show();
			$stopServerBtn.hide();
			$restartServerBtn.hide();
		}
	};

	var startServer = function() {
		$confWindow.window('loading', true, {
			message: 'Starting server...'
		});
		Webos.ServerCall.websocket.startServer(function() {
			$confWindow.window('loading', false);
			refreshServerStatus();
		});
	};

	var stopServer = function() {
		$confWindow.window('loading', true, {
			message: 'Stopping server...'
		});
		Webos.ServerCall.websocket.stopServer(function() {
			$confWindow.window('loading', false);
			refreshServerStatus();
		});
	};

	var restartServer = function() {
		$confWindow.window('loading', true, {
			message: 'Restarting server...'
		});
		Webos.ServerCall.websocket.restartServer(function() {
			$confWindow.window('loading', false);
			refreshServerStatus();
		});
	};

	var displayConfig = function(serverStatus) {
		for (var controlName in controls) {
			if (typeof serverStatus[controlName] != 'undefined') {
				controls[controlName][$.webos.widget.get(controls[controlName])]('value', serverStatus[controlName]);
			}
		}
	};

	var updateConfig = function() {
		$confWindow.window('loading', true, {
			message: 'Updating configuration...'
		});

		Webos.DataFile.loadSystemData('websocket-server', function(configFile) {
			for (var controlName in controls) {
				configFile.set(controlName, controls[controlName][$.webos.widget.get(controls[controlName])]('value'));
			}

			configFile.sync(function() {
				$confWindow.window('loading', false);
				displayConfig(configFile.data());
			});
		});
	};

	var displayStatus = function(msg, isErr) {
		var iconName = (isErr) ? 'status/warning' : 'status/info';
		var $icon = $.w.icon(iconName, 32).css('float', 'left');

		$currentStatusText.empty().append($icon, '<strong>'+msg+'</strong>');
	};

	var gotServerStatus = function(serverStatus) {
		displayServerControls(serverStatus);

		if (!serverStatus.supported) {
			displayStatus('This server doesn\'t support WebSockets.', true);
			$noConfig.show();
			$form.hide();
			return;
		}

		$noConfig.hide();
		$form.show();
		displayConfig(serverStatus);

		if (!serverStatus.enabled) {
			displayStatus('WebSocket server disabled.', true);
			return;
		}

		if (serverStatus.started) {
			displayStatus('Server started and listening at port '+serverStatus.port+'.');
		} else {
			displayStatus('Server not started.');
		}
	};

	var refreshServerStatus = function() {
		$confWindow.window('loading', true, {
			message: 'Loading server status...'
		});
		Webos.ServerCall.websocket.getServerStatus(function(serverStatus) {
			$confWindow.window('loading', false);
			gotServerStatus(serverStatus);
		});
	};

	refreshServerStatus();
});