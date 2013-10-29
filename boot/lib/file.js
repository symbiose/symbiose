/**
 * A library to manage files.
 * @author $imon
 * @since 1.0alpha1
 */

/**
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 **/
Webos.base64 = {
	/**
	 * @private
	 */
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	/**
	 * Encode a string to base64.
	 * @param {String} input The string to encode.
	 * @returns {String} The base64-encoded string.
	 */
	encode: function (input) {
		if (window.btoa) {
			return window.btoa(unescape(encodeURIComponent(input)));
		}

		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
 
		while (i < input.length) {
 
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
 
			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
		}
 
		return output;
	},
 
	/**
	 * Decode a base64-string.
	 * @param {String} input The base64-encoded string.
	 * @returns {String} The decoded string.
	 */
	decode: function (input) {
		if (window.atob) {
			return decodeURIComponent(escape(window.atob(input)));
		}

		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		return output;
	},
 
	// method for UTF-8 encoding
	utf8Encode: function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
 
		for (var n = 0; n < string.length; n++) {
 
			var c = string.charCodeAt(n);
 
			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
 
		return utftext;
	},
 
	// method for UTF-8 decoding
	utf8Decode: function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	}
};

/**
 * A file.
 * @param {Object} data The file's data.
 * @constructor
 * @augments {Webos.Model}
 * @since 1.0alpha1
 * @example
 * //Listing files in the user's home folder
 * W.File.listDir('~', [function(files) { //We want to list files in the home folder (which is "~")
 *    var list = 'Files : ';
 *    for (var i = 0; i < files.length; i++) { //For each file
 *       var file = files[i];
 *       list += ' '+file.get('basename'); //Add the file to the list
 *    }
 *    alert(list); //Show the list
 * }, function(response) { //An error occured
 *    response.triggerError('Cannot list files in folder');
 * }]);
 */
