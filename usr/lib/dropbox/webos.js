/**
 * Integration de Dropbox dans la bibliotheque du webos.
 * @author $imon
 * @since 1.0 beta 1
 */

Webos.ScriptFile.load('/usr/lib/dropbox/dropbox.js'); //On charge la bibliotheque native

/**
 * Represente un fichier de Dropbox.
 * @param {Object} data Les données sur le fichier.
 * @borrows Webos.File#load as this.load
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.DropboxFile = function(data, point) {
	this._mountPoint = point;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.DropboxFile.prototype = {
	hydrate: function(data) {
		if (data.path) {
			data.dropboxpath = data.path;
			data.path = this.get('mountPoint').getWebosPath(data.dropboxpath);
		}

		if (data.bytes) {
			data.size = data.bytes;
		}

		data.readable = true;
		data.writable = true;

		return Webos.File.prototype.hydrate.call(this, data);
	},
	mountPoint: function() {
		return this._mountPoint;
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		return dropbox.getMetadata(this.get('dropboxpath'), [function(data) {
			that._updateData(data);

			callback.success(that);
		}, callback.error]);
	},
	realpath: function() {
		return dropbox.getFileURL(this.get('dropboxpath'));
	},
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (newName.indexOf('/') != -1) {
			callback.error('Le nom d\'un fichier ne peut pas contenir le caract&egrave;re "/"');
		}
		
		var dest = this.get('mountPoint').getRelativePath(this.get('dirname') + '/' + newName);
		
		return dropbox.moveItem(this.get('dropboxpath'), dest, [function(data) {
			that._updateData(data);

			callback.success();
		}, callback.error]);
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		return dropbox.deleteItem(this.get('dropboxpath'), [function() {
			that._remove();

			callback.success();
		}, callback.error]);
	},
	readAsText: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		}

		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}

		return dropbox.getFile(this.get('dropboxpath'), [function(contents) {
			that._contents = contents;

			callback.success(contents);

			that.notify('updatecontents', { contents: contents });
			Webos.File.notify('load', { file: that });
		}, callback.error]);
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}
		
		if (this.get('is_dir')) {
			return dropbox.getFolderContents(this.get('dropboxpath'), [function(data) {
				var list = [];
				for (var i = 0; i < data.length; i++) {
					var dropboxFile = new Webos.DropboxFile(data[i], that.get('mountPoint'));
					var file = Webos.File.get(dropboxFile.get('path'));
					if (Webos.isInstanceOf(file, Webos.DropboxFile)) {
						file._updateData(dropboxFile.data());
					} else {
						file._updateData({
							is_dir: dropboxFile.get('is_dir'),
							mime_type: dropboxFile.get('mime_type')
						});
					}
					list.push(file);
				}

				that._contents = list;

				callback.success(list);

				that.notify('updatecontents', { contents: list });
				Webos.File.notify('load', { file: that });
			}, callback.error]);
		} else {
			return this.readAsText(callback);
		}
	},
	getContents: function(callback) {
		return this.contents(callback);
	},
	writeAsText: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		}
		
		return dropbox.uploadFile(this.get('dropboxpath'), contents, [function(data) {
			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(data);

			callback.success();
		}, callback.error]);
	},
	setContents: function(contents, callback) {
		return this.writeAsText(contents, callback);
	}
};
Webos.inherit(Webos.DropboxFile, Webos.File); //Héritage de Webos.File

Webos.DropboxFile.mount = function(point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!point.get('data')) {
		dropbox.setup([function() {
			point.set('data', {
				requestToken: dropbox.getData('requestToken'),
				requestTokenSecret: dropbox.getData('requestTokenSecret'),
				accessToken: dropbox.getData('accessToken'),
				accessTokenSecret: dropbox.getData('accessTokenSecret')
			});
			callback.success(point);
		}, callback.error]);
	} else {
		var data = point.get('data');
		dropbox.storeData('requestToken', data.requestToken);
		dropbox.requestToken = data.requestToken;
		dropbox.storeData('requestTokenSecret', data.requestTokenSecret);
		dropbox.requestTokenSecret = data.requestTokenSecret;
		dropbox.storeData('accessToken', data.accessToken);
		dropbox.accessToken = data.accessToken;
		dropbox.storeData('accessTokenSecret', data.accessTokenSecret);
		dropbox.accessTokenSecret = data.accessTokenSecret;
		dropbox.setup([function() {
			callback.success(point);
		}, callback.error]);
	}
};

Webos.DropboxFile.get = function(file, point, data) {
	path = String(file);
	
	if (file instanceof Webos.DropboxFile) { //Si c'est déja un objet Webos.DropboxFile, on le retourne directement
		return file;
	} else { //Sinon, on crée un nouvel objet
		return new Webos.DropboxFile($.extend({}, data, {
			path: point.getRelativePath(path)
		}), point);
	}
};

Webos.DropboxFile.load = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);

	var file = Webos.DropboxFile.get(path, point);

	return file.load([function(file) {
		callback.success(file);
	}, callback.error]);
};

Webos.DropboxFile.createFile = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return dropbox.uploadFile(point.getRelativePath(path), '', [function(data) {
		var file = Webos.DropboxFile.get(path, point);
		file._updateData(data);
		callback.success(file);
	}, callback.error]);
};

Webos.DropboxFile.createFolder = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return dropbox.createFolder(point.getRelativePath(path), [function(data) {
		var file = Webos.DropboxFile.get(path, point);
		file._updateData(data);
		callback.success(file);
	}, callback.error]);
};

Webos.DropboxFile.copy = function(source, dest, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return dropbox.copyItem(point.getRelativePath(source), point.getRelativePath(dest), [function(data) {
		callback.success(data);
	}, callback.error]);
};

Webos.DropboxFile.move = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return dropbox.moveItem(point.getRelativePath(source), point.getRelativePath(dest), [function(data) {
		callback.success(data);
	}, callback.error]);
};

Webos.File.registerDriver('DropboxFile', {
	title: 'Dropbox',
	icon: 'applications/dropbox',
	lib: '/usr/lib/dropbox/webos.js'
});
