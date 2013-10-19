var that = this;

(function() {
	var args = that.getArguments(), term = that.getTerminal();

	var table = '<table><tr><th>PID</th><th>TTY</th><th>ALIVE_TIME</th><th>CMD</th></tr>';

	var processesList = Webos.Process.listAll();
	for (var i = 0; i < processesList.length; i++) {
		var currentProcess = processesList[i];

		var processLine = '<tr>';

		processLine += '<td>'+currentProcess.getPid()+'</td>' +
			'<td>'+currentProcess.getTerminal().getId()+'</td>' +
			'<td>'+((new Date()).getTime() - currentProcess.startTime())+'</td>' +
			'<td>'+ ((currentProcess.cmd) ? currentProcess.cmd : '') +'</td>';

		processLine += '</tr>';

		table += processLine;
	}

	table += '</table>';

	term.echo(table);

	that.stop();
})();