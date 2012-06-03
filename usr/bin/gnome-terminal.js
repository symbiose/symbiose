//On charge la bibliotheque du terminal
new W.ScriptFile('usr/lib/gnome-terminal/gnome-terminal.js');

//On ouvre la fenetre du terminal
if (args.isParam(0)) {
	var terminalWindow = new GTerminalWindow(function() {
		terminalWindow.terminal().terminal('enterCmd', args.getParam(0));
	});
} else {
	new GTerminalWindow();
}