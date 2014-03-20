var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	if (!args.isParam(0) || !args.isParam(1)) {
		term.echo('mv: usage: mv source destination');
		proc.stop();
		return;
	}

	var srcPath = term.absolutePath(args.getParam(0)),
		dstPath = term.absolutePath(args.getParam(1)),
		src = W.File.get(srcPath),
		dst = W.File.get(dstPath);

	W.File.move(src, dst, [function () {
		proc.stop();
	}, function (resp) {
		resp.triggerError();
		proc.stop();
	}]);
})();