window.onload = function () { //When the window is loaded
	if (!jQuery.support.ajax) { //If browser doesn't support ajax
		alert('Your web browser doesn\'t support ajax, the webos cannot start, please update it.');
		return;
	}

	Webos.getQueryParam = function (name) {
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
		return (results === null) ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	};

	Webos.buildWebosUrl = function (options) {
		var queryParamsList = [];
		for (var optName in options) {
			queryParamsList.push(optName+'='+options[optName]);
		}
		var queryParams = '?'+queryParamsList.join('&');

		var loc = window.location;
		return loc.origin + loc.pathname + queryParams;
	};

	//URL analysis
	var actualLocation = window.location.href;
	var locationArray = actualLocation.split('/');
	var page = locationArray.pop();

	//Is the UI to load specified ?
	var ui = '';
	if (/^[a-zA-Z0-9-_.]+\.html$/.test(page)) {
		ui = page.replace(/^([a-zA-Z0-9-_.]+)\.html$/, '$1');
	} else {
		ui = Webos.getQueryParam('ui');
	}

	//Now we can load the UI
	W.UserInterface.load(ui, function() {
		var appToLaunchName = Webos.getQueryParam('app');
		if (appToLaunchName) {
			Webos.require('/usr/lib/webos/applications.js', function() {
				Webos.Application.get(appToLaunchName, [function(appToLaunch) {
					if (!appToLaunch) {
						return;
					}

					Webos.Cmd.execute(appToLaunch.get('command'));
				}, function() {}]);
			});
		}
	});
};