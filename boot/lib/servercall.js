/**
 * ServerCall permet de dialoguer avec le serveur.
 * @param object options Un objet contenant les options.
 * <ul>
 * 	<li>string class : la classe a appeler</li>
 * 	<li>string method : la methode a appeler</li>
 * 	<li>object arguments : un objet contenant les arguments a passer a la methode (facultatif)</li>
 * 	<li>string user : le nom d'utilisateur sous lequel doit etre executee la methode (facultatif)</li>
 * 	<li>string password : le mot de passe de l'utilisateur (facultatif)</li>
 * 	<li>int pid : l'ID du processus sous lequel doit etre executee la methode (facultatif)</li>
 * 	<li>string key : la clef du processus (facultatif)</li>
 * 	</ul>
 * @param mixed callback La fonction de retour. Si elle n'est pas de type W.Callback elle sera convertie.
 */
Webos.ServerCall = function WServerCall(opts) {
	Webos.Observable.call(this);
	
	var defaults = { //Options par defaut
		'class': '',
		method: '',
		arguments: {},
		user: '',
		password: '',
		pid: '',
		key: ''
	};
	
	var options = $.extend({}, defaults, opts); //On definit toutes les options
	this.options = options;
	
	this.url = 'sbin/servercall.php';
	this.data = {
		'class': options['class'],
		method: options.method,
		arguments: JSON.stringify(options.arguments, function(key, value) { //On met les arguments sous forme de caractere
			if (typeof value === 'number' && !isFinite(value)) {
				return String(value);
			}
			return value;
		}),
		user: options.user,
		password: options.password,
		pid: options.pid,
		key: options.key
	};
	this.type = 'post';
	
	this.status = 0; //Statut : 0 = nop, 1 = chargement, 2 = fini.
	
	this.id = Webos.ServerCall.addCallToList(this);
	this.nbrAttempts = 0;
};
Webos.ServerCall.prototype = {
	_load: function $_WServerCall__load(callback) {
		//Lien vers l'objet courant
		var that = this;
		
		callback = Webos.Callback.toCallback(callback);
		
		$.ajax({
			url: that.url,
			data: that.data,
			type: that.type,
			async: (that.options.async === false) ? false : true,
			context: that,
			dataType: 'text',
			success: function(data, textStatus, jqXHR) { //En cas de succes
				try {
					if (!data) {
						throw new Webos.Error('Empty response');
					}

					var json = jQuery.parseJSON(data); //On essaie de recuperer les donnees JSON
				} catch (jsonError) { //Si une erreur survient
					var error = (data) ? data : 'An error occurred while loading a server call';
					error += "\n"+that.stack();
					
					var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: error //On ajoute le message d'erreur
						},
						'js': null,
						'out': error
					});
					
					that._complete(response, callback);
					return; //On stoppe l'execution de la fonction
				}
				
				var response = new W.ServerCall.Response(json); //On cree la reponse
				
				that._complete(response, callback);
			},
			error: function(jqXHR, textStatus, errorThrown) { //Une erreur est survenue
				if (that.nbrAttempts < Webos.ServerCall.options.maxAttempts) {
					setTimeout(function() {
						that.load(callback);
					}, Webos.ServerCall.options.errorDelay);
					return;
				}
				
				var error = 'An error occurred while loading a server call';
				if (textStatus) {
					error += ' (status : '+textStatus;
					if (errorThrown) {
						error += ', '+errorThrown;
					}
					error += ')';
				}
				error += "\n"+that.stack();
				
				var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
					'success': false,
					'channels': {
						1: null,
						2: error //On ajoute le message d'erreur
					},
					'js': null,
					'out': error
				});
				
				that._complete(response, callback);
			}
		});
	},
	load: function $_WServerCall_load(callback) {
		var that = this;

		callback = Webos.Callback.toCallback(callback);

		this.nbrAttempts++;
		this.status = 1;
		
		if (this.nbrAttempts == 1) {
			Webos.ServerCall.callStart(this);
			this.startTime = new Date();
		}
		
		that.notify('start');
		
		for (var i = 0; i < Webos.ServerCall.list.length; i++) {
			var call = Webos.ServerCall.list[i];
			
			if (call.status == 1 && call.id != this.id) {
				var isEqual = true;
				for (var attr in call.data) {
					if (call.data[attr] != this.data[attr]) {
						isEqual = false;
						break;
					}
				}
				
				if (isEqual) {
					call.bind('complete', function() {
						that._complete(call.response, callback);
					});
					return;
				}
			}
		}

		if (this.options.async === false) {
			Webos.ServerCall._removeFromLoadStack(this, callback);
			that._load(callback);
		} else {
			Webos.ServerCall._addToLoadStack(this, callback);
		}

		return this;
	},
	_complete: function $_WServerCall__complete(response, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		this.status = 2;
		this.response = response;
		
		this.completeTime = new Date();
		
		if (response.isSuccess()) { //Si la requete a reussi
			callback.success(response); //On execute le callback associe
			this.notify('success', { response: response });
		} else {
			callback.error(response); //On execute le callback d'erreur
			this.notify('error', { response: response });
		}
		
		this.notify('complete', { response: response });
		Webos.ServerCall.callComplete(this);
	},
	stack: function $_WServerCall_stack() {
		var stack = '    at '+this.url+' calling '+this.data['class']+'->'+this.data.method+'()';
		if (this.data.arguments && this.data.arguments != '{}') {
			stack += "\n"+'    with arguments '+JSON.stringify(this.data.arguments);
		} else {
			stack += "\n"+'    without arguments';
		}
		if (this.data.user) {
			stack += "\n"+'    as '+this.data.user;
		}
		if (this.data.pid) {
			stack += "\n"+'    in process #'+this.data.pid;
		}
		return stack;
	}
};
Webos.inherit(Webos.ServerCall, Webos.Observable);

