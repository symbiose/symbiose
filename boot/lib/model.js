/**
 * Représente un modèle de données.
 * @param data Les données.
 * @contructor
 */
Webos.Model = function WModel(data) {
	Webos.Observable.call(this);
	
	this._data = {};
	this._unsynced = {};
	
	this.hydrate(data);
};
Webos.Model.prototype = {
	/**
	 * Définir les données internes du modèle.
	 * @param {Object} data Les données.
	 * @private
	 */
	_hydrate: function(data) {
		if (!data) {
			return;
		}
		
		for (var key in data) {
			this._data[key] = data[key];
		}
	},
	/**
	 * Définir les données du modèle.
	 * @param {Object} data Les données.
	 */
	hydrate: function(data) {
		return this._hydrate(data);
	},
	/**
	 * Récupérer une valeur associée à une clef dans les données du modèle.
	 * @param key La clef.
	 * @returns La valeur associées à la clef.
	 */
	get: function(key) {
		if (typeof this[key] == 'function') {
			return this[key]();
		}
		var methodName = 'get' + key.charAt(0).toUpperCase() + key.substr(1);
		if (typeof this[methodName] == 'function') {
			return this[methodName]();
		}
		if (typeof this._data[key] != 'undefined') {
			return this._get(key);
		}
	},
	/**
	 * Récupérer une valeur associée à une clef dans les données du modèle.
	 * @param key La clef.
	 * @returns La valeur associées à la clef.
	 * @deprecated Depuis la version 1.0 alpha 1, utilisez Model#get().
	 */
	getAttribute: function(key) {
		return this.get(key);
	},
	/**
	 * Récupérer une valeur associée à une clef dans l'objet interne de données du modèle.
	 * @param key La clef.
	 * @returns La valeur associées à la clef.
	 * @private
	 */
	_get: function(key) {
		return this._data[key];
	},
	/**
	 * Récupérer toutes les données du modèle.
	 * @returns {Object} Les données.
	 */
	data: function() {
		return this._data;
	},
	/**
	 * Définir une valeur associée à une clef dans les données du modèle.
	 * @param key La clef.
	 * @param value La nouvelle valeur.
	 * @returns {Boolean} Vrai si la modification a réussi, faux dans le cas contraire.
	 */
	set: function(key, value) {
		var methodName = 'set' + key.charAt(0).toUpperCase() + key.substr(1);
		if (this.exists(key) && this.get(key) === value) {
			return true;
		}
		if (typeof this[methodName] == 'function') {
			this._set(key, value);
			return this[methodName](value);
		}
		
		this._set(key, value);
		return true;
	},
	/**
	 * Définir une valeur associée à une clef dans l'objet interne de données du modèle.
	 * @param key La clef.
	 * @param value La nouvelle valeur.
	 * @private
	 */
	_set: function(key, value) {
		this._unsynced[key] = { value: value, state: 1 };
		return true;
	},
	/**
	 * Tester si une clef existe dans les données du modèle.
	 * @param key La clef.
	 * @returns {Boolean} Vrai si la clef existe, faux dans le cas contraire.
	 */
	exists: function(key) {
		var methodName = 'get' + key.charAt(0).toUpperCase() + key.substr(1);
		if (typeof this[methodName] == 'function') {
			return true;
		}
		if (typeof this._data[key] != 'undefined') {
			return true;
		}
		return false;
	},
	/**
	 * Retirer une donnée du modèle.
	 * @param key La clef.
	 * @returns Vrai si la modification a réussi, faux sinon.
	 */
	remove: function(key) {
		var methodName = 'remove' + key.charAt(0).toUpperCase() + key.substr(1);
		if (!this.exists(key)) {
			return true;
		}
		if (typeof this[methodName] == 'function') {
			this[methodName]();
		}
		
		this._remove(key);
		return true;
	},
	/**
	 * Retirer une donnée dans l'objet interne de données du modèle.
	 * @param key La clef.
	 * @private
	 */
	_remove: function(key) {
		this._unsynced[key] = { value: undefined, state: 1 };
	},
	/**
	 * Envoyer les modifications effectuées sur le modèle vers le serveur.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelée une fois que les modifications auront été envoyées.
	 */
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		this._unsynced = {};
		callback.success();
	}
};
Webos.inherit(Webos.Model, Webos.Observable); //Héritage de Webos.Observable