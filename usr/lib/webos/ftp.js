/**
 * Integration du FTP dans la bibliotheque du webos.
 * @author $imon
 * @since 1.0 beta 1
 */

Webos.FTPFile = function WFTPFile(data, point) {
	this._mountPoint = point;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.FTPFile.prototype = {
	hydrate: function(data) {
		var point = this.get('mountPoint');

		if (data.path) {
			data.ftppath = data.path;
			data.path = point.getWebosPath(data.ftppath);
			data.realpath = 'ftp://'+point.get('data').user+':'+point.get('data').password+'@'+point.get('data').host+':'+point.get('data').port+'/'+data.ftppath;
		}
		
		data.basename = (data.basename == '.') ? null : data.basename;
		
		data.readable = (typeof data.readable == 'undefined') ? true : data.readable;
		data.writable = (typeof data.writable == 'undefined') ? true : data.writable;

		return Webos.File.prototype.hydrate.call(this, data);
	},
	mountPoint: function() {
		return this._mountPoint;
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		return new Webos.ServerCall({
			'class': 'FTPController',
			'method': 'getMetadata',
			'arguments': {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath')
			}
		}).load([function(response) {
			var data = response.getData();

			that._updateData(data);

			callback.success(that);
		}, callback.error]);
	},
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FTPController',
			method: 'rename',
			arguments: {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath'),
				newName: newName
			}
		}).load([function(response) {
			that._updateData(response.getData());
			
			callback.success(that);
		}, function(response) {
			callback.error(response, that);
		}]);
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FTPController',
			method: 'delete',
			arguments: {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath')
			}
		}).load([function() {
			that._remove();

			callback.success();
		}, function(response) {
			callback.error(response, that);
		}]);
	},
	readAsText: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (!this.checkAuthorization('read', callback)) {
			return false;
		}
		
		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}

		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		} else {
			return new Webos.ServerCall({
				'class': 'FTPController',
				'method': 'getFile',
				'arguments': {
					loginData: this.get('mountPoint').get('data'),
					file: this.get('ftppath')
				}
			}).load([function(response) {
				var contents = response.getData().contents;
				that._contents = contents;
				callback.success(contents);
			}, callback.error]);
		}
	},
	readAsBinary: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!this.checkAuthorization('read', callback)) {
			return false;
		}
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		} else {
			return new Webos.ServerCall({
				'class': 'FTPController',
				method: 'getFileAsBinary',
				arguments: {
					loginData: this.get('mountPoint').get('data'),
					file: this.get('ftppath')
				}
			}).load(new Webos.Callback(function(response) {
				var contents = response.getData().contents;
				callback.success(contents);
			}, function(response) {
				callback.error(response);
			}));
		}
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (!this.checkAuthorization('read', callback)) {
			return false;
		}
		
		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}
		
		if (this.get('is_dir')) {
			return new Webos.ServerCall({
				'class': 'FTPController',
				'method': 'getFileList',
				'arguments': {
					loginData: this.get('mountPoint').get('data'),
					dir: this.get('ftppath')
				}
			}).load([function(response) {
				var data = response.getData();
				var list = [];
				for (var i in data) {
					var ftpFile = new Webos.FTPFile(data[i], that.get('mountPoint'));
					var file = Webos.File.get(ftpFile.get('path'));
					if (Webos.isInstanceOf(file, Webos.FTPFile)) {
						file._updateData(ftpFile.data());
					} else {
						file._updateData({
							is_dir: ftpFile.get('is_dir')
						});
					}
					list.push(file);
				}
				that._contents = list;
				callback.success(list);
			}, callback.error]);
		} else {
			return this.readAsText(callback);
		}
	},
	writeAsText: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		}

		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FTPController',
			'method': 'putFile',
			'arguments': {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath'),
				contents: contents
			}
		}).load([function(response) {
			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(response.getData());

			callback.success();
		}, callback.error]);
	},
	writeAsBinary: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return false;
		}

		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FTPController',
			'method': 'putFileAsBinary',
			'arguments': {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath'),
				contents: contents
			}
		}).load([function(response) {
			that._updateData(response.getData());

			callback.success();
		}, callback.error]);
	},
	setContents: function(contents, callback) {
		return this.writeAsText(contents, callback);
	}
};
Webos.inherit(Webos.FTPFile, Webos.File); //Héritage de Webos.File

Webos.FTPFile._data = null;
Webos.FTPFile._getLoginData = function() {
	return Webos.FTPFile._data || {};
};
Webos.FTPFile.mount = function(point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!point.get('data')) {
		var dialog = $.w.window.dialog({
			title: 'Ouverture de la connexion FTP',
			icon: 'places/folder-remote'
		});
		
		var form = $.w.entryContainer().submit(function() {
			point.set('data', {
				host: host.textEntry('value'),
				port: port.textEntry('value'),
				user: user.textEntry('value'),
				password: password.passwordEntry('value')
			});
			
			new Webos.ServerCall({
				'class': 'FTPController',
				'method': 'connect',
				'arguments': {
					loginData: point.get('data')
				}
			}).load([function(response) {
				dialog.window('close');
				callback.success(point);
			}, function(response) {
				dialog.window('close');
				callback.error(response);
			}]);
		});
		
		var host = $.w.textEntry('H&ocirc;te :').appendTo(form);
		var port = $.w.textEntry('Port :', 21).appendTo(form);
		var user = $.w.textEntry('Utilisateur :').appendTo(form);
		var password = $.w.passwordEntry('Mot de passe :').appendTo(form);
		
		var buttons = $.w.buttonContainer().appendTo(form);
		$.w.button('Annuler').click(function() {
			Webos.File.umount(local);
			dialog.window('close');
		}).appendTo(buttons);
		$.w.button('Valider', true).appendTo(buttons);
		
		form.appendTo(dialog.window('content'));
		
		dialog.window('open');
	} else {
		callback.success(point);
	}
};

Webos.FTPFile.get = function(file, point, data) {
	path = String(file);
	
	if (file instanceof Webos.FTPFile) { //Si c'est déja un objet Webos.FTPFile, on le retourne directement
		return file;
	} else { //Sinon, on crée un nouvel objet
		return new Webos.FTPFile($.extend({}, data, {
			path: point.getRelativePath(path)
		}), point);
	}
};

Webos.FTPFile.load = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);

	var file = Webos.FTPFile.get(path, point);

	return file.load([function() {
		callback.success(file);
	}, callback.error]);
};

Webos.FTPFile.createFile = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return new Webos.ServerCall({
		'class': 'FTPController',
		'method': 'createFile',
		'arguments': {
			loginData: point.get('data'),
			file: point.getRelativePath(path)
		}
	}).load([function(response) {
		var file = Webos.FTPFile.get(path, point);
		file._updateData(response.getData());
		callback.success(file);
	}, callback.error]);
};

Webos.FTPFile.createFolder = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return new Webos.ServerCall({
		'class': 'FTPController',
		'method': 'createFolder',
		'arguments': {
			loginData: point.get('data'),
			dir: point.getRelativePath(path)
		}
	}).load([function(response) {
		var file = Webos.FTPFile.get(path, point);
		file._updateData(response.getData());
		callback.success(file);
	}, callback.error]);
};

Webos.File.registerDriver('FTPFile', {
	title: 'FTP',
	icon: 'places/folder-remote',
	lib: '/usr/lib/webos/ftp.js'
});