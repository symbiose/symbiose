var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	if (!args.isParam(0)) {
		term.echo('mkdir: usage: mkdir dirname');
		proc.stop();
		return;
	}

	var path = term.absolutePath(args.getParam(0));

	Webos.File.createFolder(path, [function () {
		proc.stop();
	}, function (resp) {
		resp.triggerError();
		proc.stop();
	}]);
})();