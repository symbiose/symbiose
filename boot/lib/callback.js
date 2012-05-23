// Permet de creer un objet contenant un callback en cas de succes et un callback en cas d'erreur
Webos.Callback = function WCallback(successCallback, errorCallback) {
	this.callbacks = { //Callbacks
		success: {
			callback: function() {}, //La fonction
			arguments: [],
			context: window //Le contexte
		},
		error: {
			callback: function(error) {
				W.Error.trigger(error);
			}, //La fonction
			arguments: [],
			context: window //Le contexte
		}
	};
	
	//Si une fonction de callback pour un succes est specifiee
	if (typeof successCallback === 'function') {
		this.callbacks.success.callback = successCallback;
	}
	
	//Si la fonction pour les erreurs est specifiee
	if (typeof errorCallback === 'function') {
		this.callbacks.error.callback = errorCallback;
	}
	
	this.success = function() { //Execution du callback de succes
		var args = []; //On convertit l'objet arguments en array
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		args = args.concat(this.callbacks.success.arguments);
		
		//On execute le callback
		return this.callbacks.success.callback.apply(this.callbacks.success.context, args);
	};
	
	this.error = function() { //Execution du callback d'erreurs
		var args = []; //On convertit l'objet arguments en array
		for (var i = 0; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		args = args.concat(this.callbacks.error.arguments);
		
		//On execute le callback
		return this.callbacks.error.callback.apply(this.callbacks.error.context, args);
	};
	
	this.addParam = function(value, callback) {
		if (typeof callback === 'undefined') {
			callback = 'success';
		}
		this.callbacks[callback].arguments.push(value);
	};
	this.addParams = function(values, callback) {
		if (typeof callback === 'undefined') {
			callback = 'success';
		}
		this.callbacks[callback].arguments.concat(values);
	};
	this.setContext = function(context, callback) { //Definir le contexte dans lequel sera execute la fonction
		if (typeof callback === 'undefined') { //Si on a pas dit pour quel callback on veut definir le contexte
			callback = 'success';
		}
		this.callbacks[callback].context = context;
	};
};

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