Webos.File = function WFile(data) {
	Webos.Model.call(this, data); //Inherits from Webos.Model
};
Webos.File.prototype = {
	/**
	 * Update file's data, and complete automatically missing data.
	 * @param {Object} data The new data.
	 */
	hydrate: function(data) {
		var path = (data.path || this.get('path'));
		if (path) {
			if (!data.dirname) { //On définit automatiquement le dossier parent si non présent
				if (path.indexOf('/', 1) != -1) {
					data.dirname = path.replace(/\/[^\/]*\/?$/, '');
				} else if (path.indexOf('/') == -1 || path == '/') {
					data.dirname = undefined;
				} else if (path.indexOf('/') == 0) {
					data.dirname = '/';
				}
			}
			if (!data.basename) { //On définit automatiquement le nom du fichier si non présent
				data.basename = path.replace(/^.*[\/\\]/g, '');
			}
			if (data.is_dir === false && !data.extension) { //On définit automatiquement l'extension du fichier si non présent et que le fichier n'est pas un dossier
				data.extension = (/\./.test(path)) ? /[^.]+$/.exec(path)[0] : '';
			}
			if (data.extension) { //On met l'extension en minuscules
				data.extension = data.extension.toLowerCase();
			}
		}

		if (typeof data.is_binary == 'undefined') {
			if (data.mime_type) {
				data.is_binary = (data.mime_type.indexOf('text/') != 0);
			} else if (!this.exists('is_binary')) {
				data.is_binary = true;
			}
		}

		if (typeof data.labels == 'undefined') {
			data.labels = {};
		}
		if (!data.labels.hidden) {
			data.labels.hidden = (data.basename.charAt(0) == '.');
		}
		if (typeof data.labels.trashed == 'undefined') {
			data.labels.trashed = false;
		}

		return Webos.Model.prototype.hydrate.call(this, data);
	},
	/**
	 * Update file's data.
	 * @param {Object} data The new data.
	 * @private
	 */
	_updateData: function(data) {
		var updatedData = {};
		for (var key in data) {
			if (this._get(key) !== data[key]) {
				updatedData[key] = data[key];
			}
		}

		var oldPath = this.get('path');

		//Il FAUT creer une copie de l'objet "updatedData" sinon il sera modifie par la fonction "this.hydrate"
		this.hydrate($.extend({}, updatedData));

		var parentDirPath = this.get('dirname');
		if (parentDirPath != this.get('path')) { //Dossier racine ?
			if (Webos.File.isCached(parentDirPath)) {
				var parentDir = Webos.File.get(parentDirPath);
				if (parentDir._contents) {
					var found = false;
					for (var i = 0; i < parentDir._contents.length; i++) {
						if (parentDir._contents[i].get('path') == this.get('path')) {
							found = true;
							break;
						}
					}
					if (!found) {
						parentDir._contents.push(this);
					}
				}
			}
		}

		var newPath = this.get('path');

		if (oldPath != newPath) {
			var thisData = $.extend({}, this.data());
			this.hydrate({
				path: oldPath
			});
			this._remove();

			var file = Webos.File.get(newPath);

			if (Webos.isInstanceOf(file, this.constructor)) {
				file._updateData(thisData);
			} else {
				file._updateData({
					is_dir: thisData.is_dir
				});
			}
		} else {
			for (var key in updatedData) {
				this.notify('update', { key: key, value: updatedData[key] });
			}

			Webos.File.notify('load', { file: this });
		}
	},
	/**
	 * Trigger post-removing callbacks.
	 * @private
	 */
	_remove: function() {
		this.notify('remove');
		Webos.File.notify('remove', { file: this });

		var parentDirPath = this.get('dirname');
		if (parentDirPath != this.get('path')) { //Dossier racine ?
			if (Webos.File.isCached(parentDirPath)) {
				var parentDir = Webos.File.get(parentDirPath);
				if (parentDir._contents) {
					var list = [];
					for (var i = 0; i < parentDir._contents.length; i++) {
						if (parentDir._contents[i].get('path') != this.get('path')) {
							list.push(parentDir._contents[i]);
						}
					}
					parentDir._contents = list;
				}
			}
		}
		
		Webos.File.clearCache(this.get('path'));

		delete this;
	},
	/**
	 * Trigger an error because the current action is unavailable on this type of file.
	 * @param {Webos.Callback} [callback] The callback function which will be called.
	 * @private
	 */
	_unsupportedMethod: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.error(Webos.Callback.Result.error('Cannot execute this operation on this type of file "'+this.get('path')+'"'));
	},
	/**
	 * Load this file's data.
	 * @param {Webos.Callback} callback The callback.
	 */
	load: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Rename this file.
	 * @param {String} newName The new name for the file.
	 * @param {Webos.Callback} callback The callback.
	 */
	rename: function(newName, callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Delete this file.
	 * @param {Webos.Callback} callback The callback.
	 */
	remove: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Read this file's content as text.
	 * @param {Webos.Callback} callback The callback.
	 */
	readAsText: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Get this file/directory's content.
	 * @param {Webos.Callback} callback The callback. If this file is a directory, an array of files will be provided.
	 */
	contents: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Get this file/directory's content.
	 * @deprecated Since 1.0 alpha 3, you are supposed to use Webos.File#contents().
	 */
	getContents: function(callback) {
		return this.contents(callback);
	},
	/**
	 * Write this file's content as text.
	 * @param {String} contents The new content for this file.
	 * @returns {Webos.ServerCall} The associated server call.
	 * @private
	 */
	_writeAsText: function(contents) {
		this._unsupportedMethod();
	},
	/**
	 * Write this file's content as text.
	 * @param {String} contents The new content for this file.
	 * @param {Webos.Callback} callback The callback.
	 */
	writeAsText: function(contents, callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Write this file's content as text.
	 * @param {String} contents The new content for this file.
	 * @param {Webos.Callback} callback The callback.
	 * @deprecated Since 1.0 beta 1, use Webos.File#writeAsText().
	 */
	setContents: function(contents, callback) {
		return this.writeAsText(contents, callback);
	},
	/**
	 * Share this file and get the public URL.
	 * @param  {Webos.Callback} callback The callback.
	 */
	share: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Check if the user can execute a given action on this file.
	 * @param {String} auth The name of the authorization. Can be "read" or "write".
	 * @returns {Boolean} True if the user can execute the specified action, false otherwise.
	 */
	can: function(auth) {
		var attr = (auth == 'read') ? 'readable' : 'writable';
		
		return this.get(attr);
	},
	/**
	 * Check if this file has a given label.
	 * @param {String} label The label.
	 * @returns {Boolean} True if the file has the given label, false otherwise.
	 */
	is: function(label) {
		return (this._get('labels') && this._get('labels')[label]) ? true : false;
	},
	/**
	 * Check if the user can execute a given action on this file. Trigger an error if not.
	 * @param {String} auth The name of the authorization. Can be "read" or "write".
	 * @param {Webos.Callback} callback The callback.
	 * @returns {Boolean} True if the user can execute the specified action, false otherwise.
	 */
	checkAuthorization: function(auth, callback) {
		if (!this.can(auth)) {
			callback = Webos.Callback.toCallback(callback);
			
			callback.error(Webos.Callback.Result.error('Vous n\'avez pas les droits requis pour ' + ((auth == 'read') ? 'ouvrir' : 'modifier') + ' le fichier "' + this.get('path') + '"'));
			
			return false;
		}
		
		return true;
	},
	/**
	 * Clear this file's cache.
	 */
	clearCache: function(filepath) {
		if (typeof this._contents == 'undefined') {
			return;
		}

		if (filepath && this.get('is_dir')) {
			var list = [];
			for (var i = 0; i < this._contents.length; i++) {
				if (this._contents[i].get('path') != filepath) {
					list.push(this._contents[i]);
				}
			}
			this._contents = list;
		} else {
			delete this._contents;
		}
	},
	toString: function() {
		return this.get('path');
	}
};
Webos.inherit(Webos.File, Webos.Model); //Héritage de Webos.Model

Webos.Observable.build(Webos.File); //On construit un objet observable depuis Webos.File

/**
 * Cache for files.
 * @private
 * @static
 */
Webos.File._cache = {};

/**
 * List of mounted volumes.
 * @private
 * @static
 */
Webos.File._mountedDevices = {};

/**
 * Get a file.
 * @param file The path to the file.
 * @param {Object} [data] The file's data.
 * @param {Boolean} [disableCache] If set to true, the file will not be stored in the cache.
 * @returns {Webos.File} The file.
 * @static
 */
Webos.File.get = function(file, data, disableCache) {
	if (window.File && file instanceof window.File) { //Si c'est un objet natif File, on retorune un objet Webos.LocalFile
		return new Webos.LocalFile(file);
	} else if (Webos.isInstanceOf(file, Webos.File)) { //Si c'est déja un objet Webos.File, on le retourne directement
		return file;
	}

	if (typeof file == 'undefined') {
		return;
	}

	path = String(file);
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			if (Webos.File.isCached(path)) { //Si le fichier est dans le cache
				return Webos.File._cache[path];
			} else {
				file = Webos[devices[local].get('driver')].get(path, devices[local], data);
				if (!disableCache) {
					Webos.File._cache[file.get('path')] = file;
				}
				return file;
			}
		}
	}
	
	if (Webos.File.isCached(path)) { //Si le fichier est dans le cache, on le retourne
		return Webos.File._cache[path];
	} else {
		//Sinon, on crée un nouvel objet
		file = new Webos.WebosFile($.extend({}, data, {
			path: path
		}));
		if (!disableCache) {
			Webos.File._cache[file.get('path')] = file;
		}
		return file;
	}
};

