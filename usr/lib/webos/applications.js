Webos.Application = function WApplication(data, name) {
	this._name = name;
	Webos.Model.call(this, data);
};

Webos.Application.prototype = {
	name: function() {
		return this._name;
	},
	open: function() {
		return (this.exists('open')) ? this._get('open').split(',') : [];
	},
	setOpen: function() {
		return false;
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
					callback.success(that);
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
					that.notify('update', { key: 'favorite', value: that._data[key].value });
					callback.success(that);
				}, callback.error));
			}
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
			for (var i = 0; i < openers.length; i++) {
				if (!Webos.Application._openers[openers[i]]) {
					Webos.Application._openers[openers[i]] = [];
				}
				Webos.Application._openers[openers[i]].push(key);
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
	
	return Webos.Application._applications[name];
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

Webos.Application.getDefault = function(type, callback) {
	type = String(type);
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Application.list([function() {
		callback.success(Webos.Application.get('firefox'));
	}, callback.error]);
};
