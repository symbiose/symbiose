var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	if (!args.isParam(0)) {
		term.echo('rm: usage: rm filepath');
		proc.stop();
		return;
	}

	var path = term.absolutePath(args.getParam(0)),
		file = W.File.get(path);

	file.remove([function () {
		proc.stop();
	}, function (resp) {
		resp.triggerError();
		proc.stop();
	}]);
})();