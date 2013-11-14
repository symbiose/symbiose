$(function() { //When the window is ready
	if (!jQuery.support.ajax) { //If browser doesn't support ajax
		alert('Your web browser doesn\'t support ajax, the webos cannot start, please update it.');
		return;
	}
	
	//Load basic libraries
	Webos.Script.load('boot/lib/inherit.js');
	Webos.Script.load('boot/lib/observer.js');
	Webos.Script.load('boot/lib/error.js');
	Webos.Script.load('boot/lib/model.js');
	Webos.Script.load('boot/lib/callback.js');
	Webos.Script.load('boot/lib/operation.js');
	Webos.Script.load('boot/lib/servercall.js');

	//Webos.ServerCall library loaded, we can now use Webos.ScriptFile.load()
	Webos.ScriptFile.load(
		'/boot/lib/process.js',
		'/boot/lib/cmd.js',
		'/boot/lib/user.js',
		'/boot/lib/file.js'
	);

	//Webos.File library loaded, we can now use Webos.require()
	Webos.require([
		'/boot/lib/collection.js',
		'/boot/lib/uniqueid.js',
		'/boot/lib/ui.js',
		'/boot/lib/css.js',
		'/boot/lib/loadimage.js',
		'/boot/lib/xml.js',
		'/boot/lib/translation.js'
	], function() {
		//URL analysis
		var actualLocation = window.location.href;
		var locationArray = actualLocation.split('/');
		var page = locationArray.pop();

		var getQueryParam = function (name) {
			name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
			var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(location.search);
			return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
		};

		//Is the UI to load specified ?
		var ui = '';
		if (/^[a-zA-Z0-9-_.]+\.html$/.test(page)) {
			ui = page.replace(/^([a-zA-Z0-9-_.]+)\.html$/, '$1');
		} else {
			ui = getQueryParam('ui');
		}

		//Now we can load the UI
		W.UserInterface.load(ui, function() {
			var appToLaunchName = getQueryParam('app');
			if (appToLaunchName) {
				Webos.require('/usr/lib/webos/applications.js', function() {
					Webos.Application.get(appToLaunchName, [function(appToLaunch) {
						Webos.Cmd.execute(appToLaunch.get('command'));
					}, function() {}]);
				});
			}
		});
	});
});