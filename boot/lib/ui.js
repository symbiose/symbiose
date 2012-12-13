Webos.UserInterface = function WUserInterface(data, name) {
	this._name = name;
	this._booterData = null;

	Webos.Model.call(this);

	this.hydrate(data);
};
Webos.UserInterface.prototype = {
	hydrate: function(data) {
		data = data || {};

		data.default = (data.default) ? true : false;
		data.types = String(data.types).split(',');

		return Webos.Model.prototype.hydrate.call(this, data);
	},
	name: function() {
		return this._name;
	},
	setTypes: function(types) {
		if (!types instanceof Array) {
			return false;
		}

		this._set('types', types);

		return true;
	},
	setDefault: function(value) {
		this._set('default', (value) ? true : false);
	},
	setEnabled: function(value) {
		this._set('enabled', (value) ? true : false);
	},
	loadBooter: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;

		var createBooterFn = function(data) {
			var booter = new Webos.UserInterface.Booter(data, that.name());
			callback.success(booter);
		};

		if (this._booterData) {
			createBooterFn(this._booterData);
		} else {
			return new Webos.ServerCall({
				'class': 'UserInterfaceController',
				'method': 'loadBooter',
				'arguments': {
					ui: (this.get('name') || false)
				}
			}).load([function(response) {
				var data = response.getData();

				that._booterData = data.booter;
				that._name = data.name;
				createBooterFn(data.booter);
			}, callback.error]);
		}
	},
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;

		var data = {}, nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				this._unsynced[key].state = 2;
				data[key] = this._unsynced[key].value;
				nbrChanges++;
			}
		}

		if (nbrChanges === 0) {
			callback.success();
			return;
		}

		if (typeof data.types != 'undefined') {
			data.types = data.types.join(',');
		}

		return new Webos.ServerCall({
			'class': 'UserInterfaceController',
			method: 'changeConfig',
			arguments: {
				ui: this.get('name'),
				data: data
			}
		}).load([function(response) {
			callback.success();
		}, callback.error]);
	}
};
Webos.inherit(Webos.UserInterface, Webos.Model);

Webos.Observable.build(Webos.UserInterface);

Webos.UserInterface.Booter = function WUserInterfaceBooter(data, name) {
	this._data = data;
	this._element = $();
	this._id = Webos.UserInterface.Booter._list.push(this) - 1;
	this._name = name;
	this._loaded = false;

	Webos.Observable.call(this);
};
Webos.UserInterface.Booter.prototype = {
	id: function() {
		return this._id;
	},
	name: function() {
		return this._name;
	},
	element: function() {
		return this._element;
	},
	load: function loadUI(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		this._autoLoad = true;

		this.one('loadcomplete', function() {
			callback.success();
		});

		Webos.UserInterface.Booter._current = this.id();
		this.notify('loadstart');

		var data = this._data;

		//On insere le code HTML de l'UI dans la page
		this.notify('loadstateupdate', { state: 'structure' });
		this._element = $('<div></div>', { id: 'userinterface-'+this.id() })
			.css({
				'height': '100%',
				'width': '100%',
				'position': 'absolute',
				'top': 0,
				'left': 0
			})
			.html(data.html)
			.prependTo('#userinterfaces');

		//Chargement du CSS
		this.notify('loadstateupdate', { state: 'stylesheets' });
		for (var index in data.css) {
			this.notify('loadstateupdate', { state: 'stylesheets', item: index });
			Webos.Stylesheet.insertCss(data.css[index], '#userinterface-'+this.id());
		}

		//Chargement du Javascript
		this.notify('loadstateupdate', { state: 'scripts' });
		for (var index in data.js) {
			var result = (function loadUIScript(js) {
				if (!js) {
					return;
				}

				that.notify('loadstateupdate', { state: 'scripts', item: index });

				js = 'try {'+js+"\n"+'} catch(error) { Webos.Error.catchError(error); }';
				Webos.Script.run(js); //On execute le code
			})(data.js[index]);
		}
		this.notify('loadstateupdate', { state: 'scripts' });

		if (this._autoLoad) {
			this.finishLoading();
		}
	},
	disableAutoLoad: function() {
		this._autoLoad = false;
	},
	finishLoading: function finishUILoading() {
		if (this.loaded()) {
			return;
		}

		delete this._autoLoad;

		this.notify('loadstateupdate', { state: 'cleaning' });

		for (var i = 0; i < Webos.UserInterface.Booter._list.length; i++) {
			var booter = Webos.UserInterface.Booter._list[i];

			if (booter && booter.loaded()) {
				this.notify('loadstateupdate', { state: 'cleaning', item: booter });
				booter.unload();
			}
		}

		this._loaded = true;
		this.notify('loadcomplete');
	},
	loaded: function() {
		return this._loaded;
	},
	unload: function unloadUI() {
		if (!this.loaded()) {
			return;
		}

		//Il est plus rapide de vider l'element dans un premier temps, puis de l'enlever
		this.element().empty().remove();
	}
};
Webos.inherit(Webos.UserInterface.Booter, Webos.Observable);

Webos.Observable.build(Webos.UserInterface.Booter);

Webos.UserInterface.Booter._list = [];
Webos.UserInterface.Booter._current = null;

