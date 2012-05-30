Webos.Model = function WModel(data) {
	Webos.Observable.call(this);
	
	this._data = {};
	this._unsynced = {};
	
	this.hydrate(data);
};
Webos.Model.prototype = {
	hydrate: function(data) {
		for (var key in data) {
			this._data[key] = data[key];
		}
	},
	get: function(key) {
		if (typeof this[key] == 'function') {
			return this[key]();
		}
		var methodName = 'get' + key.charAt(0).toUpperCase() + key.substr(1);
		if (typeof this[methodName] == 'function') {
			return this[methodName]();
		}
		if (typeof this._data[key] != 'undefined') {
			return this._get(key);
		}
	},
	getAttribute: function(key) {
		return this.get(key);
	},
	_get: function(key) {
		return this._data[key];
	},
	data: function() {
		return this._data;
	},
	set: function(key, value) {
		var methodName = 'set' + key.charAt(0).toUpperCase() + key.substr(1);
		if (this.exists(key) && this.get(key) === value) {
			return true;
		}
		if (typeof this[methodName] == 'function') {
			this._set(key, value);
			return this[methodName](value);
		}
		
		this._set(key, value);
		return true;
	},
	_set: function(key, value) {
		this._unsynced[key] = { value: value, state: 1 };
	},
	exists: function(key) {
		var methodName = 'get' + key.charAt(0).toUpperCase() + key.substr(1);
		if (typeof this[methodName] == 'function') {
			return true;
		}
		if (typeof this._data[key] != 'undefined') {
			return true;
		}
		return false;
	},
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		this._unsynced = {};
		callback.success();
	}
};
Webos.inherit(Webos.Model, Webos.Observable);