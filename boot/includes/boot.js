$(function() { //Lorsque tout est pret
	if (!jQuery.support.ajax) {
		alert('Votre navigateur ne supporte pas ajax, le webos ne peut donc pas demarrer. Veuillez le mettre a jour.');
		return;
	}
	
	if (!window.Webos) {
		window.Webos = {};
		window.W = window.Webos;
	}
	
	//On charge les bibliotheques de base
	Webos.Script.load('boot/lib/inherit.js');
	Webos.Script.load('boot/lib/observer.js');
	Webos.Script.load('boot/lib/error.js');
	Webos.Script.load('boot/lib/model.js');
	Webos.Script.load('boot/lib/callback.js');
	Webos.Script.load('boot/lib/servercall.js');
	Webos.ScriptFile.load(
		'/boot/lib/uniqueid.js',
		'/boot/lib/process.js',
		'/boot/lib/cmd.js',
		'/boot/lib/user.js',
		'/boot/lib/file.js',
		'/boot/lib/ui.js',
		'/boot/lib/css.js',
		'/boot/lib/loadimage.js',
		'/boot/lib/xml.js'
	);
	
	var actualLocation = window.location.href;
	var locationArray = actualLocation.split('/');
	var page = locationArray.pop();
	
	var ui = null;
	if (/\?ui=[a-zA-Z0-9-_.]&?/.test(page)) {
		ui = page.replace(/\?ui=([a-zA-Z0-9-_.])&?/, '$1');
	}
	if (/^[a-zA-Z0-9-_.]+\.html$/.test(page)) {
		ui = page.replace(/^([a-zA-Z0-9-_.]+)\.html$/, '$1');
	}
	
	//On affiche l'interface utilisateur (UI) par defaut
	W.UserInterface.load(ui);
});