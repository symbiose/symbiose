Webos.File = function WFile(data) {
	Webos.Model.call(this, data);
};
Webos.File.prototype = {
	_reloadData: function(userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		Webos.File.clearCache(that.getAttribute('path'));
		Webos.File.get(that.getAttribute('path'), new Webos.Callback(function(file) {
			var updatedData = {};
			for (var key in file.data()) {
				if (this.get(key) !== file.data()[key]) {
					updatedData[key] = file.data()[key];
				}
			}
			that.hydrate(updatedData);
			userCallback.success(that);
			for (var key in updatedData) {
				that.notify('update', { key: key, value: updatedData[key] });
			}
		}, function(response) {
			userCallback.error(response, that);
		}));
	},
	rename: function(newName, userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function() {
			that.data.path = that.getAttribute('dirname')+'/'+newName;
			that._reloadData(userCallback.error);
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'rename',
			arguments: {
				file: that.getAttribute('path'),
				newName: newName
			}
		}).load(callback);
	},
	move: function(dest, userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function() {
			that.notify('remove');
			delete that;
			userCallback.success(dest);
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				file: that.getAttribute('path'),
				dest: dest.getAttribute('path')
			}
		}).load(callback);
	},
	remove: function(userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function() {
			that.notify('remove');
			delete that;
			userCallback.success();
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'delete',
			arguments: {
				file: that.getAttribute('path')
			}
		}).load(callback);
	},
	getContents: function(userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function(response) {
			userCallback.success(response.getStandardChannel(), that);
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getContents',
			arguments: {
				file: that.getAttribute('path')
			}
		}).load(callback);
	},
	setContents: function(contents, userCallback) {
		var that = this;
		userCallback = Webos.Callback.toCallback(userCallback);
		
		var callback = new Webos.Callback(function(response) {
			userCallback.success(that);
		}, function(response) {
			userCallback.error(response, that);
		});
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'setContents',
			arguments: {
				file: that.getAttribute('path'),
				contents: contents
			}
		}).load(callback);
	}
};
Webos.inherit(Webos.File, Webos.Model);

Webos.File.cache = {};
Webos.File.get = function(path, userCallback) {
	userCallback = Webos.Callback.toCallback(userCallback);
	
	if (typeof Webos.File.cache[path] != 'undefined') {
		userCallback.success(Webos.File.cache[path]);
	} else {
		var callback = new Webos.Callback(function(response) {
			var file = new Webos.File(response.getData());
			
			if (typeof Webos.File.cache[file.getAttribute('path')] != 'undefined') {
				Webos.File.cache[file.getAttribute('path')].hydrate(file.data());
				file = Webos.File.cache[file.getAttribute('path')];
			} else {
				Webos.File.cache[file.getAttribute('path')] = file;
			}
			
			userCallback.success(file);
		}, function(response) {
			userCallback.error(response);
		});
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				file: path
			}
		}).load(callback);
	}
};
Webos.File.listDir = function(path, userCallback) {
	userCallback = Webos.Callback.toCallback(userCallback);
	
	var callback = new Webos.Callback(function(response) {
		var data = response.getData();
		var list = [];
		for(var key in data) {
			var file = new Webos.File(data[key]);
			if (typeof Webos.File.cache[file.getAttribute('path')] != 'undefined') {
				Webos.File.cache[file.getAttribute('path')].hydrate(file.data());
				file = Webos.File.cache[file.getAttribute('path')];
			} else {
				Webos.File.cache[file.getAttribute('path')] = file;
			}
			list.push(file);
		}
		userCallback.success(list);
	}, function(response) {
		userCallback.error(response);
	});
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'getContents',
		arguments: {
			dir: path
		}
	}).load(callback);
};
Webos.File.createFile = function(path, userCallback) {
	userCallback = Webos.Callback.toCallback(userCallback);
	
	var callback = new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File.cache[file.getAttribute('path')] = file;
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
		Webos.File.cache[file.getAttribute('path')] = file;
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
		Webos.File.cache = {};
	} else {
		delete Webos.File.cache[path];
	}
};
Webos.File.cleanPath = function(path) {
	return path
		.replace(/\/+/, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/');
};
Webos.File.bytesToSize = function(bytes) {
	var sizes = [ 'octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio' ];
	if (bytes == 0 || bytes == 1)
		return bytes+' octet';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return ((i == 0) ? (bytes / Math.pow(1024, i))
			: (bytes / Math.pow(1024, i)).toFixed(1))
			+ ' ' + sizes[i];
};