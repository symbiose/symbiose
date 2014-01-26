var that = this, args = that.getArguments();

Webos.require('/usr/lib/gnome-music/webos.js', function () {
	if (args.isParam(0)) {
		var file = Webos.File.get(args.getParam(0));
		GnomeMusic.open({
			file: file
		});
	} else {
		GnomeMusic.open();
	}
});