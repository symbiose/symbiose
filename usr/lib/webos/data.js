/**
 * Crée une instance de Webos.DataFile.
 * @param {Object} data Les données.
 * @param {Webos.File} file Le fichier associé.
 * @since 1.0 beta 1
 * @constructor
 */
Webos.DataFile = function WDataFile(data, file) {
	Webos.Model.call(this, data);
	
	this._file = file;
};
Webos.DataFile.prototype = {
	/**
	 * Charger les données depuis le serveur.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les données seront chargées.
	 */
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		if (Webos.DataFile._cache[this._file.get('path')]) { //Si les données est déja chargée, pas besoin de le faire une deuxieme fois
			callback.success(Webos.DataFile._cache[this._file.get('path')]);
		} else {
			new Webos.ServerCall({
				'class': 'DataController',
				method: 'getData',
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
	 * Envoyer les modifications des données vers le serveur.
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
					remove[key] = value;
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
			'class': 'DataFileController',
			method: 'changeData',
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
Webos.inherit(Webos.DataFile, Webos.Model); //Heritage de Webos.Model

/**
 * Cache des fichiers de données.
 * @private
 * @static
 */
Webos.DataFile._cache = {};
/**
 * Récupérer un fichier de données.
 * @param path Le chemin vers le fichier.
 * @param {Object} [data] Les données du fichier.
 * @returns {Webos.DataFile} Le fichier de données.
 * @static
 */
Webos.DataFile.get = function(path, data) {
	var file = Webos.File.get(path);
	
	if (Webos.DataFile._cache[file.get('path')]) {
		return Webos.DataFile._cache[file.get('path')];
	} else {
		return new Webos.DataFile($.extend({}, data), file);
	}
};
/**
 * Charger un fichier de données.
 * @param path Le chemin vers le fichier.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le fichier de données.
 * @static
 */
Webos.DataFile.load = function(path, callback) {
	var file = Webos.File.get(path);
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.DataFile._cache[file.get('path')]) {
		callback.success(Webos.DataFile._cache[file.get('path')]);
	} else {
		new Webos.ServerCall({
			'class': 'DataFileController',
			method: 'getData',
			arguments: {
				path: file.get('path')
			}
		}).load(new Webos.Callback(function(response) {
			var config = new Webos.DataFile(response.getData(), file);
			Webos.DataFile._cache[file.get('path')] = config;
			callback.success(config);
		}, callback.error));
	}
};
/**
 * Charger un fichier de données utilisateur.
 * @param path Le chemin vers le fichier de données utilisateur (doit se situer dans son dossier personnel, ~).
 * @param basePath Le chemin vers le modele du fichier de données, au cas ou l'utilisateur n'est pas connecte ou le fichier n'existe pas.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée avec en argument le fichier de données.
 * @static
 */
Webos.DataFile.loadUserData = function(path, basePath, callback) {
	var file = Webos.File.get(path);
	if (basePath) {
		var baseFile = Webos.File.get(basePath);
	} else {
		var baseFile = null;
	}
	callback = Webos.Callback.toCallback(callback);
	
	Webos.User.getLogged(function(user) {
		if (user && Webos.DataFile._cache[file.get('path')]) {
			callback.success(Webos.DataFile._cache[file.get('path')]);
		} else if (!user && baseFile && Webos.DataFile._cache[baseFile.get('path')]) {
			callback.success(Webos.DataFile._cache[baseFile.get('path')]);
		} else if (!user && !baseFile) {
			var config = new Webos.DataFile({}, file);
			callback.success(config);
		} else {
			new Webos.ServerCall({
				'class': 'DataFileController',
				method: 'getUserData',
				arguments: {
					path: file.get('path'),
					base: (baseFile) ? baseFile.get('path') : null
				}
			}).load(new Webos.Callback(function(response) {
				var loadedFile = (user) ? file : baseFile;
				var config = new Webos.DataFile(response.getData(), loadedFile);
				Webos.DataFile._cache[loadedFile.get('path')] = config;
				callback.success(config);
			}, callback.error));
		}
	});
};
/**
 * Vider le cache des fichiers de données.
 * @static
 */
Webos.DataFile.clearCache = function() {
	Webos.DataFile._cache = {};
};

//Lorsque l'utilisateur quitte sa session, on vide le cache
Webos.User.bind('logout', function() {
	Webos.DataFile.clearCache();
});