/**
 * Load a file's metadata.
 * @param {String} path The path to the file.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.load = function(path, callback) {
	path = String(path);
	callback = Webos.Callback.toCallback(callback);
	
	//Ajouter un fichier au cache
	var addFileToCacheFn = function(file) {
		if (typeof Webos.File._cache[file.get('path')] != 'undefined') {
			Webos.File._cache[file.get('path')]._hydrate(file.data());
			file = Webos.File._cache[file.get('path')];
			Webos.File.notify('load', { file: file });
		} else {
			Webos.File._cache[file.get('path')] = file;
		}
	};
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			(function(point) {
				Webos[point.get('driver')].load(path, point, [function(file) {
					addFileToCacheFn(file);
					callback.success(file);
				}, callback.error]);
			})(devices[local]);
			return;
		}
	}
	
	if (Webos.File.isCached(path)) { //Si le fichier est déja dans le cache, on le retourne
		callback.success(Webos.File._cache[path]);
	} else { //Sinon, on le charge
		var file = Webos.File.get(path, {}, false);
		
		file.load(new Webos.Callback(function() {
			//On le stocke dans le cache
			addFileToCacheFn(file);
			
			callback.success(file);
		}, callback.error));
	}
};

/**
 * List a directory's files.
 * @param path The path to the directory.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.listDir = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path, { is_dir: true }); //On construit notre objet

	//Puis on récupére son contenu
	file.contents([function(list) {
		callback.success(list);
	}, callback.error]);
};

/**
 * Create an empty file.
 * @param path The path to the new file.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.createFile = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			(function(point) {
				Webos[point.get('driver')].createFile(path, point, [function(file) {
					callback.success(file);
				}, callback.error]);
			})(devices[local]);
			return;
		}
	}
	
	return new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFile',
		arguments: {
			file: path
		}
	}).load([function(response) {
		var file = Webos.File.get(path);
		file._updateData(response.getData());
		callback.success(file);
	}, callback.error]);
};

/**
 * Create a new folder.
 * @param path The path to the new folder.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.createFolder = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			(function(point) {
				Webos[point.get('driver')].createFolder(path, point, [function(file) {
					callback.success(file);
				}, callback.error]);
			})(devices[local]);
			return;
		}
	}
	
	return new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFolder',
		arguments: {
			file: path
		}
	}).load([function(response) {
		var file = Webos.File.get(path);
		file._updateData(response.getData());
		callback.success(file);
	}, callback.error]);
};

/**
 * Copy a file.
 * @param {Webos.File|String} source The source file.
 * @param {Webos.File|String} dest The destination file.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.copy = function(source, dest, callback) {
	source = Webos.File.get(source);
	dest = Webos.File.get(dest);
	callback = Webos.Callback.toCallback(callback);

	var updateMetadataFn = function(source, dest, data) {
		var metadataFile = new dest.constructor(data);
		var file = Webos.File.get(metadataFile.get('path'));
		if (Webos.isInstanceOf(file, metadataFile.constructor)) {
			file._updateData(metadataFile.data());
		} else {
			file._updateData({
				is_dir: metadataFile.get('is_dir')
			});
		}
		file._contents = source._contents;
		
		return file;
	};

	//Copie cote serveur entre fichiers du webos
	if (Webos.isInstanceOf(source, Webos.WebosFile) && Webos.isInstanceOf(dest, Webos.WebosFile)) {
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'copy',
			arguments: {
				source: source.get('path'),
				dest: dest.get('path')
			}
		}).load([function(response) {
			var file = updateMetadataFn(source, dest, response.getData());

			callback.success(file);
		}, callback.error]);
	}

	//Copie cote serveur entre fichiers du meme volume
	if (source.get('mountPoint') && dest.get('mountPoint')) {
		if (source.get('mountPoint') === dest.get('mountPoint')) {
			var point = source.get('mountPoint');

			if (typeof Webos[point.get('driver')].copy == 'function') {
				return Webos[point.get('driver')].copy(source, dest, point, [function (data) {
					var file = updateMetadataFn(source, dest, data);

					callback.success(file);
				}, callback.error]);
			}
		}
	}

	//Copie entre volumes differents -> copie "hardcore" en full-JS

	var copyDirFn = function(source, dest, callback) {
		callback = Webos.Callback.toCallback(callback);

		var filesList, dirCreated = false;
		var createChildFilesFn = function(dest) {
			if (!filesList || !dirCreated) {
				return;
			}
			if (filesList.length == 0) {
				callback.success();
				return;
			}

			var copiedFilesNbr = 0, errorsNbr = 0, errorRes;

			var triggerCallbackFn = function() {
				if (copiedFilesNbr == filesList.length) {
					callback.success(dest);
				} else if (errorRes && errorsNbr == 1) {
					callback.error(errorRes);
				}
			};

			for (var i = 0; i < filesList.length; i++) {
				(function(file) {
					copyFn(file, dest.get('path') + '/' + file.get('basename'), [function(newFile) {
						copiedFilesNbr++;
						triggerCallbackFn();
					}, function(response) {
						errorsNbr++;
						errorRes = response;
						triggerCallbackFn();
					}]);
				})(filesList[i]);
			}
		};

		W.File.listDir(source, [function(list) {
			filesList = list;
			createChildFilesFn(dest);
		}, callback.error]);

		if (dest.get('is_dir')) {
			dest = W.File.get(dest.get('path') + '/' + source.get('basename'));
			copyDirFn(source, dest, callback);
		} else if (dest.get('is_dir') === false) {
			dest._unsupportedMethod(callback);
		} else {
			dest.load([function(dest) {
				copyDirFn(source, dest, callback);
			}, function() {
				Webos.File.createFolder(dest, [function(dest) {
					dirCreated = true;
					createChildFilesFn(dest);
				}, callback.error]);
			}]);
		}
	};

	var copyTextFileFn = function(source, dest, callback) {
		callback = Webos.Callback.toCallback(callback);

		source.readAsText([function(contents) {
			dest.writeAsText(contents, [function() {
				callback.success(dest);
			}, callback.error]);
		}, callback.error]);
	};

	var copyBinaryFileFn = function(source, dest, callback) {
		callback = Webos.Callback.toCallback(callback);

		source.readAsBinary([function(contents) {
			dest.writeAsBinary(contents, [function() {
				callback.success(dest);
			}, callback.error]);
		}, callback.error]);
	};

	var copyFn = function(source, dest, callback) {
		source = Webos.File.get(source);
		dest = Webos.File.get(dest);

		if (source.get('is_dir')) {
			copyDirFn(source, dest, callback);
		} else if (source.get('is_dir') === false) {
			if (dest.get('is_dir')) {
				dest = W.File.get(dest.get('path') + '/' + source.get('basename'));
				copyFn(source, dest, callback);
			} else {
				if (source.get('is_binary') && typeof source.readAsBinary == 'function' && typeof dest.writeAsBinary == 'function') {
					copyBinaryFileFn(source, dest, callback);
				} else {
					copyTextFileFn(source, dest, callback);
				}
			}
		} else {
			source.load([function(source) {
				copyFn(source, dest, callback);
			}, callback.error]);
		}
	};

	copyFn(source, dest, callback);
};

/**
 * Move a file.
 * @param {Webos.File|String} source The source file.
 * @param {Webos.File|String} dest The destination file.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.File.move = function(source, dest, callback) {
	source = Webos.File.get(source);
	dest = Webos.File.get(dest);
	callback = Webos.Callback.toCallback(callback);

	var updateMetadataFn = function(source, dest, data) {
		var contents = source._contents;
		source._remove();

		var metadataFile = new dest.constructor(data);
		var file = Webos.File.get(metadataFile.get('path'));
		if (Webos.isInstanceOf(file, metadataFile.constructor)) {
			file._updateData(metadataFile.data());
		} else {
			file._updateData({
				is_dir: metadataFile.get('is_dir')
			});
		}
		file._contents = contents;
		
		return file;
	};

	//Deplacement cote serveur entre fichiers du webos
	if (Webos.isInstanceOf(source, Webos.WebosFile) && Webos.isInstanceOf(dest, Webos.WebosFile)) {
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				source: source.get('path'),
				dest: dest.get('path')
			}
		}).load([function(response) {
			var file = updateMetadataFn(source, dest, response.getData());

			callback.success(file);
		}, callback.error]);
	}

	//Deplacement cote serveur entre fichiers du meme volume
	if (source.get('mountPoint') && dest.get('mountPoint')) {
		if (source.get('mountPoint') === dest.get('mountPoint')) {
			var point = source.get('mountPoint');

			if (typeof Webos[point.get('driver')].move == 'function') {
				return Webos[point.get('driver')].move(source, dest, point, [function(data) {
					var file = updateMetadataFn(source, dest, data);
					
					callback.success(file);
				}, callback.error]);
			}
		}
	}

	//Deplacement de fichiers de volumes differents -> deplacement "hardcore" en full-JS
	Webos.File.copy(source, dest, [function() {
		source.remove([function() {
			callback.success(dest);
		}, callback.error]);
	}, callback.error]);
};

/**
 * A search result item.
 * @param {object} data The result data.
 * @param {Webos.File} file The file.
 */
