Webos.Model = function WModel(data) {
	Webos.Observable.call(this);
	
	this._data = {};
	this._dataSyncState = {};
	
	this.hydrate(data);
	this._dataSyncState = {};
};
Webos.Model.prototype = {
	hydrate: function(data) {
		for (var key in data) {
			this.set(key, data[key]);
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
			return this._data[key];
		}
	},
	getAttribute: function(key) {
		return this.get(key);
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
			this._dataSyncState[key] = 1;
			return this[methodName](value);
		}
		
		this._dataSyncState[key] = 1;
		this._data[key] = value;
		return true;
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
		this._dataSyncState = {};
		callback.success();
	}
};
Webos.inherit(Webos.Model, Webos.Observable);