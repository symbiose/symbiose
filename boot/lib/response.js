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