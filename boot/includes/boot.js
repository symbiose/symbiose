$(function() { //Lorsque tout est pret
	if (!jQuery.support.ajax) {
		alert('ajax unsupported !');
	}
	
	if (!window.Webos) {
		window.Webos = {};
		window.W = window.Webos;
	}
	
	//On charge les bibliotheques de base
	new W.ScriptFile('boot/lib/inherit.js');
	new W.ScriptFile('boot/lib/observer.js');
	new W.ScriptFile('boot/lib/error.js');
	new W.ScriptFile('boot/lib/model.js');
	new W.ScriptFile('boot/lib/callback.js');
	new W.ScriptFile('boot/lib/servercall.js');
	Webos.ScriptFile.load(
		'/boot/lib/process.js',
		'/boot/lib/ui.js',
		'/boot/lib/css.js',
		'/boot/lib/uniqueid.js',
		'/boot/lib/loadimage.js',
		'/boot/lib/xml.js',
		'/boot/lib/cmd.js',
		'/boot/lib/user.js'
	);
	
	var actualLocation = window.location.href;
	var locationArray = actualLocation.split('/');
	var page = locationArray.pop();
	
	var ui;
	if (/\?ui=[a-zA-Z0-9-_.]&?/.test(page)) {
		ui = page.replace(/\?ui=([a-zA-Z0-9-_.])&?/, '$1');
	}
	if (/^[a-zA-Z0-9-_.]+\.html$/.test(page)) {
		ui = page.replace(/^([a-zA-Z0-9-_.]+)\.html$/, '$1');
	}
	
	//On affiche l'interface utilisateur (UI) par defaut
	W.UserInterface.load(ui);
});