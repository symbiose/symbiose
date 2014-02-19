/**
 * A file containing plain data.
 * @param {Object} data The file's data.
 * @param {Webos.File} file The file.
 * @augments {Webos.Model}
 * @since 1.0beta3
 * @constructor
 */
Webos.DataFile = function WDataFile(data, file) {
	Webos.Model.call(this, data);
	
	this._file = Webos.File.get(file);
};
Webos.DataFile.prototype = {
	/**
	 * Load this file's data.
	 * @param  {Webos.Callback} callback The callback.
	 */
	load: function (callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;

		return this._file.readAsText([function(json) {
			var data;
			try {
				data = jQuery.parseJSON(json)
			} catch(jsonError) {
				callback.error(jsonError);
				return;
			}

			var updatedData = {};
			for (var key in data) {
				if (that._get(key) !== data[key]) {
					updatedData[key] = data[key];
				}
			}
			that.hydrate(updatedData);

			callback.success(that);
			for (var key in updatedData) {
				that.trigger('update', { key: key, value: updatedData[key] });
			}
		}, function(response) {
			callback.success(that);
		}]);
	},
	get: function(key) {
		return this.data()[key];
	},
	data: function() {
		var cloneArray = function(arr) {
			var clonedArr = [];

			for (var i = 0; i < arr.length; i++) {
				var value = arr[i];

				clonedArr.push(clone(value));
			}

			return clonedArr;
		};

		var cloneObject = function(obj) {
			var clonedObj = {};

			for (var key in obj) {
				var value = obj[key];

				clonedObj[key] = clone(value);
			}

			return clonedObj;
		};

		var clone = function(value) {
			if (_.isString(value) || _.isNumber(value) || _.isBoolean(value) || !value) {
				return value;
			} else if (_.isArray(value)) {
				return cloneArray(value);
			} else if (_.isObject(value)) {
				return cloneObject(value);
			} else {
				return value;
			}
		};

		return clone(this._data);
	},
	/**
	 * Set this file's data.
	 * @param {Object} newData The new data.
	 */
	setData: function(newData) {
		for (var key in newData) {
			var value = newData[key];
			this.set(key, value);
		}
	},
	sync: function (callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		if (!this.hasChanged()) {
			callback.success(this);
			return;
		}

		var json = JSON.stringify(jQuery.extend({}, this._data, this.changedData()));

		var changedKeys = this._stageChanges();

		return this._file.writeAsText(json, [function() {
			that._propagateChanges(changedKeys);

			callback.success(that);
		}, callback.error]);
	}
};
Webos.inherit(Webos.DataFile, Webos.Model); //Heritage de Webos.Model

/**
 * Get a data file.
 * @param  {String} path    The file's path.
 * @param  {Object} data    Data which will be prefilled in the data file.
 * @return {Webos.DataFile} The data file.
 */
Webos.DataFile.get = function (path, data) {
	var file = Webos.File.get(path);
	
	return new Webos.DataFile($.extend({}, data), file);
};

/**
 * Load a data file.
 * @param  {String} path    The file's path.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.DataFile.load = function (path, callback) {
	var file = Webos.DataFile.get(path);

	return file.load(callback);
};

/**
 * Load a user's data file.
 * @param  {String}         index    The file's index.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.DataFile.loadUserData = function (index, callback) {
	var path = '~/.config/'+index+'.json',
	file = Webos.File.get(path);

	callback = Webos.Callback.toCallback(callback);

	var dataFile = Webos.DataFile.get(file);

	Webos.User.getLogged(function(user) {
		if (user) {
			dataFile.load(callback);
		} else {
			callback.success(dataFile);
		}
	});
};

/**
 * Load an application's data file.
 * @param  {String}         index    The file's index.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.DataFile.loadAppData = function (index, callback) {
	return Webos.DataFile.load('/usr/etc/'+index+'.json', callback);
};

/**
 * Load a system's data file.
 * @param  {String}         index    The file's index.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.DataFile.loadSystemData = function (index, callback) {
	return Webos.DataFile.load('/etc/'+index+'.json', callback);
};