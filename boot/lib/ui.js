/**
 * A user interface (i.e. a desktop environment).
 * @param {Object} data The interface's data.
 * @param {String} name The interface's name.
 * @constructor
 * @augments {Webos.Model}
 * @since 1.0alpha1
 */
Webos.UserInterface = function WUserInterface(data, name) {
	this._name = name;
	this._booterData = null;

	Webos.Model.call(this);

	this.hydrate(data);
};
Webos.UserInterface.prototype = {
	/**
	 * Update this UI's data.
	 * @param  {Object} data The new data.
	 */
	hydrate: function (data) {
		data = data || {};

		data['default'] = (data['default']) ? true : false;

		return Webos.Model.prototype.hydrate.call(this, data);
	},
	/**
	 * Get this UI's name.
	 * @returns {String} This UI's name.
	 */
	name: function () {
		return this._name;
	},
	labels: function () {
		return this._get('labels') || [];
	},
	/**
	 * @deprecated Use labels instead.
	 */
	types: function() {
		return this.get('labels');
	},
	/**
	 * Set this UI's labels.
	 * @param {String[]} types Labels.
	 * @returns {Boolean} False if there was an error, true otherwise.
	 */
	setLabels: function (labels) {
		if (!labels instanceof Array) {
			return false;
		}

		this._set('labels', labels);

		return true;
	},
	/**
	 * @deprecated Use labels instead.
	 */
	setTypes: function (types) {
		return this.set('labels', types);
	},
	/**
	 * Set/unset this UI as default.
	 * @param {Boolean} value True to set this UI as default, false otherwise.
	 */
	setDefault: function (value) {
		this._set('default', (value) ? true : false);
	},
	/**
	 * Enable/disable this UI.
	 * @param {Boolean} value True to enable this UI, false otherwise.
	 */
	setEnabled: function (value) {
		this._set('enabled', (value) ? true : false);
	},
	/**
	 * Load this UI's booter.
	 * @param {Webos.Callback} callback The callback.
	 */
	loadBooter: function (callback) {
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
	sync: function (callback) {
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
			for (var key in that._unsynced) {
				if (that._unsynced[key].state === 2) {
					that._data[key] = that._unsynced[key].value;
					delete that._unsynced[key];
					that.notify('update', { key: key, value: that._data[key].value });
				}
			}
			callback.success();
		}, callback.error]);
	}
};
Webos.inherit(Webos.UserInterface, Webos.Model);

Webos.Observable.build(Webos.UserInterface);

/**
 * A list of all user interfaces.
 * @type {Webos.UserInterface[]}
 * @private
 */
Webos.UserInterface._list = [];

/**
 * Get a user interface, given its data and name.
 * @param  {String} name         The UI's name.
 * @param  {Object} data         The UI's data.
 * @returns {Webos.UserInterface} The user interface.
 */
Webos.UserInterface.get = function(name, data) {
	var ui;

	for (var i = 0; i < Webos.UserInterface._list.length; i++) {
		ui = Webos.UserInterface._list[i];

		if (ui.get('name') == name) {
			if (data) {
				ui.hydrate(data);
			}
			return ui;
		}
	}

	ui = new Webos.UserInterface((data || {}), name);
	Webos.UserInterface._list.push(ui);

	return ui;
};

/**
 * Get the current user interface.
 * @returns {Webos.UserInterface} The user interface.
 */
Webos.UserInterface.current = function() {
	var booter = Webos.UserInterface.Booter.current();

	if (!booter) {
		return;
	}

	return Webos.UserInterface.get(booter.name());
};

