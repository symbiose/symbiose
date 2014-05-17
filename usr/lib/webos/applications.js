(function () {

/**
 * An application.
 * @constructor
 * @augments Webos.Model
 * @author emersion
 */
Webos.Application = function (data, name) {
	this._name = name;
	Webos.Model.call(this, data);
};

/**
 * App's prototype.
 */
Webos.Application.prototype = {
	/**
	 * Get this app's name.
	 * @return {String}
	 */
	name: function() {
		return this._name;
	},
	/**
	 * Get file extensions this app can open.
	 * @return {Array}
	 * @deprecated Use openExtensions() instead.
	 */
	open: function() {
		return (this.exists('open') && this._get('open')) ? this._get('open').split(',') : [];
	},
	/**
	 * Get file extensions this app can open.
	 * @return {Array}
	 */
	openExtensions: function() {
		return this.get('open');
	},
	/**
	 * Get file mime types this app can open.
	 * @return {Array}
	 */
	openMimeTypes: function() {
		return (this.exists('openMimeTypes') && this._get('openMimeTypes')) ? this._get('openMimeTypes').split(',') : [];
	},
	/**
	 * Check if this app is able to open a given file.
	 * @param {Webos.File} The file.
	 * @return {Boolean} True if this app opens the file, false otherwise.
	 */
	opensFile: function(file) {
		file = Webos.File.get(file);

		if (jQuery.inArray(file.get('extension'), this.get('openExtensions')) != -1) {
			return true;
		}

		var found = false, openMimeTypes = this.get('openMimeTypes');
		for(var i = 0; i < openMimeTypes.length; i++) {
			var mimeType = openMimeTypes[i];

			if (file.matchesMimeType(mimeType)) {
				return true;
			}
		}

		return false;
	},
	/**
	 * Get prefered file extensions this app can open.
	 * @return {Array}
	 */
	preferedOpen: function() {
		return (this.exists('prefered_open') && this._get('prefered_open')) ? this._get('prefered_open').split(',') : [];
	},
	/**
	 * Set prefered file extensions this app can open.
	 * @param {Array} exts File extensions.
	 */
	setPreferedOpen: function(exts) {
		this._set('prefered_open', String(exts));
		return true;
	},
	/**
	 * Add a prefered file extension this app can open.
	 * @param {Array} ext The file extension.
	 */
	addPreferedOpen: function(ext) {
		ext = String(ext);

		if (this.get('preferedOpen').length) {
			if ($.inArray(ext, this.get('preferedOpen'))) {
				return true;
			}
			this._set('prefered_open', this.get('preferedOpen').join(',') + ',' + ext);
		} else {
			this._set('prefered_open', ext);
		}
		return true;
	},
	/**
	 * Get this app's types.
	 * @return {Array}
	 */
	type: function() {
		return (this.exists('type')) ? this._get('type').split(',') : [];
	},
	/**
	 * Check if this app has been marked as favorite.
	 * @return {Number} 1 if this app is favorite, 0 otherwise.
	 */
	favorite: function() {
		var favorite = this._get('favorite');
		if (typeof favorite == 'undefined' || parseInt(favorite) == 0) {
			return false;
		}
		return parseInt(favorite);
	},
	/**
	 * Set/unset this app as favorite.
	 * @param {Number} value 1 if this app is favorite, 0 otherwise.
	 */
	setFavorite: function(value) {
		this._set('favorite', (!isNaN(parseInt(value))) ? parseInt(value) : 0);
	},
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		var data = {};
		var nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				this._unsynced[key].state = 2;
				data[key] = this._unsynced[key].value;
				nbrChanges++;
			}
		}
		
		if (nbrChanges === 0) {
			callback.success(this);
			return;
		}
		
		if (typeof data.favorite != 'undefined') {
			if (data.favorite) {
				new Webos.ServerCall({
					'class': 'ApplicationShortcutController',
					method: 'setFavorite',
					arguments: {
						name: this.get('name'),
						position: data.favorite
					}
				}).load(new Webos.Callback(function() {
					that._data['favorite'] = that._unsynced['favorite'].value;
					delete that._unsynced['favorite'];
					that.notify('update', { key: 'favorite', value: that._data[key].value });
					callback.success();
				}, callback.error));
			} else {
				new Webos.ServerCall({
					'class': 'ApplicationShortcutController',
					method: 'removeFavorite',
					arguments: {
						name: this.get('name')
					}
				}).load(new Webos.Callback(function() {
					that._data['favorite'] = that._unsynced['favorite'].value;
					delete that._unsynced['favorite'];
					that.notify('update', { key: 'favorite', value: that._data['favorite'].value });
					callback.success();
				}, callback.error));
			}
		}

		if (typeof data.prefered_open != 'undefined') {
			Webos.ConfigFile.loadUserConfig('~/.config/prefered-openers.xml', null, [function(config) {
				config.set(that.get('name'), data.prefered_open);
				config.sync([function() {
					that._data['prefered_open'] = that._unsynced['prefered_open'].value;
					delete that._unsynced['prefered_open'];
					that.notify('update', { key: 'prefered_open', value: that._data['prefered_open'].value });
					callback.success();
				}, callback.error]);
			}, callback.error]);
		}
	}
};

