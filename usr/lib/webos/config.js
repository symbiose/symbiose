new Webos.ScriptFile('usr/lib/webos/file.js');

Webos.ConfigFile = function WConfigFile(data, file) {
	Webos.Model.call(this, data);
	
	this._file = file;
};
Webos.ConfigFile.prototype = {
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		if (Webos.ConfigFile._cache[this._file.get('path')]) {
			callback.success(Webos.ConfigFile._cache[this._file.get('path')]);
		} else {
			new Webos.ServerCall({
				'class': 'ConfigController',
				method: 'getConfig',
				arguments: {
					path: this._file.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				var data = response.getData(), updatedData = {};
				for (var key in data) {
					if (that.get(key) !== data[key]) {
						updatedData[key] = data[key];
					}
				}
				that.hydrate(updatedData);
				callback.success(that);
				for (var key in updatedData) {
					that.notify('update', { key: key, value: updatedData[key] });
				}
			}, callback.error));
		}
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
			'class': 'ConfigController',
			method: 'setConfig',
			arguments: {
				path: this._file.get('path'),
				data: data
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
Webos.inherit(Webos.ConfigFile, Webos.Model);

Webos.ConfigFile._cache = {};
Webos.ConfigFile.get = function(path, data) {
	var file = Webos.File.get(path);
	
	if (Webos.ConfigFile._cache[file.get('path')]) {
		return Webos.ConfigFile._cache[file.get('path')];
	} else {
		return new Webos.ConfigFile($.extend({}, data), file);
	}
};
Webos.ConfigFile.load = function(path, callback) {
	var file = Webos.File.get(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.ConfigFile._cache[file.get('path')]) {
		callback.success(Webos.ConfigFile._cache[file.get('path')]);
	} else {
		new Webos.ServerCall({
			'class': 'ConfigController',
			method: 'getConfig',
			arguments: {
				path: file.get('path')
			}
		}).load(new Webos.Callback(function(response) {
			var config = new Webos.ConfigFile(response.getData(), file);
			Webos.ConfigFile._cache[file.get('path')] = config;
			callback.success(config);
		}, callback.error));
	}
};
Webos.ConfigFile.loadUserConfig = function(path, basePath, callback) {
	var file = Webos.File.get(path), baseFile = Webos.File.get(basePath);
	callback = Webos.Callback.toCallback(callback);
	
	Webos.User.getLogged(function(user) {
		if (user && Webos.ConfigFile._cache[file.get('path')]) {
			callback.success(Webos.ConfigFile._cache[file.get('path')]);
		} else if (!user && Webos.ConfigFile._cache[baseFile.get('path')]) {
			callback.success(Webos.ConfigFile._cache[baseFile.get('path')]);
		} else {
			new Webos.ServerCall({
				'class': 'ConfigController',
				method: 'getUserConfig',
				arguments: {
					path: file.get('path'),
					base: baseFile.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				var loadedFile = (user) ? file : baseFile;
				var config = new Webos.ConfigFile(response.getData(), loadedFile);
				Webos.ConfigFile._cache[loadedFile.get('path')] = config;
				callback.success(config);
			}, callback.error));
		}
	});
};