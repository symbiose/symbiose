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
	load: function(callback) {
		//Lien vers l'objet courant
		var that = this;
		
		callback = Webos.Callback.toCallback(callback);
		
		this.nbrAttempts++;
		this.status = 1;
		
		if (this.nbrAttempts == 1) {
			Webos.ServerCall.callStart(this);
		}
		
		that.notify('start');
		
		$.ajax({
			url: that.url,
			data: that.data,
			type: that.type,
			async: (that.options.async == false) ? false : true,
			context: that,
			dataType: 'text',
			success: function(data, textStatus, jqXHR) { //En cas de succes
				try {
					var json = jQuery.parseJSON(data); //On essaie de recuperer les donnees JSON
				} catch (jsonError) { //Si une erreur survient
					var error = (data) ? data : 'Une erreur est survenue lors du chargement d\'un appel serveur';
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
				
				var error = 'Une erreur est survenue lors du chargement d\'un appel serveur';
				if (textStatus) {
					error += ' (statut : '+textStatus;
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
	_complete: function(response, callback) {
		callback = Webos.Callback.toCallback(callback);
		
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
	},
	stack: function() {
		var stack = '    at '+this.url+' calling '+this.data['class']+'->'+this.data.method+'()';
		if (this.data.arguments && this.data.arguments != '{}') {
			stack += "\n"+'    with arguments '+this.data.arguments;
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
Webos.ServerCall.addCallToList = function(call) {
	var id = Webos.ServerCall.list.push(call) - 1;
	Webos.ServerCall.notify('callregister', { call: call });
	return id;
};
Webos.ServerCall.callStart = function(call) {
	if (Webos.ServerCall.getNbrPendingCalls() == 1) {
		Webos.ServerCall.notify('start', { list: Webos.ServerCall.list });
	}
	Webos.ServerCall.notify('callstart', { call: call });
};
Webos.ServerCall.callComplete = function(call) {
	if (Webos.ServerCall.getNbrPendingCalls() == 0) {
		Webos.ServerCall.notify('complete', { list: Webos.ServerCall.list });
	}
	Webos.ServerCall.notify('callcomplete', { call: call });
};
Webos.ServerCall.getPendingCalls = function() {
	var list = [];
	for (var i = 0; i < Webos.ServerCall.list.length; i++) {
		if (Webos.ServerCall.list[i].status == 1) {
			list.push(Webos.ServerCall.list[i]);
		}
	}
	return list;
};
Webos.ServerCall.getNbrPendingCalls = function() {
	return Webos.ServerCall.getPendingCalls().length;
};
Webos.ServerCall.join = function() {
	var requests = [];
	for (var i = 0; i < arguments.length; i++) {
		requests.push(arguments[i]);
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
	load: function(callback) {
		//Lien vers l'objet courant
		var that = this;
		
		if (callback) {
			callback = Webos.Callback.toCallback(callback);
			for (var i = 0; i < this.requests.length; i++) {
				if (!this.callbacks[i]) {
					this.callbacks[i] = callback;
				}
			}
		}
		
		this.nbrAttempts++;
		this.status = 1;
		this.data = {};
		for (var i = 0; i < this.requests.length; i++) {
			this.requests[i].notify('start');
			Webos.ServerCall.callStart(this.requests[i]);
			this.data[i] = this.requests[i].data;
			this.data[i].arguments = jQuery.parseJSON(this.data[i].arguments);
		}
		
		this.notify('start');
		
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
					var json = jQuery.parseJSON(data); //On essaie de recuperer les donnees JSON
				} catch (jsonError) { //Si une erreur survient
					var error = (data) ? data : 'Une erreur est survenue lors du chargement d\'un appel serveur';
					
					var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: error //On ajoute le message d'erreur
						},
						'js': null,
						'out': error
					});
					
					for (var i = 0; i < that.requests.length; i++) {
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
				
				var error = 'Une erreur est survenue lors du chargement d\'un appel serveur';
				if (textStatus) {
					error += ' (statut : '+textStatus;
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
				
				for (var index in that.requests) {
					that.requests[index]._complete(response, that.callbacks[index]);
				}
			}
		});
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
	if (response === null) {
		response = {
			channels: {},
			out: null,
			data: {},
			js: null
		};
	}
	
	this.response = response; //Reponse JSON brute
	
	this.isSuccess = function() { //Savoir si la requete a reussi
		if (this.response.success == 1) {
			return true;
		} else {
			return false;
		}
	};
	this.getChannel = function(channel) { //Recuperer le contenu d'un cannal
		return this.response.channels[channel];
	};
	this.getStandardChannel = function() { //Recuperer le contenu du cannal par defaut
		return this.getChannel(1);
	};
	this.getErrorsChannel = function() { //Recuperer le contenu du cannal d'erreurs
		return this.getChannel(2);
	};
	this.getAllChannels = function() { //Recuperer la sortie commune de tous les cannaux
		return this.response.out;
	};
	this.getData = function() { //Recuperer les donnees associees a la reponse
		return this.response.data;
	};
	this.getJavascript = function() { //Recuperer le code JS
		return this.response.js;
	};
	this.isJavascriptEmpty = function() { //Savoir si il y a du code JS
		return (this.getJavascript() == null);
	};
	this.triggerError = function(msg) { //Declancher l'erreur, si elle existe
		if (this.isSuccess()) {
			return;
		}
		msg = (typeof msg == 'undefined') ? ((this.getErrorsChannel() == null || this.getErrorsChannel() == '') ? this.getAllChannels() : this.getErrorsChannel()) : msg;
		
		var details = null;
		if (msg != this.getAllChannels()) {
			details = this.getAllChannels();
		}
		
		Webos.Error.trigger(msg, details);
	};
	
	this.toString = function() {
    	return (this.getAllChannels() !== null) ? this.getAllChannels() : '';
    };
};