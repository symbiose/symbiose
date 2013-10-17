/**
 * Integration de Google Drive dans la bibliotheque du webos.
 * @author $imon
 * @since 1.0 beta 1
 */

Webos.GoogleApi = {};
Webos.GoogleApi._apiData = null;
Webos.GoogleApi._libLoaded = false;
Webos.GoogleApi.loadAPIConfig = function(callback) {
	callback = Webos.Callback.toCallback(callback);

	if (Webos.GoogleApi._apiData === null) {
		window._WebosGoogleApiFileOnClientLoad = function() {
			delete window._WebosGoogleApiFileOnClientLoad;

			window.setTimeout(function() {
				gapi.client.setApiKey(Webos.GoogleApi._apiData.apiKey);
				Webos.GoogleApi.checkAuth(callback, true);
			}, 1);
		};

		var configFile = W.File.get('/usr/etc/google-api/api-access.json');

		configFile.readAsText([function(contents) {
			var conf = $.parseJSON(contents);
			Webos.GoogleApi._apiData = conf;
			callback.success(conf);
		}, callback.error]);
	} else {
		callback.success(Webos.GoogleApi._apiData);
	}
};
Webos.GoogleApi.loadClient = function(callback) {
	callback = Webos.Callback.toCallback(callback);

	if (!Webos.GoogleDriveFile._libLoaded) {
		window._WebosGoogleApiFileOnClientLoad = function() {
			delete window._WebosGoogleApiFileOnClientLoad;

			window.setTimeout(function() {
				Webos.GoogleApi.loadAPIConfig([function(conf) {
					gapi.client.setApiKey(conf.apiKey);
					Webos.GoogleApi.checkAuth(callback, true);
				}, callback.error]);
			}, 1);
		};

		$('<script></script>', {
			src: 'https://apis.google.com/js/client.js?onload=_WebosGoogleApiFileOnClientLoad',
			type: 'text/javascript'
		}).appendTo('body');
	} else {
		Webos.GoogleApi.checkAuth(callback);
	}
};
Webos.GoogleApi.checkAuth = function(callback, forceImmediate) {
	callback = Webos.Callback.toCallback(callback);

	Webos.GoogleApi.loadAPIConfig([function(conf) {
		gapi.auth.authorize({
			'client_id': conf.clientId,
			'scope': 'https://www.googleapis.com/auth/drive',
			'immediate': forceImmediate || Webos.GoogleApi._libLoaded
		}, function(authResult) {
			if (authResult && !authResult.error) {
				// Access token has been successfully retrieved, requests can be sent to the API.
				window.setTimeout(function() {
					Webos.GoogleApi.checkAuth();
				}, (authResult.expires_in - 60) * 1000);
				callback.success();
			} else {
				// No access token could be retrieved.
				if (forceImmediate) {
					Webos.GoogleApi.checkAuth(callback);
				} else {
					callback.error((authResult) ? authResult.error : authResult);
				}
			}
		});
	}, callback.error]);
};


