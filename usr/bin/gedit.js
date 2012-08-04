new W.ScriptFile('usr/lib/gedit/gedit.js');

if (args.isParam(0)) {
	W.File.load(args.getParam(0), new W.Callback(function(file) {
		new GEditWindow(file);
	}, function(response) {
		new GEditWindow();
		response.triggerError('Impossible d\'ouvrir le fichier');
	}));
} else {
	new GEditWindow();
}