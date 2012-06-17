Webos.Process = function WProcess(options) {
	this.pid = options.pid;
	//var key = options.key;
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
		
		var args = this.args;
		if (typeof args == 'undefined') {
			args = new Webos.Arguments();
		}
		
		this.running = true;
		Webos.Process.stack.push(this);
		
		try {
			this.main(args);
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


Webos.Authorizations = function WAuthorizations(authorizations) {
	this.authorizations = authorizations;
	
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
	this.set = function(auth, userCallback) {
		if (typeof userCallback == 'undefined') {
			userCallback = new Webos.Callback();
		}
		
		if (auth != this.authorizations) {
			this.authorizations = auth;
			this.save(userCallback);
		} else {
			userCallback.success();
		}
	};
	this.add = function(auth, userCallback) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				return;
			}
		}
		
		this.authorizations.push(auth);
		
		this.save(userCallback);
	};
	this.remove = function(auth, userCallback) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				delete this.authorizations[i];
				this.save(userCallback);
			}
		}
		
		userCallback.success();
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
                       'user.write',
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