Webos.File.SearchResultItem = function(data, file) {
	Webos.Model.call(this, data);

	this._file = file;
};
Webos.File.SearchResultItem.prototype = {
	hydrate: function(data) {
		return Webos.Model.prototype.hydrate.call(this, $.extend({
			matchesNbr: 1
		}, data));
	},
	/**
	 * Get the result's file.
	 * @return {Webos.File} The file.
	 */
	file: function() {
		return this._file;
	}
};
Webos.inherit(Webos.File.SearchResultItem, Webos.Model);

/**
 * Search files.
 * @param  {object}          options  Search's options.
 * @param  {Webos.Callback}  callback The callback.
 * @return {Webos.Operation}          The operation.
 */
Webos.File.search = function(options, callback) {
	options = $.extend({
		q: '',
		inDir: '~'
	}, options);
	searchDir = Webos.File.get(options.inDir);

	var operation = new Webos.Operation();
	operation.addCallbacks(callback);

	if (!options.q.trim()) {
		operation.setCompleted(Webos.Callback.Result.error('Empty search query'));
		return operation;
	}

	var searchesOpsList = [], searchesResults = [];

	var addResults = function(results) {
		searchesResults = searchesResults.concat(results);
	};

	if (Webos.isInstanceOf(searchDir, Webos.WebosFile)) {
		//Search in the webos's files
		searchesOpsList.push(new Webos.ServerCall({
			'class': 'FileController',
			method: 'search',
			arguments: {
				query: options.q,
				inDir: options.inDir
			}
		}).load([function(res) {
			var data = res.getData();
			var list = [];
			for (var key in data) {
				var webosFile = new Webos.WebosFile(data[key]);
				var file = Webos.File.get(webosFile.get('path'));
				if (Webos.isInstanceOf(file, Webos.WebosFile)) {
					file._updateData(webosFile.data());
				} else {
					file._updateData({
						is_dir: webosFile.get('is_dir')
					});
				}

				var searchResult = new Webos.File.SearchResultItem({
					matchesNbr: data[key].matchesNbr
				}, file);
				list.push(searchResult);
			}

			addResults(list);
		}, function(res) {
			operation.trigger('error', {
				result: res
			});
		}]));
	}

	var mountedList = Webos.File.mountedDevices();
	for (var localPath in mountedList) {
		var mountedDev = mountedList[localPath];

		if (searchDir.get('path') == localPath || localPath.indexOf(searchDir.get('path')+'/') == 0) {
			//Search in this device
			//TODO
		}
	}

	var searchesOps = Webos.Observable.group(searchesOpsList);
	searchesOps.on('success', function() {
		if (searchesOps.observables().length > 1) {
			searchesResults.sort(function(a, b) {
				return b.get('matchesNbr') - a.get('matchesNbr');
			});
		}

		operation.setCompleted(searchesResults);
	});

	return operation;
};
Webos.File.searchInCache = function() {};

