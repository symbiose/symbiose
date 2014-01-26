var that = this, args = that.getArguments();

Webos.require('/usr/lib/gconf/gconf.js', function () {
	if (args.isOption('category')) {
		console.log(args.getOption('category'));
		new GConf(args.getOption('category'));
	} else {
		new GConf();
	}
});