//Afficher une interface utilisateur (UI)
Webos.UserInterface = function WUserInterface(data) {
	this._attributes = {};
	this._attributes.data = data;
	this._attributes.id = Webos.UserInterface.list.push(this) - 1;
	
	this.remove = function() {
		//Il est plus rapide de vider l'element dans un premier temps, puis de l'enlever
		this.element.empty().remove();
		delete this;
	};
	
	this.name = function() {
		return this._attributes.data.name;
	};
	
	this.id = function() {
		return this._attributes.id;
	};
	
	this.callLoaded = true;
	this.loaded = function() {
		for (var i = 0; i < Webos.UserInterface.list.length; i++) {
			if (typeof Webos.UserInterface.list[i] != 'undefined' && Webos.UserInterface.list[i].element.length > 0 && Webos.UserInterface.list[i].id() != this.id()) {
				Webos.UserInterface.list[i].element.remove();
			}
		}
		if ($('#webos-loading').is(':animated')) {
			$('#webos-loading').stop().fadeTo('normal', 0, function() {
				$(this).hide();
			});
		} else {
			$('#webos-loading').fadeOut();
		}
	};
	
	this.load = function() {
		this.element = $('<div></div>', { id: 'userinterface-'+this.id() })
			.css('height', '100%')
			.css('width', '100%')
			.css('position', 'absolute')
			.css('top', 0)
			.css('left', 0)
			.html(data.html)
			.prependTo('#userinterfaces'); //On insere le code HTML de l'UI dans la page
		
		//Chargement du CSS
		for (var index in this._attributes.data.css) {
			new Webos.Stylesheet(this._attributes.data.css[index], '#userinterface-'+this.id());
		}
		
		//Chargement du Javascript
		for (var index in this._attributes.data.js) {
			(function(js) {
				js = 'try {'+js+"\n"+'} catch(error) { Webos.Error.catchError(error); }';
				Webos.Script.runScript(js); //On execute le code
			})(this._attributes.data.js[index]);
		}
		
		if (this.callLoaded) {
			this.loaded();
		}
	};
};

Webos.UserInterface.current = undefined;
Webos.UserInterface.list = [];
Webos.UserInterface.load = function(name) {
	var args = {};
	if (typeof name !== 'undefined') {
		args.ui = name;
	}
	
	$('#webos-loading p').removeClass('error').html('Chargement en cours...');
	Webos.Error.setErrorHandler(function(error) {
		if (!$('#webos-loading p').is('.error')) {
			$('#webos-loading p').addClass('error').html('<strong>Une erreur est survenue lors du chargement de l\'interface.</strong><br />');
		}
		
		var message;
		if (error instanceof Webos.Error) {
			message = error.html.message;
		} else {
			message = error.name + ' : ' + error.message;
		}
		
		$('#webos-loading p').append(message+'<br />');
		
		if (typeof Webos.UserInterface.current != 'undefined') {
			Webos.UserInterface.current.callLoaded = false;
		}
	});
	
	if (typeof Webos.UserInterface.current == 'undefined') {
		$('#webos-loading').show();
	} else {
		if ($('#webos-loading').is(':animated')) {
			$('#webos-loading').stop().fadeTo('normal', 1);
		} else {
			$('#webos-loading').fadeIn();
		}
	}
	
	new Webos.ServerCall({
		'class': 'UserInterfaceController',
		'method': 'loadUI',
		'arguments': args
	}).load(function(response) {
		var ui = new Webos.UserInterface(response.getData());
		
		Webos.UserInterface.current = ui;
		ui.load();
	});
};
Webos.UserInterface.getList = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserInterfaceController',
		'method': 'getUIsList'
	}).load(new Webos.Callback(function(response) {
		callback.success(response.getData());
	}, function(response) {
		callback.error(response);
	}));
};
Webos.UserInterface.setDefault = function(ui, value, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'UserInterfaceController',
		method: 'setDefault',
		arguments: {
			ui: ui,
			value: value
		}
	}).load(new Webos.Callback(function(response) {
		callback.success();
	}, function(response) {
		callback.error(response);
	}));
};