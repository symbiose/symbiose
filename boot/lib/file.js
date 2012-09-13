/**
 * Bibliotheque de gestion des fichiers.
 * @author $imon
 * @since 1.0 alpha 1
 */

/**
 * Représente un fichier.
 * @param {Object} data Les données sur le fichier.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.File = function WFile(data) {
	if (!data.dirname) { //On définit automatiquement le dossier parent si non présent
		if (data.path.indexOf('/', 1) != -1) {
			data.dirname = data.path.replace(/\/[^\/]*\/?$/, '');
		} else if (data.path.indexOf('/') == 0) {
			data.dirname = '/';
		}
	}
	if (!data.basename) { //On définit automatiquement le nom du fichier si non présent
		data.basename = data.path.replace(/^.*[\/\\]/g, '');
	}
	if (data.is_dir === false && !data.extension) { //On définit automatiquement l'extension du fichier si non présent et que le fichier n'est pas un dossier
		data.extension = (/[.]/.exec(data.path)) ? /[^.]+$/.exec(data.path)[0] : null;
	}
	
	data.readable = (data.readable) ? true : false;
	data.writable = (data.writable) ? true : false;
	
	Webos.Model.call(this, data); //On appelle la classe parente
};
Webos.File.prototype = {
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
	 * Déplacer le fichier.
	 * @param {String} dest La destination du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
	 */
	move: function(dest, callback) {
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
	 * @param {String} contents Le contenu.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
	 */
	setContents: function(contents, callback) {
		this._unsupportedMethod(callback);
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
Webos.File.get = function(file, data) {
	if (file instanceof File) { //Si c'est un objet natif File, on retorune un objet Webos.LocalFile
		return new Webos.LocalFile(file);
	} else if (Webos.isInstanceOf(file, Webos.File)) { //Si c'est déja un objet Webos.File, on le retourne directement
		return file;
	}
	
	path = String(file);
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			return Webos[devices[local].get('driver')].get(path, devices[local], data);
		}
	}
	
	if (Webos.File._cache[path]) { //Si le fichier est dans le cache, on le retourne
		return Webos.File._cache[path];
	} else { //Sinon, on crée un nouvel objet
		file = new Webos.WebosFile($.extend({}, data, {
			path: path
		}));
		Webos.File._cache[file.get('path')] = file;
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
			Webos.File._cache[file.get('path')].hydrate(file.data());
			file = Webos.File._cache[file.get('path')];
			Webos.File.notify('load', { file: file });
		} else {
			Webos.File._cache[file.getAttribute('path')] = file;
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
	
	if (typeof Webos.File._cache[path] != 'undefined') { //Si le fichier est déja dans le cache, on le retourne
		callback.success(Webos.File._cache[path]);
	} else { //Sinon, on le charge
		var file = Webos.File.get(path);
		
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
	
	var createFileCallback = function(file) {
		Webos.File._cache[file.get('path')] = file;
		Webos.File.notify('create', { file: file });
	};
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			(function(point) {
				Webos[point.get('driver')].createFile(path, point, [function(file) {
					createFileCallback(file);
					callback.success(file);
				}, callback.error]);
			})(devices[local]);
			return;
		}
	}
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFile',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.WebosFile(response.getData());
		createFileCallback(file);
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Créer un nouveau dossier.
 * @param path Le chemin vers le nouveau dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le dossier sera créé.
 * @static
 */
Webos.File.createFolder = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var createFolderCallback = function(file) {
		Webos.File._cache[file.get('path')] = file;
		Webos.File.notify('create', { file: file });
	};
	
	//Le fichier est-il dans un volume monte ?
	var devices = Webos.File.mountedDevices();
	for (var local in devices) {
		if (Webos.File.cleanPath(path).indexOf(local) == 0) {
			(function(point) {
				Webos[point.get('driver')].createFolder(path, point, [function(file) {
					createFolderCallback(file);
					callback.success(file);
				}, callback.error]);
			})(devices[local]);
			return;
		}
	}
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFolder',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.WebosFile(response.getData());
		createFolderCallback(file);
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Vider le cache interne de la bibliotheque des fichiers.
 * @param {String} [path] Si spécifié, seul le cache du fichier ayant ce chemin sera vidé.
 * @static
 */
Webos.File.clearCache = function(path) {
	if (typeof path == 'undefined') {
		Webos.File._cache = {};
	} else {
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
	data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin recu
	if (!data.realpath) { //On définit automatiquement le chemin réel si non présent
		data.realpath = 'sbin/filecall.php?file='+data.path;
	}
	
	if (typeof data.readable == 'undefined') {
		data.readable = true;
	}
	if (typeof data.writable == 'undefined') {
		data.writable = true;
	}
	
	Webos.File.call(this, data); //On appelle la classe parente
};
Webos.WebosFile.prototype = {
	/**
	 * Charge les informations sur les fichiers.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les informations seront chargées.
	 */
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.File.clearCache(this.get('path'));
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				path: this.get('path')
			}
		}).load([function(response) {
			var data = response.getData();
			
			var updatedData = {};
			for (var key in data) {
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
		}]);
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
			return;
		}
		
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
	/**
	 * Déplacer le fichier.
	 * @param {String} dest La destination du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
	 */
	move: function(dest, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		dest = String(dest);
		
		if (!this.checkAuthorization('read', callback)) {
			return;
		}
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				file: that.get('path'),
				dest: dest
			}
		}).load(new Webos.Callback(function() {
			that._remove();
			callback.success();
		}, function(response) {
			callback.error(response, that);
		}));
	},
	/**
	 * Supprimer le fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera déplacé.
	 */
	remove: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!this.checkAuthorization('write', callback)) {
			return;
		}
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'delete',
			arguments: {
				file: that.get('path')
			}
		}).load(new Webos.Callback(function() {
			that._remove();
			callback.success();
		}, function(response) {
			callback.error(response, that);
		}));
	},
	_remove: function() {
		this.notify('remove');
		Webos.File.notify('remove', { file: this });
		
		Webos.File.clearCache(this.get('path'));
		delete this;
	},
	/**
	 * Récupérer le contenu du fichier.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du fichier. Si c'est un dossier, un tableau de fichiers sera fournit.
	 */
	contents: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (!this.checkAuthorization('read', callback)) {
			return;
		}
		
		if (typeof this._contents != 'undefined') {
			callback.success(this._contents);
			return;
		}
		
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
					var file = new Webos.WebosFile(data[key]);
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
						Webos.File.notify('load', { file: file });
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
				that._contents = list;
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
				var contents = response.getStandardChannel();
				that._contents = contents;
				callback.success(contents);
			}, function(response) {
				callback.error(response);
			}));
		}
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
	 * @param {String} contents Le contenu.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera modifié.
	 */
	setContents: function(contents, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		if (this.get('is_dir')) {
			this._unsupportedMethod(callback);
			return;
		}
		
		if (!this.checkAuthorization('write', callback)) {
			return;
		}
		
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
	contents: function(callback) {
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
	}
};
Webos.inherit(Webos.LocalFile, Webos.File); //Héritage de Webos.File

Webos.LocalFile.support = (window.File && window.FileReader) ? true : false;

Webos.User.bind('login logout', function() {
	//Lorsque l'utilisateur quitte sa session, on vide le cache
	Webos.File.clearCache();
	
	//Et on demonte tous les volumes
	for (var local in Webos.File.mountedDevices()) {
		Webos.File.umount(local);
	}
});

new Webos.ScriptFile('/usr/lib/webos/fstab.js');