Webos.Observable.build(Webos.ServerCall);

Webos.ServerCall.options = {
	maxAttempts: 3,
	errorDelay: 1000
};
Webos.ServerCall.list = []; //Liste des appels au serveur
Webos.ServerCall._loadStack = [];
Webos.ServerCall.addCallToList = function $_WServerCall_addCallToList(call) {
	var id = Webos.ServerCall.list.push(call) - 1;
	Webos.ServerCall.notify('callregister', { call: call });
	return id;
};
Webos.ServerCall.callStart = function $_WServerCall_callStart(call) {
	if (Webos.ServerCall.getNbrPendingCalls() == 1) {
		Webos.ServerCall.notify('start', { list: Webos.ServerCall.list });
	}
	Webos.ServerCall.notify('callstart', { call: call });
};
Webos.ServerCall.callComplete = function $_WServerCall_callComplete(call) {
	if (Webos.ServerCall.getNbrPendingCalls() == 0) {
		Webos.ServerCall.notify('complete', { list: Webos.ServerCall.list });
	}
	Webos.ServerCall.notify('callcomplete', { call: call });
};
Webos.ServerCall._addToLoadStack = function $_WServerCall__addToLoadStack(call, callback) {
	Webos.ServerCall._loadStack.push({
		call: call,
		callback: callback
	});

	if (Webos.ServerCall._loadStack.length == 1) {
		setTimeout(function() {
			if (Webos.ServerCall._loadStack.length == 1) {
				var callData = Webos.ServerCall._loadStack[0];
				callData.call._load(callData.callback);
			} else {
				var calls = [], callbacks = [];
				for (var i = 0; i < Webos.ServerCall._loadStack.length; i++) {
					var callData = Webos.ServerCall._loadStack[i];
					calls.push(callData.call);
					callbacks.push(callData.callback);
				}
				var group = Webos.ServerCall.join(calls);
				group.load(callbacks);
			}

			Webos.ServerCall._loadStack = [];
		}, 0);
	}
};
Webos.ServerCall._removeFromLoadStack = function $_WServerCall__removeFromLoadStack(call) {
	var stack = [];
	for (var i = 0; i < Webos.ServerCall._loadStack.length; i++) {
		var callData = Webos.ServerCall._loadStack[i];
		if (callData.call.id != call.id) {
			stack.push(callData);
		}
	}
	Webos.ServerCall._loadStack = stack;
};
Webos.ServerCall.getList = function $_WServerCall_getList(status) {
	var list = [];
	for (var i = 0; i < Webos.ServerCall.list.length; i++) {
		if (typeof status == 'undefined' || Webos.ServerCall.list[i].status == status) {
			list.push(Webos.ServerCall.list[i]);
		}
	}
	return list;
};
Webos.ServerCall.getPendingCalls = function $_WServerCall_getPendingCalls() {
	return Webos.ServerCall.getList(1);
};
Webos.ServerCall.getCompletedCalls = function $_WServerCall_getCompletedCalls() {
	return Webos.ServerCall.getList(2);
};
Webos.ServerCall.getNbrPendingCalls = function $_WServerCall_getNbrPendingCalls() {
	return Webos.ServerCall.getPendingCalls().length;
};
Webos.ServerCall.join = function $_WServerCall_join() {
	var requests = [];
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		if (arg instanceof Array) {
			for (var j = 0; j < arg.length; j++) {
				requests.push(arg[j]);
			}
		} else if (Webos.isInstanceOf(arg, Webos.ServerCall)) {
			requests.push(arg);
		}
	}

	return new Webos.ServerCall.Group(requests);
};

