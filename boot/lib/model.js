/**
 * A model of data.
 * @param data The data.
 * @constructor
 * @augments {Webos.Observable}
 * @since 1.0alpha1
 */
Webos.Model = function WModel(data) {
	Webos.Observable.call(this);
	
	this._data = {};
	this._unsynced = {};
	
	this.hydrate(data);
};
Webos.Model.prototype = {
	/**
	 * Set this internal model's data.
	 * @param {Object} data The data.
	 * @private
	 */
	_hydrate: function(data) {
		if (!data) {
			return;
		}
		
		for (var key in data) {
			this._data[key] = data[key];
		}
	},
	/**
	 * Set this model's data.
	 * @param {Object} data The data.
	 */
	hydrate: function(data) {
		return this._hydrate(data);
	},
	/**
	 * Get a value associated with a key in the model's data.
	 * @param key The key.
	 * @returns The value associated with the key.
	 */
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
	/**
	 * Get a value associated with a key in the model's data.
	 * @param key The key.
	 * @returns The value associated with the key.
	 * @deprecated Since 1.0 alpha 1, use Model#get().
	 */
	getAttribute: function(key) {
		return this.get(key);
	},
	/**
	 * Get a value associated with a key in the internal model's data.
	 * @param key The key.
	 * @returns The value associated with the key.
	 * @private
	 */
	_get: function(key) {
		return this._data[key];
	},
	/**
	 * Get this model's data.
	 * @returns {Object} The data.
	 */
	data: function() {
		return this._data;
	},
	/**
	 * Set a value associated with a key in the model's data.
	 * @param key The key.
	 * @param value The new value.
	 * @returns {Boolean} True if there was no error, false otherwise.
	 */
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
	/**
	 * Set a value associated with a key in the internal model's data.
	 * @param key The key.
	 * @param value The new value.
	 * @private
	 */
	_set: function(key, value) {
		this._unsynced[key] = { value: value, state: 1 };
		return true;
	},
	/**
	 * Check if a key exists in the model's data.
	 * @param key The key.
	 * @returns {Boolean} True if the key exists, false otherwise.
	 */
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
	/**
	 * Remove a value in the model's data.
	 * @param key The key associated to the value.
	 * @returns {Boolean} True if there was no error, false otherwise.
	 */
	remove: function(key) {
		var methodName = 'remove' + key.charAt(0).toUpperCase() + key.substr(1);
		if (!this.exists(key)) {
			return true;
		}
		if (typeof this[methodName] == 'function') {
			this[methodName]();
		}
		
		this._remove(key);
		return true;
	},
	/**
	 * Remove a value in the internal model's data.
	 * @param key The key associated to the value.
	 * @private
	 */
	_remove: function(key) {
		this._unsynced[key] = { value: undefined, state: 1 };
	},
	/**
	 * Commit modifications on the object.
	 * @param {Webos.Callback} callback The callback.
	 */
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		this._unsynced = {};
		callback.success();
	}
};
Webos.inherit(Webos.Model, Webos.Observable);
