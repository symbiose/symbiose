/**
 * Crée une instance de Webos.File.
 * @param {Object} data Les données sur le fichier.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.File = function WFile(data) {
	data.path = Webos.File.cleanPath(data.path); //On nettoie le chemin reçu
	if (!data.dirname) { //On définit automatiquement le dossier pârent si non présent
		data.dirname = data.path.replace(/\/[^\/]*\/?$/, '');
	}
	if (!data.realpath) { //On définit automatiquement le chemin réel si non présent
		data.realpath = 'sbin/filecall.php?file='+data.path;
	}
	if (!data.basename) { //On définit automatiquement le nom du fichier si non présent
		data.basename = data.path.replace(/^.*[\/\\]/g, '');
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
		
		new Webos.ServerCall({
			'class': 'FileController',
			method: 'move',
			arguments: {
				file: that.get('path'),
				dest: dest.get('path')
			}
		}).load(new Webos.Callback(function() {
			that._remove();
			callback.success(dest);
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
 */
Webos.File._cache = {};
/**
 * Récupérer un fichier.
 * @param file Le chemin vers le fichier.
 * @param {Object} [data] Les données sur le fichier.
 */
Webos.File.get = function(file, data) {
	path = String(file);
	
	if (Webos.File._cache[path]) { //Si le fichier est dans le cache, on le retourne
		return Webos.File._cache[path];
	} else if (file instanceof Webos.File) { //Si c'est déjà un objet Webos.File, on le retourne directement
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
 */
Webos.File.load = function(path, callback) {
	path = String(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (typeof Webos.File._cache[path] != 'undefined') { //Si le fichier est déjà dans le cache, on le retourne
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
			if (typeof Webos.File._cache[file.getAttribute('path')] != 'undefined') {
				Webos.File._cache[file.getAttribute('path')].hydrate(file.data());
				file = Webos.File._cache[file.getAttribute('path')];
				Webos.File.notify('load', { file: file });
			} else {
				Webos.File._cache[file.getAttribute('path')] = file;
			}
			
			callback.success(file);
		}, callback.error));
	}
};
/**
 * Lister le contenu d'un dossier.
 * @param path Le chemin vers le dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le contenu du dossier.
 */
Webos.File.listDir = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var file = Webos.File.get(path, { is_dir: true }); //On construit notre objet

	//Puis on récupère son contenu
	file.contents([function(list) {
		callback.success(list);
	}, callback.error]);
};
/**
 * Créer un fichier vide.
 * @param path Le chemin vers le nouveau fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le fichier sera créé.
 */
Webos.File.createFile = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFile',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Créer un nouveau dossier.
 * @param path Le chemin vers le nouveau dossier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que le dossier sera créé.
 */
Webos.File.createFolder = function(path, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'createFolder',
		arguments: {
			file: path
		}
	}).load(new Webos.Callback(function(response) {
		var file = new Webos.File(response.getData());
		Webos.File._cache[file.getAttribute('path')] = file;
		Webos.File.notify('create', { file: file });
		callback.success(file);
	}, function(response) {
		callback.error(response);
	}));
};
/**
 * Vider le cache interne de la bibliothèque des fichiers.
 * @param {String} [path] Si spécifié, seul le cache du fichier ayant ce chemin sera vidé.
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
 * @param {String} path Le chemin à nettoyer.
 * @returns {String} Le chemin nettoyé.
 */
Webos.File.cleanPath = function(path) {
	return path
		.replace(/\/+/, '/')
		.replace('/./', '/')
		.replace(/\/\.$/, '/')
		.replace(/(.+)\/$/, '$1');
};
/**
 * Convertir une taille en octets vers une taille lisible par un être humain (ex : 1024 -> 1 Kio).
 * @param {Number} bytes La taille en octets à convertir.
 * @returns {String} La taille convertie, suivie de l'unité.
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

//Lorsque l'utilisateur quitte sa session, on vide le cache
Webos.User.bind('logout', function() {
	Webos.File.clearCache();
});