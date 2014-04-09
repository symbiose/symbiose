var proc = this, args = proc.getArguments(), term = proc.getTerminal();

Webos.require('/usr/lib/broadway/webos.js', function () {
	var opts = {};
	if (args.isOption('H') || args.isOption('host')) {
		opts.host = args.getOption('H') || args.getOption('host');
	}

	Webos.broadway.connect(opts);

	proc.one('stop', function () {
		Webos.broadway.disconnect();
	});
});