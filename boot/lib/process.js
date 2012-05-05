Webos.Process = function WProcess(options) {
	this.getPid = function() {
		return this.pid;
	};
	this.getTerminal = function() {
		return this.terminal;
	};
	
	this.run = function() {
		this.running = true;
		
		try {
			this.main(this.args);
		} catch(error) {
			Webos.Error.catchError(error);
		}
	};
	
	this.stop = function() {
		this.running = false;
		delete Webos.Process.list[this.getPid()];
		delete this;
	};
	
	this.toString = function() {
		return '[WProcess #'+this.pid+']';
	};
	
	this.pid = options.pid;
	//var key = options.key;
	this.cmd = options.cmd;
	this.args = new W.Arguments();
	if (typeof options.args != 'undefined') { //Si les arguments sont vides
		this.args = options.args;
	}
	this.running = false;
	this.main = new Function('args', 'Webos.Process.stack.push(this);'+"\n"+options.fn+"\n"+'Webos.Process.stack.pop();');
	Webos.Process.list[this.pid] = this;
};

Webos.Process.list = {};
Webos.Process.stack = [];
Webos.Process.get = function(pid) {
	return Webos.Process.list[pid];
};
Webos.Process.current = function() {
	return Webos.Process.stack[Webos.Process.stack.length - 1];
};