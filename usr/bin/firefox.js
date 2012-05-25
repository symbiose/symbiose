new W.ScriptFile('usr/lib/firefox/firefox.js');

var url;
if (args.isParam(0)) {
	url = args.getParam(0);
}
new FirefoxWindow(url);