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
};
Webos.ServerCall.prototype = {
	load: function(callback) {
		//Lien vers l'objet courant
		var that = this;
		
		callback = Webos.Callback.toCallback(callback);
		
		this.id = Webos.ServerCall.addCallToList(this);
		
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
				} catch (error) { //Si une erreur survient
					callback.error(new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: data //On ajoute le message d'erreur
						},
						'js': null,
						'out': data
					}));
					return; //On stoppe l'execution de la fonction
				}
				
				var response = new W.ServerCall.Response(json); //On cree la reponse
				
				if (response.isSuccess()) { //Si la requete a reussi
					callback.success(response); //On execute le callback associe
				} else {
					callback.error(response); //On execute le callback d'erreur
				}
				
				Webos.ServerCall.callComplete(that);
			},
			error: function(jqXHR, textStatus, errorThrown) { //Une erreur est survenue
				callback.error(new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
					'success': false,
					'channels': {
						1: null,
						2: textStatus+' : '+errorThrown //On ajoute le message d'erreur
					},
					'js': null,
					'out': textStatus+' : '+errorThrown
				}));
				
				Webos.ServerCall.callComplete(that);
			}
		});
	}
};
Webos.inherit(Webos.ServerCall, Webos.Observable);

Webos.Observable.build(Webos.ServerCall);

Webos.ServerCall.list = []; //Liste des appels au serveur
Webos.ServerCall.addCallToList = function(call) {
	call.status = 1;
	var id = Webos.ServerCall.list.push(call) - 1;
	if (Webos.ServerCall.getNbrPendingCalls() == 1) {
		Webos.ServerCall.notify('start', { list: Webos.ServerCall.list });
	}
	Webos.ServerCall.notify('register', { call: call });
	return id;
};
Webos.ServerCall.callComplete = function(call) {
	call.status = 2;
	if (Webos.ServerCall.getNbrPendingCalls() == 0) {
		Webos.ServerCall.notify('stop', { list: [] });
	}
	Webos.ServerCall.notify('complete', { call: call });
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