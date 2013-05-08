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
			var data = $.parseJSON(json), updatedData = {};
			for (var key in data) {
				if (that.get(key) !== data[key]) {
					updatedData[key] = data[key];
				}
			}
			that.hydrate(updatedData);
			callback.success(that);
			for (var key in updatedData) {
				that.trigger('update', { key: key, value: updatedData[key] });
			}
		}, callback.error]);
	},
	sync: function (callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		var data = {};
		var nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				var value = this._unsynced[key].value;

				data[key] = value;
				
				this._unsynced[key].state = 2;
				nbrChanges++;
			}
		}
		
		if (nbrChanges === 0) {
			callback.success(this);
			return;
		}

		var json = JSON.stringify(jQuery.extend({}, this._data, data));

		return this._file.writeAsText(json, [function() {
			for (var key in that._unsynced) {
				if (that._unsynced[key].state === 2) {
					that._data[key] = that._unsynced[key].value;
					delete that._unsynced[key];
					that.trigger('update', { key: key, value: that._data[key] });
				}
			}
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
	var file = Webos.File.get(path);

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