Webos.UserInterface.Booter.current = function() {
	if (Webos.UserInterface.Booter._current === null) {
		return;
	}

	return Webos.UserInterface.Booter._list[Webos.UserInterface.Booter._current];
};

Webos.UserInterface._list = [];

Webos.UserInterface.get = function(name, data) {
	for (var i = 0; i < Webos.UserInterface._list.length; i++) {
		var ui = Webos.UserInterface._list[i];

		if (ui.get('name') == name) {
			if (data) {
				ui.hydrate(data);
			}
			return ui;
		}
	}

	var ui = new Webos.UserInterface((data || {}), name);
	Webos.UserInterface._list.push(ui);

	return ui;
};
Webos.UserInterface.current = function() {
	var booter = Webos.UserInterface.Booter.current();

	if (!booter) {
		return;
	}

	return Webos.UserInterface.get(booter.name());
};
Webos.UserInterface.load = function(name, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var actualCallNbr = Webos.ServerCall.getList().length - 1;
	Webos.Error.setErrorHandler(function(error) {
		if ($('#webos-error').is(':hidden')) {
			$('#webos-error p').html('<strong>An error occured while loading user interface.</strong>');
			$('#webos-error').show();
		}

		var message = '<li>';
		if (error instanceof Webos.Error) {
			message += error.toString();
		} else {
			message += error.name + ' : ' + error.message + '<br />Stack trace :<pre>' + error.stack + '</pre>';
		}

		message += '<br />Server calls :</li><ul>';
		var calls = Webos.ServerCall.getList();
		for (var i = actualCallNbr; i < calls.length; i++) {
			var call = calls[i];

			if (!call) {
				continue;
			}

			if (call.status == 2) {
				message += '<li>Loaded call<br /><pre>'+call.stack()+'</pre></li>';
			} else if (call.status == 1) {
				message += '<li>Loading call<br /><pre>'+call.stack()+'</pre></li>';
			}
		}
		message += '</ul>';

		$('#webos-error ul').append(message);
		
		if (typeof Webos.UserInterface.Booter.current() != 'undefined') {
			Webos.UserInterface.Booter.current().disableAutoLoad();
		}
	});
	
	Webos.UserInterface.showLoadingScreen();

	Webos.UserInterface.setLoadingScreenText('Retrieving interface...');

	var ui = Webos.UserInterface.get(name);
	ui.loadBooter([function(booter) {
		booter.bind('loadstateupdate', function(data) {
			var msg = 'Loading interface...';
			switch (data.state) {
				case 'structure':
					msg = 'Inserting structure...';
					break;
				case 'stylesheets':
					msg = 'Applying stylesheets...';
					if (data.item) {
						msg = 'Applying stylesheet '+data.item+'...';
					}
					break;
				case 'scripts':
					msg = 'Initialising interface...';
					if (data.item) {
						msg = 'Running '+data.item+'...';
					}
					break;
				case 'cleaning':
					msg = 'Cleaning terrain...';
					break;
			}

			Webos.UserInterface.setLoadingScreenText(msg);
		});
		booter.load([function() {
			Webos.UserInterface.setLoadingScreenText('Interface loaded.');
			Webos.UserInterface.hideLoadingScreen();
		}, callback.error]);
	}, callback.error]);
};
Webos.UserInterface.getList = function(callback) {
	callback = Webos.Callback.toCallback(callback);

	return new Webos.ServerCall({
		'class': 'UserInterfaceController',
		'method': 'getList'
	}).load([function(response) {
		var data = response.getData();
		var list = [];

		for (var index in data) {
			var uiData = data[index];
			list.push(Webos.UserInterface.get(uiData.name, {
				'types': uiData.types,
				'default': uiData['default'],
				'displayname': uiData.attributes.displayname,
				'enabled': true
			}));
		}

		callback.success(list);
	}, callback.error]);
};
Webos.UserInterface.getInstalled = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return new Webos.ServerCall({
		'class': 'UserInterfaceController',
		method: 'getInstalled'
	}).load([function(response) {
		var data = response.getData();
		var list = [];

		for (var index in data) {
			var uiData = data[index];
			list.push(Webos.UserInterface.get(index, uiData));
		}

		callback.success(list);
	}, callback.error]);
};
Webos.UserInterface._loadingScreenTimerId = null;
Webos.UserInterface.showLoadingScreen = function() {
	$('#webos-error p').empty();
	if (typeof Webos.UserInterface.Booter.current() == 'undefined') {
		$('#webos-loading').show();
	} else {
		if ($('#webos-loading').is(':animated')) {
			$('#webos-loading').stop().fadeTo('normal', 1);
		} else {
			$('#webos-loading').fadeIn();
		}
	}
};
Webos.UserInterface.setLoadingScreenText = function(msg) {
	$('#webos-loading p').html(msg);
};
Webos.UserInterface.hideLoadingScreen = function() {
	if ($('#webos-loading').is(':animated')) {
		$('#webos-loading').stop().fadeTo('fast', 0, function() {
			$(this).hide();
		});
	} else {
		$('#webos-loading').fadeOut('fast');
	}
	$('#webos-error').fadeOut('fast');
};