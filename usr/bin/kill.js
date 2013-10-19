var that = this;

(function() {
	var args = that.getArguments(), term = that.getTerminal();

	var pidToKill = args.getParam(0);

	var processToKill = Webos.Process.get(parseInt(pidToKill));

	if (processToKill) {
		processToKill.stop();
	} else {
		if (!pidToKill) {
			term.echo('kill: usage: kill pid');
		} else {
			term.echo('kill: cannot find a process with id "'+pidToKill+'"');
		}
	}

	that.stop();
})();