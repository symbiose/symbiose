/**
 * Integration du FTP dans la bibliotheque du webos.
 * @author $imon
 * @since 1.0 beta 1
 */

Webos.FTPFile = function WFTPFile(data, point) {
	data.ftppath = data.path;
	data.path = point.getWebosPath(data.ftppath);
	data.realpath = 'ftp://'+point.get('data').user+':'+point.get('data').password+'@'+point.get('data').host+':'+point.get('data').port+'/'+data.ftppath;
	
	this._mountPoint = point;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.FTPFile.prototype = {
	mountPoint: function() {
		return this._mountPoint;
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.FTPFile.load(this.get('path'), this.get('mountPoint'), function(file) {
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
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
			'class': 'FTPController',
			method: 'rename',
			arguments: {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath'),
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
	move: function(dest, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		dest = String(dest);
		
		//TODO: moving files support
		callback.error();
		Webos.Error.trigger('Impossible de d&eacute;placer des fichiers : fonction non support&eacute; pour FTP');
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		new Webos.ServerCall({
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
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			new Webos.ServerCall({
				'class': 'FTPController',
				'method': 'getFileList',
				'arguments': {
					loginData: this.get('mountPoint').get('data'),
					dir: this.get('ftppath')
				}
			}).load([function(response) {
				var data = response.getData();
				var list = [];
				for(var i in data) {
					var file = new Webos.FTPFile(data[i], that.get('mountPoint'));
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
			new Webos.ServerCall({
				'class': 'FTPController',
				'method': 'getFile',
				'arguments': {
					loginData: this.get('mountPoint').get('data'),
					file: this.get('ftppath')
				}
			}).load([function(response) {
				callback.success(response.getData().contents);
			}, callback.error]);
		}
	},
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			callback.error();
		}
		
		new Webos.ServerCall({
			'class': 'FTPController',
			'method': 'putFile',
			'arguments': {
				loginData: this.get('mountPoint').get('data'),
				file: this.get('ftppath'),
				contents: contents
			}
		}).load([function(response) {
			callback.success();
		}, callback.error]);
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
	
	new Webos.ServerCall({
		'class': 'FTPController',
		'method': 'getMetadata',
		'arguments': {
			loginData: point.get('data'),
			file: point.getRelativePath(path)
		}
	}).load([function(response) {
		var file = new Webos.FTPFile(response.getData(), point);
		
		callback.success(file);
	}, callback.error]);
};

Webos.FTPFile.createFile = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FTPController',
		'method': 'createFile',
		'arguments': {
			loginData: point.get('data'),
			file: point.getRelativePath(path)
		}
	}).load([function(response) {
		var file = new Webos.FTPFile(response.getData(), point);
		callback.success(file);
	}, callback.error]);
};

Webos.FTPFile.createFolder = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FTPController',
		'method': 'createFolder',
		'arguments': {
			loginData: point.get('data'),
			dir: point.getRelativePath(path)
		}
	}).load([function(response) {
		var file = new Webos.FTPFile(response.getData(), point);
		callback.success(file);
	}, callback.error]);
};

Webos.File.registerDriver('FTPFile', {
	title: 'FTP',
	icon: 'places/folder-remote',
	lib: '/usr/lib/webos/ftp.js'
});