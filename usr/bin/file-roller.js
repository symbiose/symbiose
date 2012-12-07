var that = this;

var file;
if (args.isParam(0)) {
	file = args.getParam(0);
}
Webos.require('/usr/lib/file-roller/file-roller.js', function() {
	new FileRoller(file);
});