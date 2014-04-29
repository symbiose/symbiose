var proc = this, args = proc.getArguments(), term = proc.getTerminal();

Webos.require('/usr/lib/broadway/webos.js', function () {
	term.echo('Starting broadway server...');

	Webos.broadway.startServerAndConnect().then(function (server) {
		term.echo('\nServer started, client connected.');

		proc.one('stop', function () {
			server.stopServer();
		});

		var askApp = function () {
			term.prompt(function (appName) {
				server.startApp(appName).then(function () {
					term.echo('App started.');
					askApp();
				}, function (resp) {
					resp.triggerError('Failed to start the app "'+appName+'"');
				});
			}, { label: '\nLaunch an app: ' });
		};

		askApp();
	}, function (resp) {
		resp.triggerError('Failed to start broadway server');
		proc.stop();
	});
});