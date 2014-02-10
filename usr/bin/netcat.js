var process = this;

var args = process.getArguments(), term = process.getTerminal();

term.echo('netcat is not available on this system.');
term.echo('\nUse webcat instead.');
process.stop();