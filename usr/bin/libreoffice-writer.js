Webos.require('/usr/lib/libreoffice/writer.js', function() {
	if (args.isParam(0)) {
		W.File.load(args.getParam(0), new W.Callback(function(file) {
			new LibreOffice.Writer(file);
		}, function(response) {
			new LibreOffice.Writer();
			response.triggerError('Impossible d\'ouvrir le fichier');
		}));
	} else {
		new LibreOffice.Writer();
	}
});