var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	var params = args.getParams();

	term.echo(params.join(' '));
	proc.stop();
})();