/**
 * Check if a file is in the cache.
 * @param {String} path The path to the file.
 * @returns {Boolean} True if the file is in the cache, false otherwise.
 * @static
 */
Webos.File.isCached = function(path) {
	return (typeof Webos.File._cache[path] != 'undefined');
};

/**
 * Clear the cache.
 * @param {String} [path] If specified, only the corresponding file's cache will be cleared.
 * @param {Boolean} [clearParentCache] If set to true, the parent's cache will also be cleared.
 * @static
 */
Webos.File.clearCache = function(path, clearParentCache) {
	if (typeof path == 'undefined') {
		Webos.File._cache = {};
	} else {
		if (Webos.File._cache[path]) {
			var file = Webos.File._cache[path], parentDirPath = file.get('dirname');
			if (parentDirPath != file.get('path')) { //Dossier racine ?
				if (Webos.File.isCached(parentDirPath)) {
					var parentDir = Webos.File.get(parentDirPath);
					if (clearParentCache) {
						parentDir.clearCache();
					} else {
						parentDir.clearCache(file.get('path'));
					}
				}
			}
		}

		delete Webos.File._cache[path];
	}
};

/**
 * Clean a path.
 * @param {String} path The path to clean.
 * @returns {String} The cleaned path.
 * @static
 */
Webos.File.cleanPath = function(path) {
	path = String(path);
	
	return path
		.replace(/\/+/g, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/')
		.replace(/(.+)\/$/, '$1');
};

/**
 * Convert a size in bytes to a human-readable file size (e.g. 1024 -> 1 Kio).
 * @param {Number} bytes The size to convert.
 * @returns {String} The converted size, followed by its unit.
 * @static
 */
Webos.File.bytesToSize = function(bytes) {
	var sizes = ['octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio'];
	if (bytes <= 1)
		return bytes+' octet';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return ((i == 0) ? (bytes / Math.pow(1024, i))
			: (bytes / Math.pow(1024, i)).toFixed(1))
			+ ' ' + sizes[i];
};

/**
 * A mount point.
 * @param {Object} data The mount point's data.
 * @param {String} local The mount point's local path.
 * @constructor
 * @augments {Webos.Model}
 * @since 1.0beta1
 */
Webos.File.MountPoint = function WMountPoint(data, local) {
	Webos.Model.call(this, data);
	
	this._local = local;
};
Webos.File.MountPoint.prototype = {
	/**
	 * Get the local path.
	 * @returns {String}
	 */
	local: function() {
		return this._local;
	},
	/**
	 * Set this mount point's data.
	 * @param {Object} data The mount point's data.
	 */
	setData: function(data) {
		this._data.data = data;
	},
	/**
	 * Get this mount point's data.
	 * @returns {Object}
	 */
	data: function() {
		return this._data.data;
	},
	/**
	 * Build a path relative to this mount point's local path from an absolute path.
	 * @param {String} path The absolute path.
	 * @returns {String} The path, relative to this mount point's local path.
	 */
	getRelativePath: function(path) {
		return Webos.File.cleanPath(String(path).replace(this.get('local'), this.get('remote') + '/'));
	},
	/**
	 * Build an absolute path from a path relative to this mount point's local path.
	 * @param {String} path The path, relative to this mount point's local path.
	 * @returns {String} The absolute path.
	 */
	getWebosPath: function(path) {
		if (!this.get('remote')) {
			return Webos.File.cleanPath(this.get('local') + '/' + String(path));
		}
		
		return Webos.File.cleanPath(String(path).replace(this.get('remote'), this.get('local') + '/'));
	}
};
Webos.inherit(Webos.File.MountPoint, Webos.Model);

/**
 * Mount a device.
 * @param {Webos.File.MountPoint} point The mount point.
 * @param {Webos.Callback} callback The callback.
 */
Webos.File.mount = function(point, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!Webos[point.get('driver')]) {
		callback.error();
		return;
	}
	
	if (Webos.File._mountedDevices[point.get('local')]) {
		callback.error();
		return;
	}
	
	var mountFn = function() {
		var mountFn = function() {
			Webos.File._mountedDevices[point.get('local')] = point;
			Webos.File.notify('mount', { local: point.get('local'), remote: point.get('remote'), driver: point.get('driver'), point: point });
			
			Webos.File.clearCache(point.get('local'), true);

			callback.success(point);
		};
		
		if (typeof Webos[point.get('driver')].mount == 'function') {
			Webos[point.get('driver')].mount(point, [function(newPoint) {
				if (newPoint) {
					point = newPoint;
				}
				mountFn();
			}, callback.error]);
		} else {
			mountFn();
		}
	};
	
	var init = true, devices = Webos.File.mountedDevices();
	for (var index in devices) {
		if (devices[index].get('driver') == point.get('driver')) {
			init = false;
			break;
		}
	}
	if (init && typeof Webos[point.get('driver')].init == 'function') {
		Webos[point.get('driver')].init([function() {
			mountFn();
		}, callback.error]);
	} else {
		mountFn();
	}
};

