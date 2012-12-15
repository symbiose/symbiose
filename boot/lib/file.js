/**
 * Bibliotheque de gestion des fichiers.
 * @author $imon
 * @since 1.0 alpha 1
 */

 /**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/
Webos.base64 = {
	// private property
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
	// public method for encoding
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
 
	// public method for decoding
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
 * Représente un fichier.
 * @param {Object} data Les données sur le fichier.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.File = function WFile(data) {
	Webos.Model.call(this, data); //On appelle la classe parente
};
Webos.File.prototype = {
	hydrate: function(data) {
		var path = (data.path || this.get('path'));
		if (path) {
			if (!data.dirname) { //On définit automatiquement le dossier parent si non présent
				if (path.indexOf('/', 1) != -1) {
					data.dirname = path.replace(/\/[^\/]*\/?$/, '');
				} else if (path.indexOf('/') == 0) {
					data.dirname = '/';
				}
			}
			if (!data.basename) { //On définit automatiquement le nom du fichier si non présent
				data.basename = path.replace(/^.*[\/\\]/g, '');
			}
			if (data.is_dir === false && !data.extension) { //On définit automatiquement l'extension du fichier si non présent et que le fichier n'est pas un dossier
				data.extension = (/[.]/.exec(path)) ? /[^.]+$/.exec(path)[0] : null;
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
	 * Déclenche une erreur en raison de l'impossibilité d'effectuer une action sur ce type de fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée.
	 * @private
	 */
	_unsupportedMethod: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.error(Webos.Callback.Result.error('Op&eacute;ration impossible sur le type du fichier "'+this.get('path')+'"'));
	},
	/**
	 * Charge les informations sur le fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les informations seront chargées.
	 */
	load: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Renomme le fichier.
	 * @param {String} newName Le nouveau nom.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera renommé.
	 */
	rename: function(newName, callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Supprimer le fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
	 */
	remove: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Récupérer le contenu du fichier sous forme de texte.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
	 */
	readAsText: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Récupérer le contenu du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
	 */
	contents: function(callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Récupérer le contenu du fichier.
	 * @deprecated Depuis la version 1.0 alpha 3, il faut utiliser Webos.File#contents().
	 */
	getContents: function(callback) {
		return this.contents(callback);
	},
	/**
	 * Définir le contenu du fichier.
	 * @param {String} contents Le contenu sous forme de texte.
	 */
	_writeAsText: function(contents) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Définir le contenu du fichier.
	 * @param {String} contents Le contenu sous forme de texte.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
	 */
	writeAsText: function(contents, callback) {
		this._unsupportedMethod(callback);
	},
	/**
	 * Définir le contenu du fichier.
	 * @param {String} contents Le contenu.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
	 * @deprecated Depuis la version 1.0 beta 1, il faut utiliser Webos.File#writeAsText().
	 */
	setContents: function(contents, callback) {
		return this.writeAsText(contents, callback);
	},
	/**
	 * Définir si l'utilisateur peut effectuer une action sur le fichier.
	 * @param {String} auth L'autorisation. Peut etre "read" ou "write".
	 * @returns {Boolean} Vrai si l'utilisateur a le droit d'effectuer l'action.
	 */
	can: function(auth) {
		var attr = (auth == 'read') ? 'readable' : 'writable';
		
		return this.get(attr);
	},
	/**
	 * Définir si le fichier possede un libelle.
	 * @param {String} label Le libelle.
	 * @returns {Boolean} Vrai si le fichier possede le libelle.
	 */
	is: function(label) {
		return (this._get('labels') && this._get('labels')[label]) ? true : false;
	},
	/**
	 * Vérifier que l'utilisateur peut effectuer une action. Déclencher une erreur si non.
	 * @param {String} auth L'autorisation. Peut etre "read" ou "write".
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée.
	 * @returns {Boolean} Vrai si l'utilisateur a le droit d'effectuer l'action.
	 */
	checkAuthorization: function(auth, callback) {
		if (!this.can(auth)) {
			callback = Webos.Callback.toCallback(callback);
			
			callback.error(Webos.Callback.Result.error('Vous n\'avez pas les droits requis pour ' + ((auth == 'read') ? 'ouvrir' : 'modifier') + ' le fichier "' + this.get('path') + '"'));
			
			return false;
		}
		
		return true;
	},
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
 * Cache des fichiers.
 * @private
 * @static
 */
Webos.File._cache = {};

/**
 * Liste des volumes montés.
 * @private
 * @static
 */
Webos.File._mountedDevices = {};

/**
 * Récupérer un fichier.
 * @param file Le chemin vers le fichier.
 * @param {Object} [data] Les données sur le fichier.
 * @returns {Webos.File} Le fichier.
 * @static
 */
Webos.File.get = function(file, data, disableCache) {
	if (window.File && file instanceof window.File) { //Si c'est un objet natif File, on retorune un objet Webos.LocalFile
		return new Webos.LocalFile(file);
	} else if (Webos.isInstanceOf(file, Webos.File)) { //Si c'est déja un objet Webos.File, on le retourne directement
		return file;
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
 * Charger les données sur un fichier.
 * @param {String} path Le chemin vers le fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le fichier.
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
 * Lister le contenu d'un dossier.
 * @param path Le chemin vers le dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du dossier.
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
 * Créer un fichier vide.
 * @param path Le chemin vers le nouveau fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera créé.
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
 * Créer un nouveau dossier.
 * @param path Le chemin vers le nouveau dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le dossier sera créé.
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
			if (source.get('is_binary') && typeof source.readAsBinary == 'function' && typeof dest.writeAsBinary == 'function') {
				copyBinaryFileFn(source, dest, callback);
			} else {
				copyTextFileFn(source, dest, callback);
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
 * Déplacer un fichier vers un autre.
 * @param {Webos.File} source Le fichier source.
 * @param {Webos.File} dest Le fichier de destination.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
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
 * Determiner si un fichier est actuellement en cache.
 * @param {String} path Le chemin vers le fichier.
 * @returns {Boolean} Vrai si le fichier est dans le cache interne de la bibliotheque des fichiers.
 * @static
 */
Webos.File.isCached = function(path) {
	return (typeof Webos.File._cache[path] != 'undefined');
};
/**
 * Vider le cache interne de la bibliotheque des fichiers.
 * @param {String} [path] Si spécifié, seul le cache du fichier ayant ce chemin sera vidé.
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
 * Nettoyer un chemin.
 * @param {String} path Le chemin a nettoyer.
 * @returns {String} Le chemin nettoyé.
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
 * Convertir une taille en octets vers une taille lisible par un etre humain (ex : 1024 -> 1 Kio).
 * @param {Number} bytes La taille en octets a convertir.
 * @returns {String} La taille convertie, suivie de l'unité.
 * @static
 */
Webos.File.bytesToSize = function(bytes) {
	var sizes = [ 'octets', 'Kio', 'Mio', 'Gio', 'Tio', 'Pio', 'Eio', 'Zio', 'Yio' ];
	if (bytes <= 1)
		return bytes+' octet';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return ((i == 0) ? (bytes / Math.pow(1024, i))
			: (bytes / Math.pow(1024, i)).toFixed(1))
			+ ' ' + sizes[i];
};

/**
 * Représente un point de montage.
 * @param {Object} data Les données sur le point de montage.
 * @param {String} local Le chemin local du point de montage.
 */
Webos.File.MountPoint = function WMountPoint(data, local) {
	Webos.Model.call(this, data);
	
	this._local = local;
};
Webos.File.MountPoint.prototype = {
	local: function() {
		return this._local;
	},
	setData: function(data) {
		this._data.data = data;
	},
	data: function() {
		return this._data.data;
	},
	getRelativePath: function(path) {
		return Webos.File.cleanPath(String(path).replace(this.get('local'), this.get('remote') + '/'));
	},
	getWebosPath: function(path) {
		if (!this.get('remote')) {
			return Webos.File.cleanPath(this.get('local') + '/' + String(path));
		}
		
		return Webos.File.cleanPath(String(path).replace(this.get('remote'), this.get('local') + '/'));
	}
};
Webos.inherit(Webos.File.MountPoint, Webos.Model);

/**
 * Monter un volume.
 * @param {Webos.File.MountPoint} point Le point de montage.
 * @param {Webos.Callback} callback La fonction qui sera appelée suite au montage du volume.
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
 * Récupérer la liste des volumes montés.
 * @returns {Object} Un objet faisant correspondre les chemins locaux aux points de montage.
 */
Webos.File.mountedDevices = function() {
	return Webos.File._mountedDevices;
};

Webos.File.getMountData = function(local) {
	return Webos.File._mountedDevices[local];
};

/**
 * Démonter un volume.
 * @param {Webos.File.MountPoint} point Le point de montage.
 */
Webos.File.umount = function(local) {
	if (Webos.File._mountedDevices[local]) {
		var point = Webos.File._mountedDevices[local], data = { local: point.get('local'), driver: point.get('driver'), remote: point.get('remote'), point: point };
		delete Webos.File._mountedDevices[local];
		Webos.File.notify('umount', data);

		Webos.File.clearCache(data.local, true);
	}
};

Webos.File._drivers = {};

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
Webos.File.getDriverData = function(driverName) {
	return Webos.File._drivers[driverName];
};

/**
 * Représente un fichier sur le systeme de fichiers du webos.
 * @param {Object} data Les données sur le fichier.
 * @since 1.0 beta 1
 * @constructor
 */
Webos.WebosFile = function WWebosFile(data) {
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.WebosFile.prototype = {
	hydrate: function(data) {
		if (data.path) {
			data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin recu

			if (!data.realpath) { //On définit automatiquement le chemin réel si non présent
				data.realpath = 'sbin/filecall.php?file='+data.path;
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
	/**
	 * Charge les informations sur les fichiers.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les informations seront chargées.
	 */
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
	/**
	 * Renomme le fichier.
	 * @param {String} newName Le nouveau nom.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera renommé.
	 */
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
	/**
	 * Supprimer le fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
	 */
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
	/**
	 * Récupérer le contenu du fichier, sous forme de texte.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier.
	 */
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
	/**
	 * Récupérer le contenu du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
	 */
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
	 * Récupérer le contenu du fichier, encode en base 64.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
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
			var response = data.response;

			that._contents = contents;

			that.notify('updatecontents', { contents: contents });

			that._updateData(response.getData());
		});

		return call;
	},
	/**
	 * Définir le contenu du fichier, sous forme de texte.
	 * @param {String} contents Le contenu.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
	 */
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
	 * Définir le contenu du fichier, encode en base 64.
	 * @param {String} contents Le contenu en base 64.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
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
	}
};
Webos.inherit(Webos.WebosFile, Webos.File); //Héritage de Webos.File

/**
 * Représente un fichier local (sur l'ordinateur du client).
 * @param {File} file L'objet natif File correspondant au fichier.
 * @since 1.0 beta 1
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

Webos.LocalFile.support = (window.File && window.FileReader) ? true : false;

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