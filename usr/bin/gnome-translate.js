new W.ScriptFile('usr/lib/gnome-translate/gnome-translate.js');

if (args.isParam(0)) {
	W.File.load(args.getParam(0), new W.Callback(function(file) {
		new GnomeTranslateWindow(file);
	}, function(response) {
		new GnomeTranslateWindow();
		response.triggerError('Impossible d\'ouvrir le fichier');
	}));
} else {
	new GnomeTranslateWindow();
}