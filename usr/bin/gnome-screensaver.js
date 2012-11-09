var that = this;

Webos.require('/usr/lib/gnome-screensaver/gnome-screensaver.js', function() {
	var activate = !((args.isOption('d') || args.isOption('deactivate')) && !(args.isOption('a') || args.isOption('activate')));
	var lockScreen = (args.isOption('l') || args.isOption('lock'));

	if (lockScreen) {
		if (activate) {
			GnomeScreenSaver.lock();
		}
	} else {
		GnomeScreenSaver.setStatus(activate);
	}

	that.stop();
});