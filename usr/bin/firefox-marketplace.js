var that = this;

Webos.require('/usr/lib/firefox-marketplace/webos.js', function() {
	var onError = function(msg) {
		that.getTerminal().echo(msg);
		that.stop();
	};

	if (!args.isParam(0)) {
		onError('Error: no action specified.');
		return;
	}

	switch(args.getParam(0)) {
		case 'run':
			var appName = args.getParam(1);
			var appDataPath = '/usr/lib/firefox-marketplace/webapps/'+appName+'/webapp.json';

			//Get app data
			W.File.get(appDataPath).readAsText(function(contents) {
				var appData = $.parseJSON(contents);

				FirefoxMarketplace._runApp(appData);
			});
			break;
		default:
			onError('Error: no action specified.');
	}
});