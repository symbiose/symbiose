new W.ScriptFile('usr/lib/nautilus/nautilus.js');

if (args.isParam(0)) {
	var dir = args.getParam(0);
} else {
	var dir = '~';
}
new NautilusWindow(dir);