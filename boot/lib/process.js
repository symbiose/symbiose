Webos.Process = function WProcess(options) {
	this.pid = options.pid;
	//var key = options.key;
	this.authorizations = options.authorizations;
	if (typeof options.args != 'undefined') { //Si les arguments ne sont pas vides
		this.args = options.args;
	}

	this._state = 0; // 0 -> ready; 1 -> running; 2 -> idle; 3 -> killed.
	this.main = new Function('args', options.fn);

	if (typeof this.pid != 'undefined') {
		Webos.Process.list[this.pid] = this;
	}

	Webos.Observable.call(this);
};
Webos.Process.prototype = {
	main: function() {},
	getPid: function() {
		return this.pid;
	},
	getAuthorizations: function() {
		return this.authorizations;
	},
	run: function() {
		if (this.state() != 'ready') {
			return;
		}
		
		var args = this.args;
		if (typeof args == 'undefined') {
			args = new Webos.Arguments();
		}
		
		this._state = 1;
		Webos.Process.stack.push(this);

		this.notify('start');
		Webos.Process.notify('start', {
			process: this
		});
		
		try {
			this.main(args);
		} catch(error) {
			Webos.Error.catchError(error);
		}
		
		Webos.Process.stack.pop();
		
		if (this.state() != 'killed') {
			this._state = 2;

			this.notify('idle');
			Webos.Process.notify('idle', {
				process: this
			});
		}
	},
	stop: function() {
		if (this.state() != 'running' && this.state() != 'idle') {
			return;
		}

		this._state = 3;

		this.notify('stop');
		Webos.Process.notify('stop', {
			process: this
		});

		delete Webos.Process.list[this.getPid()];
		delete this;
	},
	state: function() {
		var states = ['ready', 'running', 'idle', 'killed'];

		return states[this._state];
	},
	isRunning: function() {
		return (this._state == 1 || this._state == 2);
	},
	toString: function() {
		return '[WProcess #'+this.pid+']';
	}
};
Webos.inherit(Webos.Process, Webos.Observable);

Webos.Process.list = {};
Webos.Process.stack = [];
Webos.Process.get = function(pid) {
	return Webos.Process.list[pid];
};
Webos.Process.current = function() {
	return Webos.Process.stack[Webos.Process.stack.length - 1];
};

Webos.Observable.build(Webos.Process);


Webos.Authorizations = function WAuthorizations(authorizations) {
	this.authorizations = (authorizations) ? authorizations : [];
	
	this.can = function(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				return true;
			}
		}
		return false;
	};
	this.get = function() {
		return this.authorizations;
	};
	this.set = function(auth) {
		if (auth != this.authorizations) {
			this.authorizations = auth;
		}
	};
	this.add = function(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				return;
			}
		}
		
		this.authorizations.push(auth);
	};
	this.remove = function(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				delete this.authorizations[i];
			}
		}
	};
	this.model = function(value) {
		var compareArraysFn = function(a, b) {
			if (a.length != b.length) {
				return false;
			}
			
			for (var i = 0; i < a.length; i++) {
				if (a[i] != b[i]) {
					var found = false;
					for (var j = 0; j < b.length; j++) {
						if (a[i] == b[j]) {
							found = true;
						}
					}
					if (!found) {
						return false;
					}
				}
			}
			return true;
		};
		
		if (typeof value == 'undefined') { //GETTER
			for (var index in Webos.Authorizations.models) {
				if (compareArraysFn(Webos.Authorizations.models[index], this.authorizations)) {
					return index;
				}
			}
			return 'select';
		} else { //SETTER
			if (typeof Webos.Authorizations.models[value] == 'undefined') {
				return false;
			}
			
			if (compareArraysFn(Webos.Authorizations.models[value], this.authorizations)) {
				return true;
			}
			
			this.authorizations = Webos.Authorizations.models[value];
			
			return true;
		}
	};
};
Webos.Authorizations.all = ['file.user.read',
                       'file.user.write',
                       'file.home.read',
                       'file.home.write',
                       'file.system.read',
                       'file.system.write',
                       'user.read',
                       'user.edit',
                       'user.manage',
                       'package.read',
                       'package.write',
                       'package.checked.manage',
                       'package.unchecked.manage'];
Webos.Authorizations.models = {
	'user': ['file.user.read',
             'file.user.write',
             'package.read',
             'package.checked.manage'],
    'admin': Webos.Authorizations.all,
    'guest': ['file.user.read']
};