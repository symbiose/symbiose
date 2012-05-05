new W.ScriptFile('usr/lib/firefox/firefox.js');

if (args.isParam(0)) {
	var url = args.getParam(0);
} else {
	var url = '~';
}
new FirefoxWindow(url);