/**
 * Load an UI.
 * @param  {String}         name     The UI's name.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.UserInterface.load = function(name, callback) {
	var operation = new Webos.Operation();
	operation.addCallbacks(callback);

	var lastLoadingMsg = '';
	var updateLoadingMsg = function(msg) {
		if (msg) {
			lastLoadingMsg = msg;
		}
		if (operation.progress() == 100) {
			return;
		}

		Webos.UserInterface.setLoadingScreenText(lastLoadingMsg + ' ('+operation.progress()+'%)...');
	};

	operation.on('progress', function(eventData) {
		updateLoadingMsg();
	});

	var actualCallNbr = Webos.ServerCall.getList().length - 1;
	Webos.Error.setErrorHandler(function(error) {
		var msg = '';
		if (error instanceof Webos.Error) {
			msg += error.toString();
		} else {
			msg += error.name + ' : ' + error.message + '<br />Stack trace :<br />' + (error.stack || '').replace(/\n/g, '<br />') + '';
		}

		Webos.UserInterface.writeConsole(msg);
		Webos.UserInterface.showConsole();
		
		if (typeof Webos.UserInterface.Booter.current() != 'undefined') {
			Webos.UserInterface.Booter.current().disableAutoLoad();
		}
	});
	
	Webos.UserInterface.showLoadingScreen();
	updateLoadingMsg('Retrieving interface');

	Webos.UserInterface.clearConsole();
	if (name) {
		Webos.UserInterface.writeConsole('Loading interface "'+name+'"');
	} else {
		Webos.UserInterface.writeConsole('Loading default interface');
	}

	Webos.UserInterface.writeConsole('Retrieving booter');

	var ui = Webos.UserInterface.get(name);
	ui.loadBooter([function(booter) {
		operation.setProgress(30);

		booter.on('loadstateupdate', function(data) {
			var msg = 'Loading interface';
			switch (data.state) {
				case 'structure':
					msg = 'Inserting structure';
					break;
				case 'stylesheets':
					msg = 'Applying stylesheets';
					if (data.item) {
						msg = 'Applying stylesheet '+data.item;
					}
					break;
				case 'scripts':
					msg = 'Initialising interface';
					if (data.item) {
						msg = 'Running '+data.item;
					}
					break;
				case 'cleaning':
					msg = 'Cleaning terrain';
					break;
			}

			updateLoadingMsg(msg);
			Webos.UserInterface.writeConsole(msg);
		});
		var booterOp = booter.load([function() {
			Webos.UserInterface.setLoadingScreenText('Interface loaded.');
			Webos.UserInterface.hideLoadingScreen();

			Webos.UserInterface.writeConsole('Interface loaded.');

			operation.setCompleted();
		}, function(res) {
			operation.setCompleted(res);
		}]);

		booterOp.on('progress', function(eventData) {
			operation.setProgress(30 + eventData.value / 100 * 50);
		});
	}, function(res) {
		operation.setCompleted(res);
	}]);

	return operation;
};

/**
 * Get a list of all enabled user interfaces.
 * @param  {Webos.Callback} callback The callback.
 */
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

			var uiLabels = [];
			for (var j in (uiData.labels || {})) {
				uiLabels.push(uiData.labels[j]);
			}

			list.push(Webos.UserInterface.get(uiData.name, {
				'labels': uiLabels,
				'default': uiData.isDefault,
				'displayname': uiData.attributes.displayname,
				'enabled': true
			}));
		}

		callback.success(list);
	}, callback.error]);
};

/**
 * Get a list of all installed UIs.
 * @param  {Webos.Callback} callback The callback.
 */
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

/**
 * The loading screen's timer ID.
 * @type {Number}
 * @private
 */
Webos.UserInterface._loadingScreenTimerId = null;

/**
 * Show the loading screen.
 */
Webos.UserInterface.showLoadingScreen = function() {
	if (typeof Webos.UserInterface.Booter.current() == 'undefined') {
		$('#webos-loading').show();
	} else {
		if ($('#webos-loading').is(':animated')) {
			$('#webos-loading').stop().fadeTo('normal', 1);
		} else {
			$('#webos-loading').fadeIn();
		}
	}

	$(document).on('keyup.console.ui', function (e) {
		if (e.which == 27) { //Esc
			Webos.UserInterface.showConsole();
		}
	});
};
/**
 * Set the loading screen's text.
 * @param {String} msg The text.
 */
Webos.UserInterface.setLoadingScreenText = function(msg) {
	$('#webos-loading p').html(msg);
};

/**
 * Hide the loading screen.
 */
Webos.UserInterface.hideLoadingScreen = function() {
	if ($('#webos-loading').is(':animated')) {
		$('#webos-loading').stop().fadeTo('fast', 0, function() {
			$(this).hide();
		});
	} else {
		$('#webos-loading').fadeOut('fast');
	}

	$(document).off('keyup.console.ui');
};

/**
 * Write a message in the console.
 * @param  {String} msg The message.
 * @since 1.0beta3
 */
Webos.UserInterface.writeConsole = function(msg) {
	$('#webos-loading-console').append(msg + '<br />');
};

/**
 * Clear the console.
 * @since 1.0beta3
 */
Webos.UserInterface.clearConsole = function() {
	$('#webos-loading-console').empty();
};

/**
 * Show the console.
 * @since 1.0beta3
 */
Webos.UserInterface.showConsole = function() {
	$('#webos-loading-console').show();
};

/**
 * Hide the console.
 * @since 1.0beta3
 */
Webos.UserInterface.hideConsole = function() {
	$('#webos-loading-console').hide();
};

/**
 * A user interface booter.
 * It is able to start the UI.
 * @param {Object} data The booter's data.
 * @param {String} name The interface's name.
 * @constructor
 * @augments {Webos.Observable}
 * @since 1.0beta2
 */
