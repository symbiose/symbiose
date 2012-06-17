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
		if (!Webos.User.logged) {
			return;
		}
		
		return (this.id() == Webos.User.logged);
	},
	getAuthorizations: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		if (typeof this._authorizations != 'undefined') {
			callback.success(this._authorizations);
			return;
		}
		
		var that = this;

		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'getAuthorizations',
			'arguments': {
				'user': this.id()
			}
		}).load(new Webos.Callback(function(response) {
			var data = response.getData();
			var auth = [];
			for (var index in data) {
				auth.push(data[index]);
			}
			that._authorizations = new Webos.Authorizations(auth);
			callback.success(that._authorizations);
		}, callback.error));
	},
	authorizations: function(callback) {
		return this.getAuthorizations(callback);
	},
	setRealname: function(value) {
		return this._set('realname', String(value));
	},
	setUsername: function(value) {
		value = String(value).toLowerCase();
		
		if (!/^[a-z0-9_\-\.]{3,}$/.test(value)) {
			return false;
		}
		
		return this._set('username', String(value));
	},
	setPassword: function(actualPassword, newPassword, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'setPassword',
			'arguments': {
				'actualPassword': actualPassword,
				'newPassword': newPassword,
				'user': this.id()
			}
		}).load(new Webos.Callback(function(response) {
			callback.success();
			that.notify('updatepassword');
		}, function(response) {
			callback.error(response);
		}));
	},
	setAuthorizations: function(authorizations, callback) {
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'setAuthorizations',
			'arguments': {
				'authorizations': authorizations.get(),
				'user': this.id()
			}
		}).load(new Webos.Callback(function(response) {
			callback.success();
		}, function(response) {
			callback.error(response);
		}));
	},
	remove: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		new Webos.ServerCall({
			'class': 'UserController',
			'method': 'remove',
			'arguments': {
				'user': this.id()
			}
		}).load(new Webos.Callback(function(response) {
			that.notify('remove');
			delete Webos.User.cache[that.id()];
			delete that;
			callback.success(response);
		}, function(response) {
			callback.error(response);
		}));
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
					that.notify('update', { key: key, value: that._data[key].value });
				}
			}
			callback.success(that);
		}, callback.error));
	}
};
Webos.inherit(Webos.User, Webos.Model);

Webos.Observable.build(Webos.User);

Webos.User.cache = {};
Webos.User.logged = null;
Webos.User.get = function(callback, user) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!user) {
		if (!Webos.User.logged || !Webos.User.cache[Webos.User.logged]) {
			Webos.User.getLogged([function(user) {
				callback.success(user);
			}, callback.error]);
		} else {
			callback.success(Webos.User.cache[Webos.User.logged]);
		}
		return;
	}
	
	for (var id in Webos.User.cache) {
		if (Webos.User.cache[id].get('username') === user) {
			callback.success(Webos.User.cache[id]);
			return;
		}
	}
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getAttributes',
		'arguments': {
			'user': user
		}
	}).load(new Webos.Callback(function(response) {
		var data = response.getData();
		var user = new Webos.User(data.id, data);
		Webos.User.cache[user.id()] = user;
		callback.success(user);
	}, function(response) {
		callback.error(response);
	}));
};
Webos.User.getLogged = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.User.logged && Webos.User.cache[Webos.User.logged]) {
		callback.success(Webos.User.cache[Webos.User.logged]);
		return;
	}
	
	if (Webos.User.logged === false) {
		callback.success();
		return;
	}
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getLogged'
	}).load(new Webos.Callback(function(response) {
		var data = response.getData();
		if (data.id) {
			var user = new Webos.User(data.id, data);
			Webos.User.cache[user.id()] = user;
			Webos.User.logged = user.id();
			callback.success(user);
		} else {
			Webos.User.logged = false;
			callback.success();
		}
	}, callback.error));
};
Webos.User.login = function(username, password, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'connect',
		'arguments': {
			'username': username,
			'password': password
		}
	}).load(new Webos.Callback(function(response) {
		var data = response.getData();
		var user = new Webos.User(data.id, data);
		Webos.User.cache[user.id()] = user;
		Webos.User.logged = user.id();
		Webos.User.notify('login', { user: user });
		callback.success(user);
	}, callback.error));
};
Webos.User.logout = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'disconnect'
	}).load(new Webos.Callback(function(response) {
		Webos.User.logged = false;
		Webos.User.notify('logout', {});
		callback.success();
	}, callback.error));
};
Webos.User.list = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'getList'
	}).load(new Webos.Callback(function(response) {
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
		callback.success(list);
	}, callback.error));
};
Webos.User.create = function(data, auth, callback) {
	callback = Webos.Callback.toCallback(callback);
	auth = auth.get().join(';');
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'create',
		'arguments': {
			'data': data,
			'authorizations': auth
		}
	}).load(new Webos.Callback(function(response) {
		callback.success();
	}, callback.error));
};
Webos.User.register = function(data, captchaData, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'register',
		'arguments': {
			'data': data,
			'captchaData': {
				'id': captchaData.id,
				'value': captchaData.value
			}
		}
	}).load(new Webos.Callback(function(response) {
		callback.success();
	}, callback.error));
};
Webos.User._canRegister = null;
Webos.User.canRegister = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.User._canRegister === true || Webos.User._canRegister === false) {
		callback.success(Webos.User._canRegister);
		return;
	}
	
	new Webos.ServerCall({
		'class': 'UserController',
		'method': 'canRegister'
	}).load(new Webos.Callback(function(response) {
		Webos.User._canRegister = response.getData().register;
		callback.success(Webos.User._canRegister);
	}, callback.error));
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