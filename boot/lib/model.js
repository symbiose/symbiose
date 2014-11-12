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
		var val;
		if (typeof this[key] == 'function') {
			val = this[key]();
		} else {
			var methodName = 'get' + key.charAt(0).toUpperCase() + key.substr(1);
			if (typeof this[methodName] == 'function') {
				val = this[methodName]();
			} else if (typeof this._data[key] != 'undefined') {
				val = this._get(key);
			}
		}

		//Clone value
		if (val instanceof Array) {
			val = val.slice(0);
		}

		return val;
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
		return $.extend({}, this._data);
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
	 * Check if this model is empty.
	 * @return {Boolean} True if it's empty, false otherwise.
	 */
	isEmpty: function () {
		return (Object.keys(this._data).length === 0);
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
	 * @param {String[]} [filter] Keys that can be changed. By default, all keys can.
	 * @return {String[]} Keys corresponding to changed values.
	 */
	changedKeys: function(filter) {
		filter = filter || null;

		var keys = [];
		for (var key in this._unsynced) {
			if (filter && !~filter.indexOf(key)) {
				continue;
			}

			if (this._unsynced[key].state === 1) {
				keys.push(key);
			}
		}

		return keys;
	},
	/**
	 * Get changed data.
	 * @param {String[]} [filter] Keys that can be changed. By default, all keys can.
	 * @return {Object} Changed data.
	 */
	changedData: function(filter) {
		var changedKeys = this.changedKeys(filter);
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

			var state = this._unsynced[key].state;
			return (state == 1 || state == 2);
		} else {
			for (key in this._unsynced) {
				return true;
			}
			return false;
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
	 * @param {String[]} [filter] Keys that can be changed. By default, all keys are changed.
	 * @return {String[]} Keys corresponding to staged changes.
	 */
	_stageChanges: function(filter) {
		var changedKeys = this.changedKeys(filter);

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
	 * Unmark changed data.
	 * @param  {String[]} changedKeys Changed keys.
	 */
	_unstageChanges: function (changedKeys) {
		for (var i = 0; i < changedKeys.length; i++) {
			var key = changedKeys[i];

			this._unsynced[key].state = 1;
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
	 * @deprecated Use `sync()` instead.
	 */
	save: function() {
		return this.sync.apply(this, arguments);
	},
	/**
	 * Save modifications on this model.
	 * @param {Webos.Callback} callback The callback.
	 */
	sync: function (callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.error();
	},
	/**
	 * Save locally modifications on this model (do not push changes to the server).
	 * @param {Webos.Callback} callback The callback.
	 */
	localSync: function (callback) {
		var op = Webos.Operation.createCompleted(true);
		op.addCallbacks(callback);

		var changed = this._stageChanges();
		this._propagateChanges(changed);

		return op;
	},
	/**
	 * Try to push changes on this model to the server, if the user can do it. If he hasn't the required permission, only save changes locally.
	 * @param  {Webos.Callback} callback The callback.
	 * @return {Webos.Operation}         The operation.
	 */
	syncIfAllowed: function (callback) {
		var that = this;
		var op = Webos.Operation.create();
		op.addCallbacks(callback);

		this.sync([function () {
			op.setCompleted();
		}, function (res) {
			if (typeof res.getStatusCode == 'function' && res.getStatusCode() == 403) {
				// Save changes locally
				that.localSync([function () {
					op.setCompleted();
				}, function (res) {
					op.setCompleted(false, res);
				}]);
			} else {
				op.setCompleted(false, res);
			}
		}]);

		return op;
	}
};
Webos.inherit(Webos.Model, Webos.Observable);
