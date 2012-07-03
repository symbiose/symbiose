/**
 * Integration de Dropbox dans la bibliotheque du webos.
 * @author $imon
 * @since 1.0 beta 1
 */

Webos.ScriptFile.load('/usr/lib/dropbox/dropbox.js');

/**
 * Represente un fichier de Dropbox.
 * @param {Object} data Les données sur le fichier.
 * @borrows Webos.File#load as this.load
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.DropboxFile = function(data, base) {
	data.dropboxpath = data.path;
	data.path = Webos.DropboxFile.getWebosPath(data.dropboxpath, base);
	
	if (data.bytes) {
		data.size = data.bytes;
	}
	
	this._base = base;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.DropboxFile.prototype = {
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.DropboxFile.load(this.get('path'), this.get('base'), function(file) {
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
	base: function() {
		return this._base;
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
		
		var dest = Webos.DropboxFile.getDropboxPath(this.get('dirname') + '/' + newName, this.get('base'));
		
		dropbox.moveItem(this.get('dropboxpath'), dest, function() {
			that.hydrate({
				dropboxpath: dest,
				path: Webos.DropboxFile.getWebosPath(dest, that.get('base'))
			});
			that.load([function() {
				callback.success();
			}, function(response) {
				callback.error(response);
			}]);
		});
	},
	move: function(dest, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		dest = String(dest);
		
		dropbox.moveItem(this.get('dropboxpath'), Webos.DropboxFile.getDropboxPath(dest), function() {
			that._remove();
			callback.success();
		});
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		dropbox.deleteItem(this.get('dropboxpath'), function() {
			that._remove();
			callback.success();
		});
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			dropbox.getFolderContents(this.get('dropboxpath'), function(data) {
				var list = [];
				for(var i = 0; i < data.length; i++) {
					var file = new Webos.DropboxFile(data[i], that.get('base'));
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
				callback.success(list);
			});
		} else {
			dropbox.getFile(this.get('dropboxpath'), function(contents) {
				callback.success(contents, that);
			});
		}
	},
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			callback.error();
		}
		
		dropbox.uploadFile(this.get('dropboxpath'), contents, function() {
			callback.success();
		});
	}
};
Webos.inherit(Webos.DropboxFile, Webos.File); //Héritage de Webos.File

Webos.DropboxFile.init = function() {
	dropbox.setup();
};

Webos.DropboxFile.get = function(file, base, data) {
	path = String(file);
	
	if (file instanceof Webos.DropboxFile) { //Si c'est déja un objet Webos.DropboxFile, on le retourne directement
		return file;
	} else { //Sinon, on crée un nouvel objet
		return new Webos.DropboxFile($.extend({}, data, {
			path: Webos.DropboxFile.getDropboxPath(path, base)
		}), base);
	}
};

Webos.DropboxFile.load = function(path, base, callback) {
	path = Webos.DropboxFile.getDropboxPath(path);
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.getMetadata(Webos.DropboxFile.getDropboxPath(path, base), function(data) {
		var file = new Webos.DropboxFile(data, base);
		
		//On le stocke dans le cache
		if (typeof Webos.File._cache[file.get('path')] != 'undefined') {
			Webos.File._cache[file.get('path')].hydrate(file.data());
			file = Webos.File._cache[file.get('path')];
		} else {
			Webos.File._cache[file.get('path')] = file;
		}
		
		callback.success(file);
	});
};

Webos.DropboxFile.createFile = function(path, base, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.uploadFile(Webos.DropboxFile.getDropboxPath(path, base), '', function(data) {
		var file = Webos.DropboxFile.get(path, base, data);
		callback.success(file);
	});
};

Webos.DropboxFile.createFolder = function(path, base, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.createFolder(Webos.DropboxFile.getDropboxPath(path, base), function(data) {
		var file = Webos.DropboxFile.get(path, base, data);
		callback.success(file);
	});
};

/**
 * Recuperer le chemin par rapport au dossier de Dropbox a partir d'un chemin absolu.
 * @param {String} path Le chemin absolu.
 * @param {String} base Le chemin  de la racine du volume.
 * @returns {String} Le chemin relatif par rapport au dossier de Dropbox.
 * @static
 */
Webos.DropboxFile.getDropboxPath = function(path, base) {
	return String(path).replace(base.replace(/\/.+/, ''), Webos.File.getMountData(base).remote);
};
/**
 * Recuperer le chemin absolu a partir d'un chemin par relatif par rapport au dossier de Dropbox.
 * @param {String} path Le chemin relatif par rapport au dossier de Dropbox.
 * @param {String} base Le chemin  de la racine du volume.
 * @returns {String} path Le chemin absolu.
 * @static
 */
Webos.DropboxFile.getWebosPath = function(path, base) {
	return String(path).replace(Webos.File.getMountData(base).remote.replace(/\/.+/, ''), base);
};

Webos.File.registerDriver('DropboxFile', {
	title: 'Dropbox',
	icon: '/usr/share/images/dropbox/icon_48.png'
});
