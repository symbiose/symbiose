//Executer une commande
Webos.Cmd = function WCmd(cmd, callback, terminal) {
	callback = W.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'CmdController',
		'method': 'execute',
		'arguments': { 'cmd': cmd, 'terminal': terminal.getId() }
	}).load(new W.Callback(function(response) {
		if (!response.isJavascriptEmpty()) { //Si il y a du code JS a executer
			//On l'execute
			var data = response.getData();
			var cmdName = cmd.split(' ').shift();
			var args = W.Arguments.parse(cmd);
			var script = new W.Process({
				pid: data.pid,
				key: data.key,
				fn: response.getJavascript(),
				cmd: cmdName,
				args: args
			});
			script.run();
			callback.success(response, script);
		} else {
			callback.success(response);
		}
	}, function(response) {
		callback.error(response);
	}));
};

Webos.Cmd.execute = function(cmd, callback) {
	callback = W.Callback.toCallback(callback);
	
	new W.Terminal(new W.Callback(function(terminal) {
		terminal.enterCmd(cmd, callback);
	}, function(response) {
		callback.error(response);
	}));
};

Webos.Terminal = function WTerminal(userCallback) {
	var that = this;
	
	this.enterCmd = function(cmd, callback) {
		this.cmd = new W.Cmd(cmd, W.Callback.toCallback(callback), this);
		return this.cmd;
	};
	
	this.getId = function() {
		return this.id;
	};
	
	this.init = function(callback) {
		callback = W.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'TerminalController',
			'method': 'register',
			'arguments': { 'terminal': that.getId() }
		}).load(new W.Callback(function() {
			callback.success(that);
		}, function(response) {
			callback.error(response);
		}));
	};
	
	this.id = W.Terminal.register(this);
	
	this.init(userCallback);
};
Webos.Terminal.list = [];
Webos.Terminal.register = function(terminal) {
	return W.Terminal.list.push(terminal) - 1;
};
Webos.Terminal.get = function(id) {
	return W.Terminal.list[id];
};