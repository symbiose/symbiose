var process = this;

Webos.User.logout(function() {
	process.getTerminal().echo('logout');
	process.stop();
});