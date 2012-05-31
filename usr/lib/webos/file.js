Webos.File = function WFile(data) {
	data.path = Webos.File.cleanPath(data.path);
	if (!data.dirname) {
		data.dirname = data.path.replace(/\/[^\/]*\/?$/, '');
	}
	if (!data.realpath) {
		data.realpath = 'sbin/filecall.php?file='+data.path;
	}
	if (!data.basename) {
		data.basename = data.path.replace(/^.*[\/\\]/g, '');
	}
	
	Webos.Model.call(this, data);
};
Webos.File.prototype = {
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.File.clearCache(that.get('path'));
		Webos.File.load(that.get('path'), new Webos.Callback(function(file) {
			var updatedData = {};
			for (var key in file.data()) {
				if (that.get(key) !== file.data()[key]) {
					updatedData[key] = file.data()[key];
				}
			}
			that.hydrate(updatedData);
			callback.success(that);
			for (var key in updatedData) {
				that.notify('update', { key: key, value: updatedData[key] });
			}
		}, function(response) {
			callback.error(response, that);
		}));
	},
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'rename',
			arguments: {
				file: that.get('path'),
				newName: newName
			}
		}).load([function() {
			that.hydrate({
				path: that.get('dirname')+'/'+newName
			});
			that.load([function() {
				callback.success(that);
			}, function(response) {
				callback.error(response, that);
			}]);
		}, function(response) {
			callback.error(response, that);
		}]);
	},
	_remove: function() {
		this.notify('remove');
		Webos.File.notify('remove', { file: this });
		
		Webos.File.clearCache(this.get('path'));
		delete this;
	},
	move: function(dest, userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function() {
			that._remove();
			userCallback.success(dest);
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				file: that.get('path'),
				dest: dest.get('path')
			}
		}).load(callback);
	},
	remove: function(userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function() {
			that._remove();
			userCallback.success();
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'delete',
			arguments: {
				file: that.get('path')
			}
		}).load(callback);
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			new Webos.ServerCall({
				'class': 'FileController',
				method: 'getContents',
				arguments: {
					dir: this.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				var data = response.getData();
				var list = [];
				for(var key in data) {
					var file = new Webos.File(data[key]);
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
						Webos.File.notify('load', { file: file });
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
				callback.success(list);
			}, function(response) {
				callback.error(response);
			}));
		} else {
			new Webos.ServerCall({
				'class': 'FileController',
				method: 'getContents',
				arguments: {
					file: that.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				callback.success(response.getStandardChannel(), that);
			}, function(response) {
				callback.error(response, that);
			}));
		}
	},
	getContents: function(callback) {
		return this.contents(callback);
	},
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'setContents',
			arguments: {
				file: that.get('path'),
				contents: contents
			}
		}).load(new Webos.Callback(function() {
			callback.success();
		}, function(response) {
			callback.error(response);
		}));
	},
	toString: function() {
		return this.get('path');
	}
};
Webos.inherit(Webos.File, Webos.Model);

Webos.Observable.build(Webos.File);

Webos.File._cache = {};
Webos.File.get = function(file, data) {
	path = String(file);
	
	if (Webos.File._cache[path]) {
		return Webos.File._cache[path];
	} else if (file instanceof Webos.File) {
		return file;
	} else {
		return new Webos.File($.extend({}, data, {
			path: path
		}));
	}
};
Webos.File.load = function(path, callback) {
	path = String(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (typeof Webos.File._cache[path] != 'undefined') {
		callback.success(Webos.File._cache[path]);
	} else {
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				file: path
			}
		}).load(new Webos.Callback(function(response) {
			var file = new Webos.File(response.getData());
			
			if (typeof Webos.File._cache[file.getAttribute('path')] != 'undefined') {
				Webos.File._cache[file.getAttribute('path')].hydrate(file.data());
				file = Webos.File._cache[file.getAttribute('path')];
				Webos.File.notify('load', { file: file });
			} else {
				Webos.File._cache[file.getAttribute('path')] = file;
			}
			
			callback.success(file);
		}, callback.error));
	}
};
Webos.File.listDir = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path, { is_dir: true });

	file.contents([function(list) {
		callback.success(list);
	}, callback.error]);
};
Webos.File.createFile = function(path, userCallback) {
	userCallback = Webos.Callback.toCallback(userCallback);
	
	var callback = new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		userCallback.success(file);
	}, function(response) {
		userCallback.error(response);
	});
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFile',
		arguments: {
			file: path
		}
	}).load(callback);
};
Webos.File.createFolder = function(path, userCallback) {
	userCallback = Webos.Callback.toCallback(userCallback);
	
	var callback = new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		userCallback.success(file);
	}, function(response) {
		userCallback.error(response);
	});
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFolder',
		arguments: {
			file: path
		}
	}).load(callback);
};
Webos.File.clearCache = function(path) {
	if (typeof path == 'undefined') {
		Webos.File._cache = {};
	} else {
		delete Webos.File._cache[path];
	}
};
Webos.File.cleanPath = function(path) {
	return path
		.replace(/\/+/, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/')
		.replace(/(.+)\/$/, '$1');
};
Webos.File.bytesToSize = function(bytes) {
	var sizes = [ 'octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio' ];
	if (bytes <= 1)
		return bytes+' octet';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return ((i == 0) ? (bytes / Math.pow(1024, i))
			: (bytes / Math.pow(1024, i)).toFixed(1))
			+ ' ' + sizes[i];
};