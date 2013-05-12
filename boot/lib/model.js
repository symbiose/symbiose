/**
 * A model of data.
 * @constructor
 * @augments {Webos.Observable}
 * @since 1.0alpha1
 */
Webos.Model = function WModel() {
	Webos.Observable.call(this);
	
	this._initialize.apply(this, arguments);
};
Webos.Model.prototype = {
	/**
	 * Initialize this model.
	 * @param  {Object} data The data.
	 * @constructs
	 * @private
	 */
	_initialize: function(data) {
		this._data = {};
		this._unsynced = {};

		this.hydrate(data);
	},
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
	 * @deprecated Since 1.0 alpha 1, use {@link Model#get}.
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
		return _.clone(this._data);
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
	 * @deprecated Use {@link Webos.Model#has} instead.
	 */
	exists: function(key) {
		return this.has(key);
	},
	/**
	 * Check if a key exists in the model's data.
	 * @param key The key.
	 * @returns {Boolean} True if the key exists, false otherwise.
	 */
	has: function(key) {
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
	 * @deprecated Use {@link Webos.Model#unset} instead.
	 */
	remove: function(key) {
		return this.unset(key);
	},
	/**
	 * Remove a value in the model's data.
	 * @param key The key associated to the value.
	 * @returns {Boolean} True if there was no error, false otherwise.
	 */
	unset: function(key) {
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
	 * @deprecated Use {@link Webos.Model#_unset} instead.
	 */
	_remove: function(key) {
		return this._unset(key);
	},
	/**
	 * Remove a value in the internal model's data.
	 * @param key The key associated to the value.
	 * @private
	 */
	_unset: function(key) {
		this._unsynced[key] = { value: undefined, state: 1 };
	},
	/**
	 * Get changed data's keys.
	 * @return {String[]} Keys corresponding to changed values.
	 */
	changedKeys: function() {
		var keys = [];
		var nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				keys.push(key);
			}
		}

		return keys;
	},
	/**
	 * Get changed data.
	 * @return {Object} Changed data.
	 */
	changedData: function() {
		var changedKeys = this.changedKeys();
		var changedData = {};

		for (var i = 0; i < changedKeys.length; i++) {
			var key = changedKeys[i];

			changedData[key] = this._unsynced[key].value;
		}

		return changedData;
	},
	/**
	 * Check if this model's data has changed since the last update.
	 * @param  {String}  [key] If specified, checks if the value corresponding to the key has changed.
	 * @return {Boolean}       True if the data has changed, false otherwise.
	 */
	hasChanged: function(key) {
		if (typeof key != 'undefined') {
			if (!this._unsynced[key]) {
				return false;
			}

			return (this._unsynced[key].state == 1);
		} else {
			return (!_.isEmpty(this._unsynced));
		}
	},
	/**
	 * Get the changed value corresponding to a key.
	 * @param  {String} key The key.
	 * @return              The changed value.
	 */
	getChanged: function(key) {
		if (!this.hasChanged(key)) {
			return;
		}

		return this._unsynced[key].value;
	},
	/**
	 * Mark changed data as going to be saved.
	 * @return {String[]} Keys corresponding to changed values.
	 */
	_stageChanges: function() {
		var changedKeys = this.changedKeys();

		for (var i = 0; i < changedKeys.length; i++) {
			var key = changedKeys[i];

			this._unsynced[key].state = 2;
		}

		return changedKeys;
	},
	/**
	 * Propagate changed values.
	 * @param  {String[]} changedKeys Changed keys.
	 */
	_propagateChanges: function(changedKeys) {
		for (var i = 0; i < changedKeys.length; i++) {
			var key = changedKeys[i];

			this._data[key] = this._unsynced[key].value;
			delete this._unsynced[key];
			this.trigger('update', { key: key, value: this.get(key) });
		}
	},
	/**
	 * Fetch this model's data from the server.
	 * @returns {Webos.ServerCall} The server call.
	 */
	fetch: function() {
		return this.load.apply(this, arguments);
	},
	/**
	 * Fetch this model's data from the server.
	 * @deprecated Use {@link Webos.Model#fetch} instead.
	 */
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.error();
	},
	/**
	 * Save modifications on this model.
	 * @param {Webos.Callback} callback The callback.
	 */
	save: function() {
		return this.sync.apply(this, arguments);
	},
	/**
	 * Save modifications on this model.
	 * @param {Webos.Callback} callback The callback.
	 * @deprecated Use {@link Webos.Model#save} instead.
	 */
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.error();
	}
};
Webos.inherit(Webos.Model, Webos.Observable);
