var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	if (!args.isParam(0)) {
		term.echo('cat: usage: cat filepath');
		proc.stop();
		return;
	}

	var path = term.absolutePath(args.getParam(0)),
		file = W.File.get(path);

	file.readAsText([function (contents) {
		contents = contents.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		term.echo(contents);

		proc.stop();
	}, function (resp) {
		resp.triggerError();
		proc.stop();
	}]);
})();