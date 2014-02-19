Webos.require('/usr/lib/nautilus/nautilus.js', function() {
	if (args.isParam(0)) {
		var dir = args.getParam(0);
	} else {
		var dir = '~';
	}
	new NautilusWindow(dir);
});
