Webos.require('/usr/lib/eos/eos.js', function() {
	if (args.isParam(0)) {
		new EyeOfSymbiose(Webos.File.get(args.getParam(0)));
	} else {
		new EyeOfSymbiose();
	}
});