Webos.UserInterface.Booter = function WUserInterfaceBooter(data, name) {
	this._data = data;
	this._element = $();
	this._id = Webos.UserInterface.Booter._list.push(this) - 1;
	this._name = name;
	this._loaded = false;

	Webos.Observable.call(this);
};
Webos.UserInterface.Booter.prototype = {
	/**
	 * Get this booter's ID.
	 * @returns {Number} The ID.
	 */
	id: function () {
		return this._id;
	},
	/**
	 * Get the UI's name.
	 * @returns {String} The interface's name.
	 */
	name: function () {
		return this._name;
	},
	/**
	 * Get the element containing the whole UI.
	 * @returns {jQuery} The container.
	 */
	element: function () {
		return this._element;
	},
	/**
	 * Load the UI.
	 * @param  {Webos.Callback} callback The callback.
	 */
	load: function (callback) {
		var that = this, operation = new Webos.Operation();
		operation.addCallbacks(callback);
		this._autoLoad = true;

		Webos.UserInterface.Booter.notify('switch', { booter: this });

		this.one('loadcomplete', function() {
			operation.setCompleted();
		});

		Webos.UserInterface.Booter._current = this.id();
		this.notify('loadstart');
		operation.setStarted();

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
		operation.setProgress(10);

		//Chargement du CSS
		this.notify('loadstateupdate', { state: 'stylesheets' });

		var cssNbr = 0, index, i = 0;
		for (index in data.css) { cssNbr++; }

		for (index in data.css) {
			this.notify('loadstateupdate', { state: 'stylesheets', item: index });

			Webos.require({
				path: index,
				contents: data.css[index],
				type: 'text/css',
				styleContainer: '#userinterface-'+this.id()
			});

			i++;
			operation.setProgress(10 + (i / cssNbr) * 10);
		}

		//Chargement du Javascript
		this.notify('loadstateupdate', { state: 'scripts' });
		operation.setProgress(20);

		var scriptsNbr = 0;
		for (index in data.js) { scriptsNbr++; }

		var loadedScriptsNbr = 0;
		var loadScript = function (js, index) {
			if (!js) {
				return;
			}

			that.notify('loadstateupdate', { state: 'scripts', item: index });

			Webos.require({
				path: index,
				contents: js
			}).on('complete', function () {
				scriptLoaded(index);
			});

			i++;
			operation.setProgress(20 + (i / scriptsNbr) * 70);
		};
		var scriptLoaded = function (index) {
			loadedScriptsNbr++;

			if (loadedScriptsNbr == scriptsNbr - 1) {
				that.notify('dependenciesload');
			}
		};

		i = 0;
		for (index in data.js) {
			loadScript(data.js[index], index);
		}
		this.notify('loadstateupdate', { state: 'scripts' });
		operation.setProgress(90);

		if (!this._async) {
			this.finishLoading();
		}

		return operation;
	},
	/**
	 * Disable autoload.
	 * The function `finishLoading()` should be called.
	 * @deprecated Use `async()` instead.
	 */
	disableAutoLoad: function() {
		this._async = true;
	},
	/**
	 * Make this booter asynchronous.
	 * @return {Function} A function to call when the interface is ready.
	 */
	async: function () {
		var that = this;

		this._async = true;

		return function () {
			that.finishLoading();
		};
	},
	/**
	 * Notify that the UI is loaded.
	 * @private
	 */
	finishLoading: function () {
		if (this.loaded()) {
			return;
		}

		delete this._async;

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
		Webos.UserInterface.Booter.notify('switched', { booter: this });
	},
	/**
	 * Check if this UI is loaded.
	 * @returns {Boolean} True if this UI is loaded, false otherwise.
	 */
	loaded: function () {
		return this._loaded;
	},
	/**
	 * Unload this UI.
	 */
	unload: function () {
		if (!this.loaded()) {
			return;
		}

		//Il est plus rapide de vider l'element dans un premier temps, puis de l'enlever
		this.element().empty().remove();
	}
};
Webos.inherit(Webos.UserInterface.Booter, Webos.Observable);

Webos.Observable.build(Webos.UserInterface.Booter);

/**
 * A list of interface booters.
 * @type {Webos.UserInterface.Booter[]}
 * @private
 */
Webos.UserInterface.Booter._list = [];

/**
 * The current interface booter.
 * @type {Webos.UserInterface.Booter}
 * @private
 */
Webos.UserInterface.Booter._current = null;

/**
 * Get this current interface booter.
 * @returns {Webos.UserInterface.Booter} The booter.
 */
Webos.UserInterface.Booter.current = function() {
	if (Webos.UserInterface.Booter._current === null) {
		return;
	}

	return Webos.UserInterface.Booter._list[Webos.UserInterface.Booter._current];
};
