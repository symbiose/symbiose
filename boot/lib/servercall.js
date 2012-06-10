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
		
		var getStackFn = function() {
			var stack = '    at '+that.url+' calling '+that.data['class']+'->'+that.data.method+'()';
			if (that.data.arguments && that.data.arguments != '{}') {
				stack += "\n"+'    with arguments '+that.data.arguments;
			} else {
				stack += "\n"+'    without arguments';
			}
			if (that.data.user) {
				stack += "\n"+'    as '+that.data.user;
			}
			if (that.data.pid) {
				stack += "\n"+'    in process #'+that.data.pid;
			}
			return stack;
		};
		
		var callCompleteFn = function() {
			that.status = 2;
			Webos.ServerCall.callComplete(that);
		};
		
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
					error += "\n"+getStackFn();
					
					var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: error //On ajoute le message d'erreur
						},
						'js': null,
						'out': error
					});
					that.response = response;
					callback.error(response);
					
					callCompleteFn();
					return; //On stoppe l'execution de la fonction
				}
				
				var response = new W.ServerCall.Response(json); //On cree la reponse
				that.response = response;
				
				if (response.isSuccess()) { //Si la requete a reussi
					callback.success(response); //On execute le callback associe
				} else {
					callback.error(response); //On execute le callback d'erreur
				}
				
				callCompleteFn();
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
				error += "\n"+getStackFn();
				
				var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
					'success': false,
					'channels': {
						1: null,
						2: error //On ajoute le message d'erreur
					},
					'js': null,
					'out': error
				});
				that.response = response;
				
				callback.error(response);
				
				callCompleteFn();
			}
		});
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
		Webos.ServerCall.notify('complete', { list: [] });
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
Webos.ServerCall.group = function() {
	var requests = [];
	for (var i = 1; i < arguments.length; i++) {
		requests.push(arguments[i]);
	}
	return new Webos.ServerCallGroup(requests);
};

Webos.ServerCallGroup = function WServerCallGroup(requests) {
	this.requests = [];
	this.callbacks = [];
	
	var that = this;
	
	this._triggerComplete = function(request) {
		var completed = true;
		for (var i = 0; i < this.requests.length; i++) {
			if (Webos.ServerCall.list[i].status == 1) {
				completed = false;
			}
		}
		
		if (completed) {
			for (var i = 0; i < this.callbacks.length; i++) {
				callback(this);
			}
		}
	};
	this.complete = function(callback) {
		this.callbacks.push(callback);
	};
	this.add = function(request) {
		var callback = request.callback;
		request.callback = new W.Callback(function(response) {
			callback.success(response);
			that._triggerComplete(request);
		}, function(response) {
			callback.error(response);
			that._triggerComplete(request);
		});
		this.requests.push(request);
	};
	
	if (requests instanceof Array) {
		for (var i = 0; i < requests.length; i++) {
			this.add(requests[i]);
		}
	}
};