Webos.inherit(Webos.Application, Webos.Model);

Webos.Observable.build(Webos.Application);

/**
 * True if apps list has been loaded.
 * @private
 */
Webos.Application._loaded = false;
/**
 * Apps list.
 * @private
 */
Webos.Application._applications = {};
/**
 * Categories list.
 * @private
 */
Webos.Application._categories = {};

/**
 * List all available apps.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.list = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.Application._loaded) {
		callback.success(Webos.Application._applications);
		return;
	}
	
	return new Webos.ServerCall({
		'class': 'ApplicationShortcutController',
		method: 'get'
	}).load([function(response) {
		var data = response.getData();
		
		Webos.Application._applications = {};
		for (var key in data.applications) {
			var app = new Webos.Application(data.applications[key], key);
			
			Webos.Application._applications[key] = app;
		}
		
		Webos.Application._categories = {};
		for (var key in data.categories) {
			Webos.Application._categories[data.categories[key].name] = data.categories[key];
		}
		
		Webos.Application._loaded = true;
		
		callback.success(Webos.Application._applications);
	}, callback.error]);
};
/**
 * Get a specific app.
 * @param {String} name The app name.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.get = function(name, callback) {
	name = String(name);
	callback = Webos.Callback.toCallback(callback);

	if (!Webos.Application._loaded) {
		return Webos.Application.list([function() {
			callback.success(Webos.Application._applications[name]);
		}, callback.error]);
	} else {
		var app = Webos.Application._applications[name];
		callback.success(app);
		return app;
	}
};
/**
 * List apps by category.
 * @param {String} cat The category name.
 * @param {Webos.Callback} callback The callback.
 * @param {Object} [apps] If specified, the function will filter provided apps.
 */
