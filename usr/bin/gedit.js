var that = this, args = that.getArguments();

Webos.require('/usr/lib/gedit/gedit.js', function () {
	if (args.isParam(0)) {
		W.File.load(args.getParam(0), [function(file) {
			new GEditWindow(file);
		}, function(response) {
			new GEditWindow();
			response.triggerError('Unable to open the file "'+args.getParam(0)+'"');
		}]);
	} else {
		new GEditWindow();
	}
});