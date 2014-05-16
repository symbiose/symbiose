var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	var params = args.getParams();

	var output = params.join(' ');

	if (args.isOption('e')) {
		output = args.getOption('e') + output;

		// See `man echo`
		var escapedChars = [
			['\\\\', '\\'],
			//['\\a', '\a'],
			['\\b', '\b'],
			//['\\c', '\c'],
			//['\\e', '\e'],
			//['\\f', '\f'],
			['\\n', '\n'],
			['\\r', '\r'],
			['\\t', '\t'],
			['\\v', '\v']
		];

		for (var i = 0; i < escapedChars.length; i++) {
			var escaped = escapedChars[i];

			output = output.replace(new RegExp(escaped[0].replace(/\\/g, '\\\\'), 'g'), escaped[1]);
		}
	}

	if (!args.isOption('n')) {
		output += '\n';
	} else {
		output = args.getOption('n') + output;
	}

	term.echo(output);
	proc.stop();
})();