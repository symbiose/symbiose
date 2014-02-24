var that = this;

var args = that.getArguments(), term = that.getTerminal();

W.File.get('/usr/share/docs/bash/cmds.html').readAsText([function (contents) {
	term.echo('GNU bash, version 0.1\nCommands list:'+contents.replace(/[\n\t]/g, ''));
	term.echo('To display all commands, run: ls /usr/bin');
	that.stop();
}, function (resp) {
	that.stop();
	resp.triggerError();
}]);
