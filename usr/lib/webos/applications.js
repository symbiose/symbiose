Webos.Application = function WApplication(data, name) {
	this._name = name;
	Webos.Model.call(this, data);
};

Webos.Application.prototype = {
	name: function() {
		return this._name;
	},
	open: function() {
		return this._get('open').split(',');
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
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		
	}
};

Webos.inherit(Webos.Application, Webos.Model);

Webos.Observable.build(Webos.Application);

Webos.Application._loaded = false;
Webos.Application._applications = {};
Webos.Application._categories = {};
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
			Webos.Application._applications[key] = new Webos.Application(data.applications[key], key);
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
	
	Webos.Application.list([function(apps) {
		callback.success(apps[name]);
	}, callback.error]);
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