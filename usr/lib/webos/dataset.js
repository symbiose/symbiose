(function() {
	var DataSet = function WDataSet(file, data) {
		this._file = file;
		this._data = null;
		this._unsynced = null;

		this.hydrate(data);
	};

	DataSet.prototype = {
		_merge: function(origin, data) {
			var merged = false;

			if (typeof origin == 'object' && typeof data == 'object') {
				if (!origin instanceof Array && !data instanceof Array) {
					for (var key in data) {
						origin[key] = this._merge(origin[key], data[key]);
					}
					merged = true;
				}
			}

			if (!merged) {
				origin = data;
			}

			return origin;
		},
		_hydrate: function(data) {
			if (!data) {
				return;
			}

			this._data = this._merge(this.data(), data);
		},
		hydrate: function(data) {
			return this._hydrate(data);
		},
		data: function() {
			return this._data;
		},
		load: function(callback) {
			callback = Webos.Callback.toCallback(callback);
			var that = this, file = this._file;
			
			this._file.readAsText([function(json) {
				var content;
				try {
					content = jQuery.parseJSON(json);
				} catch (e) {
					callback.error(e);
					return;
				}

				that.hydrate(content);

				that.notify('update', { content: content });
			}, callback.error]);
		},
		sync: function() {

		}
	};

	DataSet.get = function(path) {
		var file = Webos.File.get(path);

		var dataSet = new DataSet(file);

		return dataSet;
	};
	DataSet.getUserData = function(index) {
		return DataSet.get('~/.local/etc/'+index+'.json');
	};
	DataSet.getSystemData = function(index) {
		return DataSet.get('/etc/'+index+'.json');
	};

	DataSet.load = function(path, callback) {
		callback = Webos.Callback.toCallback(callback);

		var dataSet = DataSet.get(path);

		return dataSet.load(callback);
	};
	DataSet.loadUserData = function(index, callback) {
		callback = Webos.Callback.toCallback(callback);

		var dataSet = DataSet.getUserData(index);

		return dataSet.load(callback);
	};
	DataSet.loadSystemData = function(index, callback) {
		callback = Webos.Callback.toCallback(callback);

		var dataSet = DataSet.getSystemData(index);

		return dataSet.load(callback);
	};

	Webos.DataSet = DataSet;
})();