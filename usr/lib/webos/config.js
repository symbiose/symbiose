/**
 * Crée une instance de Webos.ConfigFile.
 * @param {Object} data La configuration.
 * @param {Webos.File} file Le fichier associé.
 * @since 1.0 alpha 3
 * @constructor
 */
Webos.ConfigFile = function WConfigFile(data, file) {
	Webos.Model.call(this, data);
	
	this._file = file;
};
Webos.ConfigFile.prototype = {
	/**
	 * Charger la configuration depuis le serveur.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que la configuration sera chargée.
	 */
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		if (Webos.ConfigFile._cache[this._file.get('path')]) { //Si la configuration est déja chargée, pas besoin de le faire une deuxieme fois
			callback.success(Webos.ConfigFile._cache[this._file.get('path')]);
		} else {
			new Webos.ServerCall({
				'class': 'ConfigController',
				method: 'getConfig',
				arguments: {
					path: this._file.get('path')
				}
			}).load(new Webos.Callback(function(response) {
				var data = response.getData(), updatedData = {};
				for (var key in data) {
					if (that.get(key) !== data[key]) {
						updatedData[key] = data[key];
					}
				}
				that.hydrate(updatedData);
				callback.success(that);
				for (var key in updatedData) {
					that.notify('update', { key: key, value: updatedData[key] });
				}
			}, callback.error));
		}
	},
	/**
	 * Envoyer les modifications de la configuration vers le serveur.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les modifications seront envoyées.
	 */
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		var data = {}, remove = {};
		var nbrChanges = 0;
		
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				var value = this._unsynced[key].value;
				if (typeof value != 'undefined') {
					data[key] = value;
				} else {
					remove[key] = true;
				}
				
				this._unsynced[key].state = 2;
				nbrChanges++;
			}
		}
		
		if (nbrChanges === 0) {
			callback.success(this);
			return;
		}
		
		new Webos.ServerCall({
			'class': 'ConfigController',
			method: 'changeConfig',
			arguments: {
				path: this._file.get('path'),
				set: data,
				remove: remove
			}
		}).load(new Webos.Callback(function() {
			for (var key in that._unsynced) {
				if (that._unsynced[key].state === 2) {
					that._data[key] = that._unsynced[key].value;
					delete that._unsynced[key];
					that.notify('update', { key: key, value: that._data[key] });
				}
			}
			callback.success(that);
		}, callback.error));
	}
};
Webos.inherit(Webos.ConfigFile, Webos.Model); //Heritage de Webos.Model

/**
 * Cache des fichiers de configuration.
 * @private
 * @static
 */
Webos.ConfigFile._cache = {};
/**
 * Récupérer un fichier de configuration.
 * @param path Le chemin vers le fichier.
 * @param {Object} [data] La configuration du fichier.
 * @returns {Webos.ConfigFile} Le fichier de configuration.
 * @static
 */
Webos.ConfigFile.get = function(path, data) {
	var file = Webos.File.get(path);
	
	if (Webos.ConfigFile._cache[file.get('path')]) {
		return Webos.ConfigFile._cache[file.get('path')];
	} else {
		return new Webos.ConfigFile($.extend({}, data), file);
	}
};
/**
 * Charger un fichier de configuration.
 * @param path Le chemin vers le fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le fichier de configuration.
 * @static
 */
Webos.ConfigFile.load = function(path, callback) {
	var file = Webos.File.get(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.ConfigFile._cache[file.get('path')]) {
		callback.success(Webos.ConfigFile._cache[file.get('path')]);
	} else {
		new Webos.ServerCall({
			'class': 'ConfigController',
			method: 'getConfig',
			arguments: {
				path: file.get('path')
			}
		}).load(new Webos.Callback(function(response) {
			var config = new Webos.ConfigFile(response.getData(), file);
			Webos.ConfigFile._cache[file.get('path')] = config;
			callback.success(config);
		}, callback.error));
	}
};
/**
 * Charger un fichier de configuration utilisateur.
 * @param path Le chemin vers le fichier de configuration utilisateur (doit se situer dans son dossier personnel, ~).
 * @param basePath Le chemin vers le modele du fichier de configuration, au cas ou l'utilisateur n'est pas connecte ou le fichier n'existe pas.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le fichier de configuration.
 * @static
 */
Webos.ConfigFile.loadUserConfig = function(path, basePath, callback) {
	var file = Webos.File.get(path), baseFile = null, baseData = {};
	if (typeof basePath == 'object' && !Webos.isInstanceOf(basePath, Webos.File)) {
		baseData = basePath;
	} else if (basePath) {
		baseFile = Webos.File.get(basePath);
	}
	callback = Webos.Callback.toCallback(callback);
	
	Webos.User.getLogged(function(user) {
		if (user && Webos.ConfigFile._cache[file.get('path')]) {
			callback.success(Webos.ConfigFile._cache[file.get('path')]);
		} else if (!user && baseFile && Webos.ConfigFile._cache[baseFile.get('path')]) {
			callback.success(Webos.ConfigFile._cache[baseFile.get('path')]);
		} else if (!user && !baseFile) {
			var config = new Webos.ConfigFile(baseData, file);
			callback.success(config);
		} else {
			new Webos.ServerCall({
				'class': 'ConfigController',
				method: 'getUserConfig',
				arguments: {
					path: file.get('path'),
					base: (baseFile) ? baseFile.get('path') : baseData
				}
			}).load(new Webos.Callback(function(response) {
				var loadedFile = (user) ? file : baseFile;
				var config = new Webos.ConfigFile(response.getData(), loadedFile);
				if (loadedFile) {
					Webos.ConfigFile._cache[loadedFile.get('path')] = config;
				}
				callback.success(config);
			}));
		}
	});
};
/**
 * Vider le cache des fichiers de configuration.
 * @static
 */
Webos.ConfigFile.clearCache = function() {
	Webos.ConfigFile._cache = {};
};

//Lorsque l'utilisateur quitte sa session, on vide le cache
Webos.User.bind('logout', function() {
	Webos.ConfigFile.clearCache();
});