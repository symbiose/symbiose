Webos.ScriptFile.load('/usr/lib/gnome-screensaver/gnome-screensaver.js'); //On charge la bibliotheque

var activate = !((args.isOption('d') || args.isOption('deactivate')) && !(args.isOption('a') || args.isOption('activate')));
var lockScreen = (args.isOption('l') || args.isOption('lock'));

if (lockScreen) {
	if (activate) {
		GnomeScreenSaver.lock();
	}
} else {
	GnomeScreenSaver.setStatus(activate);
}

this.stop();