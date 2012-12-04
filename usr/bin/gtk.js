var that = this;

Webos.require('/usr/lib/gtk/webos.js', function() {
	var builder = new Gtk.Builder();

	builder.addFromFile('~/Bureau/test.ui', function() {
		var win = builder.object('add_options_dialog');
		win.window('open');
	});
});