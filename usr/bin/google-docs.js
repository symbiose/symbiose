var that = this;

var file;
if (args.isParam(0)) {
	file = args.getParam(0);
}

Webos.require('/usr/lib/google-docs/webos.js', function() {
	new GoogleDocsWindow(file);
});