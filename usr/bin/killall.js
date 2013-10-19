var that = this;

(function() {
	var args = that.getArguments(), term = that.getTerminal();

	var nameToKill = args.getParam(0);

	var processesList = Webos.Process.listAll();

	var killedNbr = 0;
	for (var i = 0; i < processesList.length; i++) {
		var currentProcess = processesList[i];

		if (currentProcess.cmd === nameToKill) {
			currentProcess.stop();
			killedNbr++;
		}
	}

	if (!nameToKill) {
		term.echo('killall: usage: killall name');
	}
	if (!killedNbr) {
		term.echo('"'+nameToKill+'": no process found');
	}

	that.stop();
})();