/**
 * Get a list of mounted devices.
 * @returns {Object} An object containing local paths and associated mount points.
 */
Webos.File.mountedDevices = function() {
	return Webos.File._mountedDevices;
};

/**
 * Get a specific mount point, giving its local path.
 * @param {String} local The mount point's local path.
 * @returns {Webos.File.MountPoint} point The mount point.
 */
Webos.File.getMountData = function(local) {
	return Webos.File._mountedDevices[local];
};

/**
 * Umount a device.
 * @param {Webos.File.MountPoint} point The mount point.
 */
Webos.File.umount = function(local) {
	if (Webos.File._mountedDevices[local]) {
		var point = Webos.File._mountedDevices[local], data = { local: point.get('local'), driver: point.get('driver'), remote: point.get('remote'), point: point };
		delete Webos.File._mountedDevices[local];
		Webos.File.notify('umount', data);

		Webos.File.clearCache(data.local, true);
	}
};

/**
 * A list of all registered drivers.
 * @private
 * @static
 */
Webos.File._drivers = {};

/**
 * Register a new file driver.
 * @param {String} driverName The driver's name.
 * @param {Object} data The driver's data.
 */
Webos.File.registerDriver = function(driverName, data) {
	if (!Webos[driverName]) {
		return false;
	}
	
	Webos.File._drivers[driverName] = {
		title: data.title,
		icon: data.icon,
		lib: data.lib
	};
};

