new W.ScriptFile('/usr/lib/firefox/firefox.js');

var url;
if (args.isParam(0)) {
	url = args.getParam(0);

	if (!/^[a-z]:\/\//.test(url)) {
		url = W.File.get(url);
	}
}
new FirefoxWindow(url);