Webos.Application.listByCategory = function(cat, callback, apps) {
	callback = Webos.Callback.toCallback(callback);
	
	var filterFn = function(apps) {
		var appsToKeep = {};
		
		for (var key in apps) {
			var app = apps[key];
			if (!app.get('category')) {
				continue;
			}
			
			if (app.get('category') == cat) {
				appsToKeep[key] = app;
			}
		}
		
		callback.success(appsToKeep);
	};
	
	if (!apps) {
		return Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};
/**
 * List apps by search query.
 * @param {String} search The search query.
 * @param {Webos.Callback} callback The callback.
 * @param {Object} [apps] If specified, the function will filter provided apps.
 */
Webos.Application.listBySearch = function(search, callback, apps) {
	search = $.trim(search);
	callback = W.Callback.toCallback(callback);
	
	var filterFn = function(apps) {
		var appsToKeep = {};
		
		for (var key in apps) {
			var app = apps[key], data = app.data();
			
			var found = 0;
			for (var index in data) {
				var dataItem = data[index];
				if (typeof dataItem == 'string') {
					if (dataItem.toLowerCase().search(search) != -1) {
						found++;
					}
				}
			}
			
			if (found > 0) {
				appsToKeep[key] = app;
			}
		}
		
		callback.success(appsToKeep);
	};
	
	if (!apps) {
		return Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};
/**
 * List favorite apps.
 * @param {Webos.Callback} callback The callback.
 * @param {Object} [apps] If specified, the function will filter provided apps.
 */
Webos.Application.listFavorites = function(callback, apps) {
	callback = W.Callback.toCallback(callback);
	
	var filterFn = function(apps) {
		var appsToKeep = [];

		for (var key in apps) {
			var app = apps[key];
			
			if (app.get('favorite') !== false) {
				appsToKeep.push(app);
			}
		}
		
		appsToKeep.sort(function(a, b) {
		    return a.get('favorite') - b.get('favorite');
		});
		
		callback.success(appsToKeep);
	};
	
	if (!apps) {
		return Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};
/**
 * List apps which can open a specified file.
 * @param {Webos.File} file The file.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.listOpeners = function(file, callback) {
	callback = W.Callback.toCallback(callback);

	var filterFn = function(apps) {
		var appsToKeep = [];
		
		for (var key in apps) {
			var app = apps[key];

			if (app.opensFile(file)) {
				appsToKeep.push(app);
			}
		}
		
		callback.success(appsToKeep);
	};
	
	return Webos.Application.list([function(apps) {
		filterFn(apps);
	}, callback.error]);
};
/**
 * Open a file.
 * @param  {Webos.File}      file     The file to open.
 * @param  {Webos.Callback}  callback The callback.
 * @return {Webos.Operation}          The operation.
 */
Webos.Application.openFile = function (file, callback) {
	var op = Webos.Operation.create();
	op.addCallbacks(callback);

	Webos.Application.listOpeners(file, function(openers) {
		if (openers.length > 0) {
			var prefered = openers[0];

			for (var i = 0; i < openers.length; i++) {
				if ($.inArray(file.get('extension'), openers[i].get('preferedOpen')) != -1) {
					prefered = openers[i];
					break;
				}
			}

			W.Cmd.execute({
				executable: prefered.get('command'),
				args: [file]
			});

			op.setCompleted();
		} else {
			op.setCompleted(W.Callback.Result.error('No app found to open "'+file.get('basename')+'"'));
		}
	});

	return op;
};
/**
 * List apps by type.
 * @param {String} type The type.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.listByType = function(type, callback) {
	type = String(type);
	callback = W.Callback.toCallback(callback);
	
	return Webos.Application.list([function(apps) {
		var list = [];
		for (var key in apps) {
			var app = apps[key];
			if (app.exists('type') && $.inArray(type, app.get('type')) != -1) {
				list.push(app);
			}
		}
		callback.success(list);
	}, callback.error]);
};
/**
 * List apps categories.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.categories = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	return Webos.Application.list([function() {
		callback.success(Webos.Application._categories);
	}, callback.error]);
};
/**
 * Get a specific category.
 * @param {String} name The category.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.category = function(name, callback) {
	name = String(name);
	callback = Webos.Callback.toCallback(callback);
	
	return Webos.Application.list([function() {
		callback.success(Webos.Application._categories[name]);
	}, callback.error]);
};
/**
 * Get the prefered app for a specified type.
 * @param {String} name The type.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.getPrefered = function(type, callback) {
	type = String(type);
	callback = Webos.Callback.toCallback(callback);
	
	return Webos.Application.list([function() {
		Webos.ConfigFile.loadUserConfig('~/.config/prefered-apps.xml', null, [function(config) {
			if (config.exists(type)) {
				callback.success(Webos.Application.get(config.get(type)));
			} else {
				callback.success(null);
			}
		}, callback.error]);
	}, callback.error]);
};
/**
 * Set the prefered app for a specified type.
 * @param {Webos.Application|String} app The app or the app command.
 * @param {String} type The type.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.setPrefered = function(app, type, callback) {
	if (Webos.isInstanceOf(app, Webos.Application)) {
		app = app.get('command');
	} else {
		app = String(app);
	}
	type = String(type);
	callback = Webos.Callback.toCallback(callback);
	
	return Webos.ConfigFile.loadUserConfig('~/.config/prefered-apps.xml', null, [function(config) {
		config.set(type, app);
		config.sync([function() {
			callback.success();
		}, callback.error]);
	}, callback.error]);
};
/**
 * List apps by type.
 * @param {String} type The type.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Application.getByType = function(type, callback) {
	type = String(type);
	callback = W.Callback.toCallback(callback);
	
	return Webos.Application.getPrefered(type, [function(app) {
		if (app) {
			callback.success(app);
		} else {
			Webos.Application.listByType(type, [function(apps) {
				callback.success(apps[0]);
			}, callback.error]);
		}
	}, callback.error]);
};

/**
 * Clear the app cache.
 */
Webos.Application.clearCache = function() {
	Webos.Application._loaded = false;
	Webos.Application._applications = {};
	Webos.Application._categories = {};

	Webos.Application.trigger('reload');
};

})();