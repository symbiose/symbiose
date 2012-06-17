//Executer une commande
Webos.Cmd = function WCmd(options) {
	this.cmdText = options.cmd;
	this.cmd = this.cmdText.split(' ').shift();
	this.terminal = options.terminal;
	
	Webos.Process.call(this, {
		args: Webos.Arguments.parse(options.cmd)
	});
};
Webos.Cmd.prototype = {
	getTerminal: function() {
		return this.terminal;
	},
	run: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		new Webos.ServerCall({
			'class': 'CmdController',
			'method': 'execute',
			'arguments': { 'cmd': this.cmdText, 'terminal': this.terminal.getId() }
		}).load(new Webos.Callback(function(response) {
			if (!response.isJavascriptEmpty()) { //Si il y a du code JS a executer
				//On l'execute
				var data = response.getData();
				
				var auth = new Webos.Authorizations();
				for (var index in data.authorizations) {
					auth.add(data.authorizations[index]);
				}
				
				Webos.Process.call(that, {
					pid: data.pid,
					key: data.key,
					authorizations: auth,
					fn: response.getJavascript()
				});
				Webos.Cmd.uber.run.call(that);
				
				callback.success(response, that);
			} else {
				callback.success(response);
			}
		}, function(response) {
			callback.error(response);
		}));
	}
};
Webos.inherit(Webos.Cmd, Webos.Process);

Webos.Cmd.execute = function(cmd, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.Terminal(new Webos.Callback(function(terminal) {
		terminal.enterCmd(cmd, callback);
	}, function(response) {
		callback.error(response);
	}));
};

Webos.Terminal = function WTerminal(userCallback) {
	this._data = {};
	
	var that = this;
	
	this.enterCmd = function(cmd, callback) {
		this.cmd = new Webos.Cmd({
			cmd: cmd,
			terminal: this
		});
		this.cmd.run(Webos.Callback.toCallback(callback));
		return this.cmd;
	};
	
	this.getId = function() {
		return this.id;
	};
	
	this.data = function(index) {
		if (typeof index == 'undefined') {
			return this._data;
		} else {
			return this._data[index];
		}
	};
	this.get = function(key) {
		return this._data[key];
	};
	this.relativePath = function(path, callback) {
		callback.success(this.get('location')+'/'+path);
	};
	
	this.init = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'TerminalController',
			method: 'register',
			arguments: { terminal: that.getId() }
		}).load(new Webos.Callback(function(response) {
			that._data = response.getData();
			
			callback.success(that);
		}, function(response) {
			callback.error(response);
		}));
	};
	this.refreshData = function(callback) {
		new Webos.ServerCall({
			'class': 'TerminalController',
			method: 'getPromptData',
			arguments: { 'terminal': this.getId() }
		}).load(new Webos.Callback(function(response) {
			that._data = response.getData();
			
			callback.success(that);
		}, callback.error));
	};
	
	this.id = Webos.Terminal.register(this);
	
	this.init(userCallback);
};
Webos.Terminal.list = [];
Webos.Terminal.register = function(terminal) {
	return Webos.Terminal.list.push(terminal) - 1;
};
Webos.Terminal.get = function(id) {
	return Webos.Terminal.list[id];
};