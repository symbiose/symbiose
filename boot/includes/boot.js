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
		
		//Is the UI to load specified ?
		var ui = null;
		if (/\?ui=[a-zA-Z0-9-_.]&?/.test(page)) {
			ui = page.replace(/\?ui=([a-zA-Z0-9-_.])&?/, '$1');
		}
		if (/^[a-zA-Z0-9-_.]+\.html$/.test(page)) {
			ui = page.replace(/^([a-zA-Z0-9-_.]+)\.html$/, '$1');
		}
		
		//Now we can load the UI
		W.UserInterface.load(ui);
	});
});