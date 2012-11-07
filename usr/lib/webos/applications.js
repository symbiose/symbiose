Webos.Application = function WApplication(data, name) {
	this._name = name;
	Webos.Model.call(this, data);
};

Webos.Application.prototype = {
	name: function() {
		return this._name;
	},
	open: function() {
		return (this.exists('open') && this._get('open')) ? this._get('open').split(',') : [];
	},
	preferedOpen: function() {
		return (this.exists('prefered_open') && this._get('prefered_open')) ? this._get('prefered_open').split(',') : [];
	},
	setPreferedOpen: function(exts) {
		this._set('prefered_open', String(exts));
		return true;
	},
	addPreferedOpen: function(ext) {
		ext = String(ext);

		if (this.get('preferedOpen').length) {
			if ($.inArray(ext, this.get('preferedOpen'))) {
				return true;
			}
			this._set('prefered_open', this.get('preferedOpen').join(',') + ',' + ext);
			console.log(this._get('prefered_open'));
		} else {
			this._set('prefered_open', ext);
		}
		return true;
	},
	type: function() {
		return (this.exists('type')) ? this._get('type').split(',') : [];
	},
	favorite: function() {
		var favorite = this._get('favorite');
		if (typeof favorite == 'undefined' || parseInt(favorite) == 0) {
			return false;
		}
		return parseInt(favorite);
	},
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

Webos.Application._loaded = false;
Webos.Application._applications = {};
Webos.Application._categories = {};
Webos.Application._openers = {};
Webos.Application.list = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (Webos.Application._loaded) {
		callback.success(Webos.Application._applications);
		return;
	}
	
	new Webos.ServerCall({
		'class': 'ApplicationShortcutController',
		method: 'get'
	}).load([function(response) {
		var data = response.getData();
		
		Webos.Application._applications = {};
		for (var key in data.applications) {
			var app = new Webos.Application(data.applications[key], key);
			
			var openers = app.get('open');
			var processedExts = [];
			for (var i = 0; i < openers.length; i++) {
				var ext = openers[i];

				if ($.inArray(ext, processedExts) != -1) {
					continue;
				}

				if (!Webos.Application._openers[ext]) {
					Webos.Application._openers[ext] = [];
				}
				Webos.Application._openers[ext].push(key);
				processedExts.push(ext);
			}
			
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
Webos.Application.get = function(name, callback) {
	name = String(name);
	callback = Webos.Callback.toCallback(callback);

	if (!Webos.Application._loaded) {
		Webos.Application.list([function() {
			callback.success(Webos.Application._applications[name]);
		}, callback.error]);
	} else {
		var app = Webos.Application._applications[name];
		callback.success(app);
		return app;
	}
};
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
		Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};
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
		Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};
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
		Webos.Application.list([function(apps) {
			filterFn(apps);
		}, callback.error]);
	} else {
		filterFn(apps);
	}
};

Webos.Application.listOpeners = function(extension, callback) {
	callback = W.Callback.toCallback(callback);
	
	Webos.Application.list([function(apps) {
		if (Webos.Application._openers[extension]) {
			var openers = [];
			
			for (var i = 0; i < Webos.Application._openers[extension].length; i++) {
				openers.push(Webos.Application.get(Webos.Application._openers[extension][i]));
			}
			
			callback.success(openers);
		} else {
			callback.success([]);
		}
	}, callback.error]);
};

Webos.Application.listByType = function(type, callback) {
	type = String(type);
	callback = W.Callback.toCallback(callback);
	
	Webos.Application.list([function(apps) {
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

Webos.Application.categories = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Application.list([function() {
		callback.success(Webos.Application._categories);
	}, callback.error]);
};
Webos.Application.category = function(name, callback) {
	name = String(name);
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Application.list([function() {
		callback.success(Webos.Application._categories[name]);
	}, callback.error]);
};

Webos.Application.getPrefered = function(type, callback) {
	type = String(type);
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Application.list([function() {
		Webos.ConfigFile.loadUserConfig('~/.config/prefered-apps.xml', null, [function(config) {
			if (config.exists(type)) {
				callback.success(Webos.Application.get(config.get(type)));
			} else {
				callback.success(null);
			}
		}, callback.error]);
	}, callback.error]);
};
Webos.Application.setPrefered = function(app, type, callback) {
	if (Webos.isInstanceOf(app, Webos.Application)) {
		app = app.get('command');
	} else {
		app = String(app);
	}
	type = String(type);
	callback = Webos.Callback.toCallback(callback);
	
	Webos.ConfigFile.loadUserConfig('~/.config/prefered-apps.xml', null, [function(config) {
		config.set(type, app);
		config.sync([function() {
			callback.success();
		}, callback.error]);
	}, callback.error]);
};

Webos.Application.getByType = function(type, callback) {
	type = String(type);
	callback = W.Callback.toCallback(callback);
	
	Webos.Application.getPrefered(type, [function(app) {
		if (app) {
			callback.success(app);
		} else {
			Webos.Application.listByType(type, [function(apps) {
				callback.success(apps[0]);
			}, callback.error]);
		}
	}, callback.error]);
};