Webos.ServerCall.Group = function WServerCallGroup(requests, opts) {
	Webos.Observable.call(this);
	
	var defaults = {};
	
	this.options = $.extend({}, defaults, opts); //On definit toutes les options
	this.requests = [];
	this.callbacks = [];
	
	if (requests instanceof Array) {
		for (var i = 0; i < requests.length; i++) {
			this.add(requests[i]);
		}
	}
	
	this.nbrAttempts = 0;
	this.status = 0;
	this.url = 'sbin/servercallgroup.php';
	this.type = 'post';
};
Webos.ServerCall.Group.prototype = {
	add: function(request, callback) {
		var id = this.requests.push(request) - 1;
		if (callback) {
			callback = Webos.Callback.toCallback(callback);
			this.callbacks[id] = callback;
		}
		return id;
	},
	_load: function(callback) {
		var that = this;

		if (callback) {
			if (callback instanceof Array && callback.length == this.requests.length) {
				this.callbacks = [];
				for (var i = 0; i < this.requests.length; i++) {
					this.callbacks[i] = Webos.Callback.toCallback(callback[i]);
				}
			} else {
				callback = Webos.Callback.toCallback(callback);
				for (var i = 0; i < this.requests.length; i++) {
					if (!this.callbacks[i]) {
						this.callbacks[i] = callback;
					}
				}
			}
		}

		this.data = [];
		for (var i = 0; i < this.requests.length; i++) {
			if (this.requests[i].status == 0) {
				this.requests[i].notify('start');
				Webos.ServerCall.callStart(this.requests[i]);
			}
			this.data[i] = this.requests[i].data;
			this.data[i].arguments = jQuery.parseJSON(this.data[i].arguments);
		}

		$.ajax({
			url: that.url,
			data: {
				requests: JSON.stringify(that.data)
			},
			type: that.type,
			async: (that.options.async == false) ? false : true,
			dataType: 'text',
			success: function(data, textStatus, jqXHR) { //En cas de succes
				try {
					if (!data) {
						throw new Webos.Error('Empty response');
					}

					var json = jQuery.parseJSON(data); //On essaie de recuperer les donnees JSON
				} catch (jsonError) { //Si une erreur survient
					var error = (data) ? data : 'An error occurred while loading a server call';
					
					for (var i = 0; i < that.requests.length; i++) {
						var errorAndStack = error + "\n" + that.requests[i].stack();
						var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
							'success': false,
							'channels': {
								1: null,
								2: errorAndStack //On ajoute le message d'erreur
							},
							'js': null,
							'out': errorAndStack
						});

						that.requests[i]._complete(response, that.callbacks[i]);
					}
					return; //On stoppe l'execution de la fonction
				}
				
				for (var index in json) {
					var response = new W.ServerCall.Response(json[index]); //On cree la reponse
					that.requests[index]._complete(response, that.callbacks[index]);
				}
			},
			error: function(jqXHR, textStatus, errorThrown) { //Une erreur est survenue
				if (that.nbrAttempts < Webos.ServerCall.options.maxAttempts) {
					setTimeout(function() {
						that.load();
					}, Webos.ServerCall.options.errorDelay);
					return;
				}
				
				var error = 'An error occurred while loading a server call';
				if (textStatus) {
					error += ' (status : '+textStatus;
					if (errorThrown) {
						error += ', '+errorThrown;
					}
					error += ')';
				}

				for (var index in that.requests) {
					var errorAndStack = error + "\n" + that.requests[i].stack();
					var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: errorAndStack //On ajoute le message d'erreur
						},
						'js': null,
						'out': errorAndStack
					});

					that.requests[index]._complete(response, that.callbacks[index]);
				}
			}
		});
	},
	load: function(callback) {
		//Lien vers l'objet courant
		var that = this;

		this.nbrAttempts++;
		this.status = 1;

		this.notify('start');

		this._load(callback);

		return this;
	},
	_complete: function(response, callback) {
		this.status = 2;
		this.response = response;
		
		if (response.isSuccess()) { //Si la requete a reussi
			callback.success(response); //On execute le callback associe
			this.notify('success');
		} else {
			callback.error(response); //On execute le callback d'erreur
			this.notify('error');
		}
		
		this.notify('complete');
		Webos.ServerCall.callComplete(this);
	}
};
Webos.inherit(Webos.ServerCall.Group, Webos.Observable);


