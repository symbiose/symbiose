Webos.User = function WUser(id, data) {
	this._id = parseInt(id);
	Webos.Model.call(this, data);
};
Webos.User.prototype = {
	id: function() {
		return this._id;
	},
	setId: function() {
		return false;
	},
	isLogged: function() {
		return (this.id() == Webos.User.logged);
	},
	authorizations: function(userCallback) {
		userCallback = Webos.Callback.toCallback(userCallback);
		
		if (typeof this._authorizations != 'undefined') {
			userCallback.success(this._authorizations);
			return;
		}
		
		var that = this;
		
		var callback = new Webos.Callback(function(response) {
			var data = response.getData();
			var auth = [];
			for (var index in data) {
				auth.push(data[index]);
			}
			that._authorizations = new Webos.Authorizations(auth, that);
			userCallback.success(that._authorizations);
		}, userCallback.error);
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'getAuthorizations',
			'arguments': {
				'user': this.id()
			}
		}).load(callback);
	},
	setRealname: function(value) {
		this._set('realname', String(value));
	},
	setUsername: function(value) {
		value = String(value).toLowerCase();
		
		if (!/^[a-z0-9_\-\.]{3,}$/.test(value)) {
			return false;
		}
		
		this._set('username', String(value));
	},
	setPassword: function(actualPassword, newPassword, userCallback) {
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var that = this;
		
		var callback = new Webos.Callback(function(response) {
			userCallback.success(that);
			that.notify('updatepassword');
		}, function(response) {
			userCallback.error(response);
		});
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'setPassword',
			'arguments': {
				'actualPassword': actualPassword,
				'newPassword': newPassword,
				'user': this.id()
			}
		}).load(callback);
	},
	remove: function(userCallback) {
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var that = this;
		
		var callback = new Webos.Callback(function(response) {
			that.notify('remove');
			delete Webos.User.cache[that.id()];
			delete that;
			userCallback.success(response);
		}, function(response) {
			userCallback.error(response);
		});
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'remove',
			'arguments': {
				'user': this.id()
			}
		}).load(callback);
	},
	toString: function() {
		return this.get('username');
	},
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		var data = {};
		var nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				this._unsynced[key].state = 2;
				data[key] = this._unsynced[key].value;
				nbrChanges++;
			}
		}
		
		if (nbrChanges === 0) {
			callback.success(this);
			return;
		}
		
		new Webos.ServerCall({
			'class': 'UserController',
			method: 'setMultipleAttributes',
			arguments: {
				data: data,
				user: this.id()
			}
		}).load(new Webos.Callback(function() {
			for (var key in that._unsynced) {
				if (that._unsynced[key].state === 2) {
					that._data[key] = that._unsynced[key].value;
					delete that._unsynced[key];
					that.notify('update', { key: key, value: that._unsynced[key].value });
				}
			}
			callback.success(that);
		}, callback.error));
	}
};
Webos.inherit(Webos.User, Webos.Model);

Webos.User.cache = {};
Webos.User.logged = undefined;
Webos.User.defineLogged = function(userCallback) {
	var callback = new Webos.Callback(function(response) {
		var data = response.getData();
		if (data.user != null) {
			Webos.User.logged = data.user;
			userCallback.success(data.user);
		} else {
			Webos.User.logged = false;
			userCallback.success();
		}
	}, function(response) {
		userCallback.error(response);
	});
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getLoggedId'
	}).load(callback);
};
Webos.User.get = function(userCallback, user) {
	if (typeof user == 'undefined') {
		if (typeof Webos.User.logged == 'undefined') {
			var callback = new Webos.Callback(function(user) {
				if (typeof user == 'undefined') {
					userCallback.success(undefined);
				} else {
					Webos.User.get(userCallback);
				}
			}, function(response) {
				userCallback.error(response);
			});
			Webos.User.defineLogged(callback);
			return;
		} else if (Webos.User.logged === false) { 
			userCallback.success();
		} else {
			user = Webos.User.logged;
		}
	}
	
	for (var id in Webos.User.cache) {
		if (Webos.User.cache[id].get('username') === user) {
			userCallback.success(Webos.User.cache[id]);
			return;
		}
	}
	
	var callback = new Webos.Callback(function(response) {
		var data = response.getData();
		var user = new Webos.User(data.id, data);
		Webos.User.cache[user.id()] = user;
		userCallback.success(user);
	}, function(response) {
		userCallback.error(response);
	});
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getAttributes',
		'arguments': {
			'user': user
		}
	}).load(callback);
};
Webos.User.login = function(username, password, userCallback) {
	var callback = new Webos.Callback(function(response) {
		userCallback.success(response);
	}, function(response) {
		userCallback.error(response);
	});
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'connect',
		'arguments': {
			'username': username,
			'password': password
		}
	}).load(callback);
};
Webos.User.list = function(userCallback) {
	var callback = new Webos.Callback(function(response) {
		var list = response.getData();
		for (var id in list) {
			var user = new Webos.User(id, list[id]);
			if (typeof Webos.User.cache[user.id()] != 'undefined') {
				Webos.User.cache[user.id()].hydrate(list[id]);
				list[id] = Webos.User.cache[user.id()];
			} else {
				Webos.User.cache[user.id()] = user;
				list[id] = user;
			}
		}
		userCallback.success(list);
	}, function(response) {
		userCallback.error(response);
	});
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getList'
	}).load(callback);
};
Webos.User.create = function(data, auth, userCallback) {
	data = JSON.stringify(data);
	auth = auth.get().join(';');
	
	var callback = new Webos.Callback(function(response) {
		userCallback.success(response);
	}, function(response) {
		userCallback.error(response);
	});
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'create',
		'arguments': {
			'data': data,
			'authorizations': auth
		}
	}).load(callback);
};
Webos.User.evalPasswordPower = function(s) {
	var cmpx = 0;
	
	if (s.length >= 6) {
		cmpx++;
		if (s.search("[A-Z]") != -1) { cmpx++; }
		if (s.search("[0-9]") != -1) { cmpx++; }
		if (s.length >= 8 || s.search("[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]") != -1) {
			cmpx++;
		}
	}
	
	return cmpx * 25;
};

Webos.Authorizations = function WAuthorizations(authorizations, user) {
	this.user = user;
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
	this.save = function(userCallback) {
		var callback = new Webos.Callback(function(response) {
			userCallback.success(response);
		}, function(response) {
			userCallback.error(response);
		});
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'setAuthorizations',
			'arguments': {
				'authorizations': this.authorizations.join(';'),
				'user': this.user.id()
			}
		}).load(callback);
	};
	this.model = function(value, userCallback) {
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
			if (typeof userCallback == 'undefined') {
				userCallback = new Webos.Callback();
			}
			if (typeof Webos.Authorizations.models[value] == 'undefined') {
				userCallback.error();
				return;
			}
			
			if (compareArraysFn(Webos.Authorizations.models[value], this.authorizations)) {
				userCallback.success();
				return;
			}
			
			this.authorizations = Webos.Authorizations.models[value];
			
			this.save(userCallback);
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