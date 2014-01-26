Webos.require('/usr/lib/nautilus/nautilus.js', function() {
	if (args.isParam(0)) {
		var driver = args.getParam(0);
	} else {
		var driver = null;
	}
	new NautilusDeviceMounterWindow(driver);
});