/**
 * Get a driver's data, giving its name.
 * @param {String} driverName The driver's name.
 * @returns {Object} data The driver's data.
 */
Webos.File.getDriverData = function(driverName) {
	return Webos.File._drivers[driverName];
};

/**
 * A file on the webos's file system.
 * @param {Object} data The file's data.
 * @augments {Webos.File}
 * @constructor
 * @since 1.0beta1
 */
Webos.WebosFile = function WWebosFile(data) {
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.WebosFile.prototype = {
	hydrate: function(data) {
		if (data.path) {
			data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin recu

			if (!data.realpath) { //On définit automatiquement le chemin réel si non présent
				data.realpath = 'sbin/rawdatacall.php?type=file&path='+data.path;
			}
		}
		
		if (typeof data.readable == 'undefined') {
			data.readable = true;
		}
		if (typeof data.writable == 'undefined') {
			data.writable = true;
		}

		return Webos.File.prototype.hydrate.call(this, data);
	},
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				path: this.get('path')
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
			'class': 'FileController',
			method: 'rename',
			arguments: {
				file: that.get('path'),
				newName: newName
			}
		}).load([function(response) {
			var data = response.getData();

			that._updateData(data);

			callback.success(that);
		}, callback.error]);
	},
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'delete',
			arguments: {
				file: that.get('path')
			}
		}).load([function() {
			that._remove();
			callback.success();
		}, callback.error]);
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
		
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'getContents',
			arguments: {
				file: that.get('path')
			}
		}).load([function(response) {
			that.hydrate({
				is_dir: false
			});

			var contents = response.getStandardChannel();
			that._contents = contents;
			callback.success(contents);

			that.notify('updatecontents', { contents: contents });
			Webos.File.notify('load', { file: that });
		}, callback.error]);
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
				'class': 'FileController',
				method: 'getContents',
				arguments: {
					dir: this.get('path')
				}
			}).load([function(response) {
				var data = response.getData();
				var list = [];
				for (var key in data) {
					var webosFile = new Webos.WebosFile(data[key]);
					var file = Webos.File.get(webosFile.get('path'));
					if (Webos.isInstanceOf(file, Webos.WebosFile)) {
						file._updateData(webosFile.data());
					} else {
						file._updateData({
							is_dir: webosFile.get('is_dir')
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
	/**
	 * Get this file's content, encoded in base64.
	 * @param {Webos.Callback} callback The callback.
	 */
	readAsBinary: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return;
		}
		
		if (!this.checkAuthorization('read', callback)) {
			return false;
		}

		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'getAsBinary',
			arguments: {
				file: that.get('path')
			}
		}).load([function(response) {
			that.hydrate({
				is_dir: false
			});
			
			var contents = response.getStandardChannel();
			callback.success(contents);
		}, callback.error]);
	},
	_writeAsText: function(contents) {
		var that = this;
		
		if (this.get('is_dir')) {
			return false;
		}
		
		if (!this.can('write')) {
			return false;
		}
		
		var call = new Webos.ServerCall({
			'class': 'FileController',
			method: 'setContents',
			arguments: {
				file: that.get('path'),
				contents: contents
			}
		});

		call.bind('success', function(data) {
			var response = data.result;

			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(response.getData());
		});

		return call;
	},
	writeAsText: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return;
		}
		
		if (!this.checkAuthorization('write', callback)) {
			return false;
		}

		var call = this._writeAsText(contents);

		return call.load([function(response) {
			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(response.getData());

			callback.success();
		}, callback.error]);
	},
	/**
	 * Write this file's content, encoded in base64.
	 * @param {String} contents The base64-encoded content.
	 * @param {Webos.Callback} callback The callback.
	 */
	writeAsBinary: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return;
		}
		
		if (!this.checkAuthorization('write', callback)) {
			return false;
		}
		
		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'setContentsAsBinary',
			arguments: {
				file: that.get('path'),
				contents: contents
			}
		}).load([function(response) {
			that._updateData(response.getData());

			callback.success();
		}, callback.error]);
	},
	share: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		if (!this.checkAuthorization('write', callback)) {
			return false;
		}

		return new Webos.ServerCall({
			'class': 'FileController',
			method: 'share',
			arguments: {
				file: that.get('path')
			}
		}).load([function(response) {
			var shareData = response.getData();

			callback.success(shareData);
		}, callback.error]);
	}
};
Webos.inherit(Webos.WebosFile, Webos.File); //Héritage de Webos.File

