/**
 * Crée une instance de Webos.Callback, contenant une fonction de rappel qui sera appelée en cas de succès et une fonction qui sera éxécutée en cas d'erreur.
 * @param {Function} successCallback La fonction qui sera éxécutée en cas de succès.
 * @param {Function} errorCallback La fonction qui sera éxécutée en cas d'erreur.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.Callback = function WCallback(successCallback, errorCallback) {
	var that = this;
	
	Webos.Observable.call(this);
	
	this.callbacks = { //Callbacks
		success: {
			callback: function() {}, //La fonction
			arguments: [],
			context: null //Le contexte
		},
		error: {
			callback: function(error) {
				Webos.Error.trigger(error);
			}, //La fonction
			arguments: [],
			context: null //Le contexte
		}
	};
	
	this.process = (Webos.Process && Webos.Process.current()) ? Webos.Process.current() : null;
	
	//Si une fonction de callback pour un succes est specifiée
	if (typeof successCallback === 'function') {
		this.callbacks.success.callback = successCallback;
	}
	
	//Si la fonction pour les erreurs est specifiée
	if (typeof errorCallback === 'function') {
		this.callbacks.error.callback = errorCallback;
	}
	
	/**
	 * Appeler la fonction de succès.
	 * @returns La valeur renvoyée par la fonction.
	 */
	this.success = function() {
		var args = []; //On convertit l'objet arguments en array
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		args = args.concat(that.callbacks.success.arguments);
		
		if (this.process) {
			Webos.Process.stack.push(this.process);
		}
		
		//On éxécute le callback
		var result;
		try {
			result = that.callbacks.success.callback.apply(that.callbacks.success.context, args);
		} catch(e) {
			Webos.Error.catchError(e);
		} finally {
			if (this.process) {
				Webos.Process.stack.pop();
			}
			return result;
		}
	};
	/**
	 * Appeler la fonction d'erreur.
	 * @returns La valeur renvoyée par la fonction.
	 */
	this.error = function() {
		var args = []; //On convertit l'objet arguments en array
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		args = args.concat(that.callbacks.error.arguments);
		
		if (this.process) {
			Webos.Process.stack.push(this.process);
		}
		
		//On éxécute le callback
		var result;
		try {
			result = that.callbacks.error.callback.apply(that.callbacks.error.context, args);
		} catch(e) {
			Webos.Error.catchError(e);
		} finally {
			if (this.process) {
				Webos.Process.stack.pop();
			}
			return result;
		}
	};
};
Webos.Callback.prototype = {
	/**
	 * Ajouter un paramètre à envoyer à une des fonctions.
	 * @param value Le paramètre à envoyer.
	 * @param {String} [callback="success"] La fonction concernée ("success" ou "error").
	 */
	addParam: function(value, callback) {
		if (!callback) {
			callback = 'success';
		}
		this.callbacks[callback].arguments.push(value);
	},
	/**
	 * Ajouter des paramètres à envoyer à une des fonctions.
	 * @param {any[]} values Un tableau contenant les paramètres à envoyer.
	 * @param {String} [callback="success"] La fonction concernée ("success" ou "error").
	 */
	addParams: function(values, callback) {
		if (typeof callback === 'undefined') {
			callback = 'success';
		}
		this.callbacks[callback].arguments.concat(values);
	},
	/**
	 * Définir le contexte d'éxécution d'une des fonctions.
	 * @param context Le contexte d'éxécution.
	 * @param {String} [callback="success"] La fonction concernée ("success" ou "error").
	 */
	setContext: function(context, callback) { //Definir le contexte dans lequel sera execute la fonction
		if (typeof callback === 'undefined') { //Si on a pas dit pour quel callback on veut definir le contexte
			callback = 'success';
		}
		this.callbacks[callback].context = context;
	}
};
Webos.inherit(Webos.Callback, Webos.Observable);

/**
 * Convertir n'importe quelle variable en objet Webos.Callback.
 * @param arg La variable à convertir.
 * @param [replacement] Les fonctions de remplacement si une ou plusieurs sont manquantes. Si un objet Webos.Callback n'est pas spécifié, il sera converti.
 * @returns {Webos.Callback} L'objet converti.
 * @static
 */
Webos.Callback.toCallback = function(arg, replacement) {
	if (arg instanceof Webos.Callback) {
		return arg;
	}
	
	if (arg instanceof Array) {
		if (typeof arg[0] == 'function' && typeof arg[1] == 'function') {
			return new Webos.Callback(arg[0], arg[1]);
		}
	}
	
	switch (typeof arg) {
		case 'function':
			return new Webos.Callback(arg, Webos.Callback.toCallback(replacement).error);
		case 'object':
			if (typeof arg.success == 'function' && typeof arg.error == 'function') {
				return new Webos.Callback(arg.success, arg.error);
			}
	}
	
	if (typeof replacement != 'undefined') {
		return Webos.Callback.toCallback(replacement);
	}
	
	return new Webos.Callback();
};

Webos.Callback.Result = function WCallbackResult(data) {
	data = $.extend({}, {
		success: true,
		out: null,
		data: {}
	}, data);
	
	this._data = data;
};
Webos.Callback.Result.prototype = {
	isSuccess: function() {
		return this._data.success;
	},
	triggerError: function() {
		if (this.isSuccess()) {
			return;
		}
		
		Webos.Error.trigger(this._data.out);
	},
	toString: function() {
		return this._data.out;
	}
};
Webos.Callback.Result.error = function(msg) {
	return new Webos.Callback.Result({
		success: false,
		out: msg
	});
};