//Manipuler une reponse du serveur
Webos.ServerCall.Response = function WServerCallResponse(response) { 
	if (!response || typeof response != 'object') {
		response = {
			channels: {
				1: (response || null)
			},
			out: (response || null),
			data: {},
			js: null
		};
	}
	
	this._response = response; //Reponse JSON brute
};
Webos.ServerCall.Response.prototype = {
	isSuccess: function() { //Savoir si la requete a reussi
		if (this._response.success == 1) {
			return true;
		} else {
			return false;
		}
	},
	getChannel: function(channel) { //Recuperer le contenu d'un cannal
		return this._response.channels[channel];
	},
	getStandardChannel: function() { //Recuperer le contenu du cannal par defaut
		return this.getChannel(1);
	},
	getErrorsChannel: function() { //Recuperer le contenu du cannal d'erreurs
		return this.getChannel(2);
	},
	getAllChannels: function() { //Recuperer la sortie commune de tous les cannaux
		return this._response.out;
	},
	getData: function() { //Recuperer les donnees associees a la reponse
		return this._response.data;
	},
	getJavascript: function() { //Recuperer le code JS
		return this._response.js;
	},
	isJavascriptEmpty: function() { //Savoir si il y a du code JS
		return (this.getJavascript() == null);
	},
	triggerError: function(msg) { //Declancher l'erreur, si elle existe
		if (this.isSuccess()) {
			return;
		}
		msg = (!msg) ? ((!this.getErrorsChannel()) ? this.getAllChannels() : this.getErrorsChannel()) : msg;

		var details = null;
		if (msg != this.getAllChannels()) {
			details = this.getAllChannels();
		}

		Webos.Error.trigger(msg, details);
	},
	logError: function(msg) {
		if (this.isSuccess()) {
			return;
		}
		msg = (!msg) ? ((!this.getErrorsChannel()) ? this.getAllChannels() : this.getErrorsChannel()) : msg;

		var details = null;
		if (msg != this.getAllChannels()) {
			details = this.getAllChannels();
		}

		Webos.Error.log(msg, details);
	},
	toString: function() {
		return (this.getAllChannels() !== null) ? this.getAllChannels() : '';
	}
};