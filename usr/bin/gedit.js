var that = this, args = that.getArguments();

Webos.require('/usr/lib/gedit/gedit.js', function () {
	var file;

	if (args.isParam(0)) {
		file = Webos.File.get(args.getParam(0));
	}

	new GEditWindow(file);
});