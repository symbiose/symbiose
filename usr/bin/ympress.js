Webos.require('/usr/lib/ympress/webos.js', function() {
	if (args.isParam(0)) {
		W.File.load(args.getParam(0), [function(file) {
			Ympress.open(file);
		}, function(response) {
			Ympress.open();
			response.triggerError('Impossible d\'ouvrir le fichier');
		}]);
	} else {
		Ympress.open();
	}
});