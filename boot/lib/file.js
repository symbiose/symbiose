/**
 * Bibliotheque de gestion des fichiers.
 * @author $imon
 * @since 1.0 alpha 1
 */

/**
 * Crée une instance de Webos.File.
 * @param {Object} data Les données sur le fichier.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.File = function WFile(data) {
	data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin recu
	if (!data.dirname) { //On définit automatiquement le dossier pérent si non présent
		data.dirname = data.path.replace(/\/[^\/]*\/?$/, '');
	}
	if (!data.realpath) { //On définit automatiquement le chemin réel si non présent
		data.realpath = 'sbin/filecall.php?file='+data.path;
	}
	if (!data.basename) { //On définit automatiquement le nom du fichier si non présent
		data.basename = data.path.replace(/^.*[\/\\]/g, '');
	}
	if (data.is_dir === false && !data.extension) {//On définit automatiquement l'extension du fichier si non présent et que le fichier n'est pas un dossier
		data.extension = (/[.]/.exec(data.path)) ? /[^.]+$/.exec(data.path)[0] : null;
	}
	
	Webos.Model.call(this, data); //On appelle la classe parente
};
Webos.File.prototype = {
	/**
	 * Charge les informations sur les fichiers.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les informations seront chargées.
	 */
	load: function(callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
		Webos.File.clearCache(that.get('path'));
		Webos.File.load(that.get('path'), new Webos.Callback(function(file) {
			var updatedData = {};
			for (var key in file.data()) {
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
		}));
	},
	/**
	 * Renomme le fichier.
	 * @param {String} newName Le nouveau nom.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera renommé.
	 */
	rename: function(newName, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);
		
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
					var file = new Webos.File(data[key]);
					if (Webos.File._cache[file.get('path')]) {
						Webos.File._cache[file.get('path')].hydrate(file.data());
						file = Webos.File._cache[file.get('path')];
						Webos.File.notify('load', { file: file });
					} else {
						Webos.File._cache[file.get('path')] = file;
					}
					list.push(file);
				}
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
				callback.success(response.getStandardChannel(), that);
			}, function(response) {
				callback.error(response, that);
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
			callback.error();
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
	} else if (file instanceof Webos.File) { //Si c'est déja un objet Webos.File, on le retourne directement
		return file;
	} else { //Sinon, on crée un nouvel objet
		return new Webos.File($.extend({}, data, {
			path: path
		}));
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
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'getData',
			arguments: {
				file: path
			}
		}).load(new Webos.Callback(function(response) {
			var file = new Webos.File(response.getData()); //On construit notre objet
			
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
		var file = new Webos.File(response.getData());
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
		var file = new Webos.File(response.getData());
		createFolderCallback(file);
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Vider le cache interne de la bibliothéque des fichiers.
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
	return path
		.replace(/\/+/, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/')
		.replace(/(.+)\/$/, '$1');
};
/**
 * Convertir une taille en octets vers une taille lisible par un étre humain (ex : 1024 -> 1 Kio).
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

Webos.File.mountedDevices = function() {
	return Webos.File._mountedDevices;
};

Webos.File.getMountData = function(local) {
	return Webos.File._mountedDevices[local];
};

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

Webos.User.bind('login logout', function() {
	//Lorsque l'utilisateur quitte sa session, on vide le cache
	Webos.File.clearCache();
	
	//Et on demonte tous les volumes
	for (var local in Webos.File.mountedDevices()) {
		Webos.File.umount(local);
	}
});

new Webos.ScriptFile('/usr/lib/webos/fstab.js');