/**
 * A local file (i.e. a file which is on the user's computer).
 * @param {File} file The native File object.
 * @constructor
 * @augments {Webos.File}
 * @since 1.0beta1
 */
Webos.LocalFile = function WLocalFile(file) {
	this._file = file;
	
	var data = {};
	
	data.basename = file.name || file.fileName;
	data.path = data.basename;
	data.dirname = '';
	data.realpath = null;
	data.is_dir = false;
	data.size = file.size || file.fileSize;
	data.extension = (/[.]/.exec(data.path)) ? /[^.]+$/.exec(data.path)[0] : null;
	data.type = file.type;
	
	data.readable = true;
	data.writable = false;
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.LocalFile.prototype = {
	realpath: function() {
		if (!this._get('realpath')) {
			var myURL = window.URL || window.webkitURL;
			if (myURL && myURL.createObjectURL) {
				this.hydrate({
					realpath: myURL.createObjectURL(this._file)
				});
			}
		}
		
		return this._get('realpath');
	},
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);

		callback.success(this);
	},
	readAsText: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!window.FileReader) {
			callback.error('La lecture de fichiers locaux n\'est pas support&eacute;e par votre navigateur');
			return;
		}
		
		var reader = new FileReader();
		reader.onload = function(e) {
			callback.success(e.target.result);
		};
		reader.onerror = function(e) {
			callback.error(e.target.result);
		};
		reader.readAsText(this._file);
	},
	readAsBinary: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!window.FileReader) {
			callback.error('La lecture de fichiers locaux n\'est pas support&eacute;e par votre navigateur');
			return;
		}
		
		var reader = new FileReader();
		reader.onload = function(e) {
			var contents = e.target.result;
			contents = contents.replace(/^data:[a-zA-Z0-9-_\/]+;base64,/, '');
			callback.success(contents);
		};
		reader.onerror = function(e) {
			callback.error(e.target.result);
		};
		reader.readAsDataURL(this._file);
	}
};
Webos.inherit(Webos.LocalFile, Webos.File); //Héritage de Webos.File

/**
 * True if local files are supported.
 * @static
 */
Webos.LocalFile.support = (window.File && window.FileReader) ? true : false;


//Events
Webos.User.bind('login logout', function() {
	//Lorsque l'utilisateur quitte sa session, on vide le cache
	Webos.File.clearCache();
});
Webos.User.bind('logout', function() {
	//On demonte tous les volumes
	for (var local in Webos.File.mountedDevices()) {
		Webos.File.umount(local);
	}
});

new Webos.ScriptFile('/usr/lib/webos/fstab.js');