/**
 * Represente un fichier de Google Drive.
 * @param {Object} data Les données sur le fichier.
 * @borrows Webos.File#load as this.load
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.GoogleDriveFile = function(data, point) {
	this._mountPoint = point;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.GoogleDriveFile.prototype = {
	hydrate: function(data) {
		if (data.path) {
			data.googledrivepath = data.path;
			data.path = this.get('mountPoint').getWebosPath(data.googledrivepath);
		}

		data.readable = true;
		data.writable = (data.editable) ? true : false;
		data.mime_type = data.mimeType || data.mime_type;
		data.download_url = data.webContentLink;

		return Webos.File.prototype.hydrate.call(this, data);
	},
	mountPoint: function() {
		return this._mountPoint;
	},
	is_dir: function() {
		var mimeType = this.get('mime_type');
		if (mimeType) {
			return (this.get('mime_type') == 'application/vnd.google-apps.folder');
		} else {
			return this._get('is_dir');
		}
	},
	realpath: function() {
		return this._get('webContentLink');
	},
	size: function() {
		return this._get('fileSize');
	},
	extension: function() {
		return this._get('fileExtension') || this._get('extension') || '';
	},
	writable: function() {
		return this._get('editable');
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
			var request = gapi.client.drive.files.get({
				'fileId': fileId,
				'fields': 'id,editable,fileExtension,fileSize,mimeType,title,webContentLink,downloadUrl,labels'
			});
			request.execute(function(resp) {
				that._updateData(resp);

				callback.success(that);
			});
		}, callback.error]);
	},
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
			var request = gapi.client.drive.files.patch({
				'fileId': fileId,
				'resource': {
					'title': newName
				}
			});
			request.execute(function(resp) {
				that._updateData($.extend({}, resp, {
					path: that.get('mountPoint').getRelativePath(that.get('dirname') + '/' + newName)
				}));

				callback.success();
			});
		}, callback.error]);
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
			var request = gapi.client.drive.files.delete({
				'fileId': fileId
			});
			request.execute(function(resp) {
				that._remove();

				callback.success();
			});
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

		$.ajax({
			url: this.get('downloadUrl'),
			dataType: 'text',
			headers: {
				'Authorization': 'Bearer ' + gapi.auth.getToken().access_token
			},
			success: function(contents) {
				that._contents = contents;

				callback.success(contents);

				that.notify('updatecontents', { contents: contents });
				Webos.File.notify('load', { file: that });
			},
			error: function() {
				callback.error();
			}
		});
	},
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}
		
		if (this.get('is_dir')) {
			Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
				var request = gapi.client.drive.files.list({
					'q': '\''+fileId+'\' in parents'
				});
				request.execute(function(resp) {
					var list = [];

					for (var i = 0; i < resp.items.length; i++) {
						var data = resp.items[i];
						var googleDriveFile = new Webos.GoogleDriveFile($.extend({}, resp.items[i], {
							path: that.get('googledrivepath') + '/' + resp.items[i].title
						}), that.get('mountPoint'));

						if (googleDriveFile.is('trashed')) {
							continue;
						}

						var file = Webos.File.get(googleDriveFile.get('path'));
						if (Webos.isInstanceOf(file, Webos.GoogleDriveFile)) {
							file._updateData(googleDriveFile.data());
						} else {
							file._updateData({
								is_dir: googleDriveFile.get('is_dir'),
								mime_type: googleDriveFile.get('mime_type')
							});
						}
						list.push(file);
					}

					that._contents = list;

					callback.success(list);

					that.notify('updatecontents', { contents: list });
					Webos.File.notify('load', { file: that });
				});
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

		var onSuccessFn = function(resp) {
			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(resp);

			callback.success();
		};

		Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
			var request = gapi.client.request({
				'path': '/upload/drive/v2/files/' + fileId,
				'method': 'PUT',
				'params': {
					'convert': true
				},
				'headers': {
					'Content-Type': (that.get('mime_type') || 'application/octet-stream')
				},
				'body': contents
			});

			request.execute(function(resp) {
				onSuccessFn(resp);
			});
		}, function() {
			Webos.GoogleDriveFile.createFile(that.get('path'), that.get('mountPoint'), [function(file) {
				file.writeAsText(contents, callback);
			}, callback.error]);
		}]);
	},
	share: function (callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		Webos.GoogleDriveFile._getFileId(this.get('path'), this.get('mountPoint'), [function(fileId) {
			var request = gapi.client.drive.permissions.insert({
				'fileId': fileId,
				'resource': {
					'value': '',
					'type': 'anyone',
					'role': 'reader',
					'withLink': true
				}
			});
			request.execute(function(resp) {
				callback.success({
					url: that.get('alternateLink')
				});
			});
		}, callback.error]);
	}
};
Webos.inherit(Webos.GoogleDriveFile, Webos.File); //Héritage de Webos.File

Webos.GoogleDriveFile._clientLoaded = false;
Webos.GoogleDriveFile._filesIds = {};
Webos.GoogleDriveFile.mount = function(point, callback) {
	callback = Webos.Callback.toCallback(callback);

	if (Webos.GoogleDriveFile._clientLoaded) {
		callback.success(point);
	} else {
		Webos.GoogleApi.loadClient([function() {
			gapi.client.load('drive', 'v2', function() {
				Webos.GoogleDriveFile._clientLoaded = true;
				callback.success(point);
			});
		}, callback.error]);
	}
};

Webos.GoogleDriveFile.get = function(file, point, data) {
	path = String(file);
	
	if (file instanceof Webos.GoogleDriveFile) { //Si c'est déja un objet Webos.GoogleDriveFile, on le retourne directement
		return file;
	} else { //Sinon, on crée un nouvel objet
		return new Webos.GoogleDriveFile($.extend({}, data, {
			path: point.getRelativePath(path)
		}), point);
	}
};

Webos.GoogleDriveFile.load = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);

	var file = Webos.GoogleDriveFile.get(path, point);

	return file.load([function(file) {
		callback.success(file);
	}, callback.error]);
};

Webos.GoogleDriveFile._getFileId = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	var relativePath = point.getRelativePath(path), dirs = relativePath.split('/'), i = 0, currentPath = '', lastFolderId = null;

	var getThisDirIdFn = function() {
		if (i >= dirs.length) {
			callback.success(lastFolderId);
			return;
		}

		var dirname = dirs[i];
		var newPath = currentPath + ((i == 0) ? '' : '/') + dirname;
		if (currentPath && newPath == currentPath) {
			i++;
			getThisDirIdFn();
			return;
		}
		currentPath = newPath;

		if (typeof Webos.GoogleDriveFile._filesIds[currentPath] == 'undefined') {
			if (!dirname) { // Root
				var request = gapi.client.drive.about.get();
				request.execute(function(resp) {
					Webos.GoogleDriveFile._filesIds[currentPath] = resp.rootFolderId;
					lastFolderId = resp.rootFolderId;
					i++;
					getThisDirIdFn();
				});
			} else {
				var request = gapi.client.drive.children.list({
					'folderId' : lastFolderId,
					'q': 'title = \''+dirname.replace('\'', '\\\'')+'\'',
					'maxResults': 1
				});
				request.execute(function(resp) {
					if (typeof resp.items == 'undefined' || !resp.items.length) {
						callback.error(W.Callback.Result.error('Specified file "'+path+'" doesn\'t exist'));
						return;
					}

					var item = resp.items[0];
					Webos.GoogleDriveFile._filesIds[currentPath] = item.id;
					lastFolderId = item.id;
					i++;
					getThisDirIdFn();
				});
			}
		} else {
			lastFolderId = Webos.GoogleDriveFile._filesIds[currentPath];
			i++;
			getThisDirIdFn();
		}
	};

	getThisDirIdFn();
};

Webos.GoogleDriveFile.createFile = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path);

	Webos.GoogleDriveFile._getFileId(file.get('dirname'), point, [function(parentId) {
		var request = gapi.client.request({
			'path': '/drive/v2/files',
			'method': 'POST',
			'body': {
				'title': file.get('basename'),
				'mimeType': (file.get('mime_type') || 'application/octet-stream'),
				'parents': [{
					kind: 'drive#fileLink',
					id: parentId
				}]
			}
		});
		request.execute(function(resp) {
			file._updateData(resp);

			callback.success(file);
		});
	}, callback.error]);
};

Webos.GoogleDriveFile.createFolder = function(path, point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path);

	Webos.GoogleDriveFile._getFileId(file.get('dirname'), point, [function(parentId) {
		var request = gapi.client.request({
			'path': '/drive/v2/files',
			'method': 'POST',
			'body': {
				'title': file.get('basename'),
				'mimeType': 'application/vnd.google-apps.folder',
				'parents': [{
					kind: 'drive#fileLink',
					id: parentId
				}]
			}
		});
		request.execute(function(resp) {
			file._updateData(resp);

			callback.success(file);
		});
	}, callback.error]);
};

Webos.File.registerDriver('GoogleDriveFile', {
	title: 'Google Drive',
	icon: 'applications/google-drive',
	lib: '/usr/lib/google-api/webos.js'
});