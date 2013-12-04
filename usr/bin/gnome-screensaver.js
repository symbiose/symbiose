var that = this;

Webos.require('/usr/lib/gnome-screensaver/webos.js', function() {
	var activate = !((args.isOption('d') || args.isOption('deactivate')) && !(args.isOption('a') || args.isOption('activate')));
	var lockScreen = (args.isOption('l') || args.isOption('lock'));

	if (lockScreen) {
		if (activate) {
			GnomeScreenSaver.lock();
			GnomeScreenSaver.once('unlock', function() {
				that.stop();
			});
		}
	} else {
		GnomeScreenSaver.setStatus(activate);
		if (activate) {
			GnomeScreenSaver.once('deactivate', function() {
				that.stop();
			});
		} else {
			that.stop();
		}
	}
});