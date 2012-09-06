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
	data.dropboxpath = data.path;
	data.path = point.getWebosPath(data.dropboxpath);
	
	if (data.bytes) {
		data.size = data.bytes;
	}
	
	data.readable = true;
	data.writable = true;
	
	this._mountPoint = point;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.DropboxFile.prototype = {
	mountPoint: function() {
		return this._mountPoint;
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.DropboxFile.load(this.get('path'), this.get('mountPoint'), function(file) {
			var updatedData = {};
			for (var key in file.data()) {
				if (key == 'path') {
					continue;
				}
				if (that.get(key) !== file.data()[key]) {
					updatedData[key] = file.data()[key];
				}
			}
			that.hydrate(updatedData);
			callback.success(that);
			for (var key in updatedData) {
				that.notify('update', { key: key, value: updatedData[key] });
			}
		});
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
		
		dropbox.moveItem(this.get('dropboxpath'), dest, [function() {
			that.hydrate({
				dropboxpath: dest,
				path: that.get('mountPoint').getWebosPath(dest)
			});
			that.load([function() {
				callback.success();
			}, callback.error]);
		}, callback.error]);
	},
	move: function(dest, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		dest = String(dest);
		
		dropbox.moveItem(this.get('dropboxpath'), this.get('mountPoint').getRelativePath(dest,  this.get('base')), [function() {
			that._remove();
			callback.success();
		}, callback.error]);
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		dropbox.deleteItem(this.get('dropboxpath'), [function() {
			that._remove();
			callback.success();
		}, callback.error]);
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			dropbox.getFolderContents(this.get('dropboxpath'), [function(data) {
				var list = [];
				for(var i = 0; i < data.length; i++) {
					var file = new Webos.DropboxFile(data[i], that.get('mountPoint'));
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
				callback.success(list);
			}, callback.error]);
		} else {
			dropbox.getFile(this.get('dropboxpath'), [function(contents) {
				callback.success(contents);
			}, callback.error]);
		}
	},
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			callback.error();
		}
		
		dropbox.uploadFile(this.get('dropboxpath'), contents, [function() {
			callback.success();
		}, callback.error]);
	}
};
Webos.inherit(Webos.DropboxFile, Webos.File); //Héritage de Webos.File

Webos.DropboxFile.init = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.setup(callback);
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
	
	dropbox.getMetadata(point.getRelativePath(path), [function(data) {
		var file = new Webos.DropboxFile(data, point);
		
		callback.success(file);
	}, callback.error]);
};

Webos.DropboxFile.createFile = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.uploadFile(point.getRelativePath(path), '', [function(data) {
		var file = Webos.DropboxFile.get(path, base, data);
		callback.success(file);
	}, callback.error]);
};

Webos.DropboxFile.createFolder = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.createFolder(point.getRelativePath(path), [function(data) {
		var file = Webos.DropboxFile.get(path, base, data);
		callback.success(file);
	}, callback.error]);
};

Webos.File.registerDriver('DropboxFile', {
	title: 'Dropbox',
	icon: '/usr/share/images/dropbox/icon_48.png',
	lib: '/usr/lib/dropbox/webos.js'
});
