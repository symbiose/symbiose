Webos.Process = function WProcess(options) {
	this.pid = options.pid;
	//var key = options.key;
	this.args = new W.Arguments();
	if (typeof options.args != 'undefined') { //Si les arguments ne sont pas vides
		this.args = options.args;
	}
	
	this.running = false;
	this.main = new Function('args', options.fn);
	Webos.Process.list[this.pid] = this;
};
Webos.Process.prototype = {
	main: function() {},
	getPid: function() {
		return this.pid;
	},
	run: function() {
		if (this.running) {
			return;
		}
		
		this.running = true;
		Webos.Process.stack.push(this);
		
		try {
			this.main(this.args);
		} catch(error) {
			Webos.Error.catchError(error);
		}
		
		Webos.Process.stack.pop();
	},
	stop: function() {
		this.running = false;
		delete Webos.Process.list[this.getPid()];
		delete this;
	},
	toString: function() {
		return '[WProcess #'+this.pid+']';
	}
};

Webos.Process.list = {};
Webos.Process.stack = [];
Webos.Process.get = function(pid) {
	return Webos.Process.list[pid];
};
Webos.Process.current = function() {
	return Webos.Process.stack[Webos.Process.stack.length - 1];
};