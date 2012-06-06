/**
 * Webos.Package represente un paquet.
 * @param name Le nom du paquet.
 * @param data Les donnees sur le paquet.
 * @return Webos.Package Le paquet.
 */
Webos.Package = function WPackage(data, codename) {
	this._codename = codename;
	this._running = false;
	Webos.Model.call(this, data);
};

Webos.Package.prototype = {
	/**
	 * Recuperer le nom du paquet.
	 * @return string Le nom du paquet.
	 */
	codename: function() {
		return this._codename;
	},
	/**
	 * Installer le paquet.
	 * @param Webos.Callback callback
	 */
	install: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		this._running = true;
		
		this.notify('installstart');
		Webos.Package.notify('installstart', { 'package': that });
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'install',
			arguments: {
				'package': this.codename(),
				'repository': this.get('repository')
			}
		}).load(new Webos.Callback(function(response) {
			that._running = false;
			that._set('installed', true);
			that._set('installed_time', Math.round(+new Date() / 1000));
			
			callback.success(that);
			
			that.notify('install');
			Webos.Package.notify('install', { 'package': that });
			that.notify('installsuccess');
			Webos.Package.notify('installsuccess', { 'package': that });
			that.notify('installcomplete');
			Webos.Package.notify('installcomplete', { 'package': that });
		}, function(response) {
			that._running = false;
			callback.error(response);
			
			that.notify('installerror');
			Webos.Package.notify('installerror', { 'package': that });
			that.notify('installcomplete');
			Webos.Package.notify('installcomplete', { 'package': that });
		}));
	},
	/**
	 * Supprimer le paquet.
	 * @param Webos.Callback callback
	 */
	remove: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		this._running = true;
		
		this.notify('removestart');
		Webos.Package.notify('removestart', { 'package': that });
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'remove',
			arguments: {
				'package': this.codename()
			}
		}).load(new Webos.Callback(function(response) {
			that._running = false;
			that._set('installed', false);
			that._set('installed_time', null);
			
			callback.success(that);
			
			that.notify('remove');
			Webos.Package.notify('remove', { 'package': that });
			that.notify('removesuccess');
			Webos.Package.notify('removesuccess', { 'package': that });
			that.notify('removecomplete');
			Webos.Package.notify('removecomplete', { 'package': that });
		}, function(response) {
			that._running = false;
			callback.error(response);
			
			that.notify('removeerror');
			Webos.Package.notify('removeerror', { 'package': that });
			that.notify('removecomplete');
			Webos.Package.notify('removecomplete', { 'package': that });
		}));
	},
	isRunning: function() {
		return this._running;
	},
	set: function() {
		return false;
	}
};

Webos.inherit(Webos.Package, Webos.Model);

Webos.Observable.build(Webos.Package);

/**
 * Recuperer tous les paquets disponibles.
 * @param Webos.Callback callback
 */
Webos.Package.getAvailable = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getAvailable'
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recuperer un paquet.
 * @param string name Le nom du paquet.
 * @param Webos.Callback callback
 */
Webos.Package.get = function(name, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getPackage',
		'arguments': {
			'package': name
		}
	}).load(new Webos.Callback(function(response) {
		var pkg = new Webos.Package(response.getData(), name);
		callback.success(pkg);
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recuperer tous les paquets d'une categorie.
 * @param string name Le nom de la categorie.
 * @param Webos.Callback callback
 */
Webos.Package.getFromCategory = function(name, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getFromCategory',
		'arguments': {
			'category': name
		}
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recuperer les derniers paquets parus.
 * @param int limit Le nombre de paquets a renvoyer.
 * @param Webos.Callback callback
 */
Webos.Package.getLastPackages = function(limit, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getLastPackages',
		'arguments': {
			'limit': limit
		}
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recuperer les paquets installes.
 * @param Webos.Callback callback
 */
Webos.Package.getInstalled = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getInstalled'
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

Webos.Package.getLastInstalled = function(limit, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getLastInstalled',
		arguments: {
			limit: limit
		}
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

Webos.Package.searchPackages = function(search, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'searchPackages',
		arguments: {
			search: search
		}
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recuperer les mises a jour disponibles.
 * @param Webos.Callback callback Le callback.
 */
Webos.Package.getUpdates = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getUpdates'
	}).load(new Webos.Callback(function(response) {
		callback.success(Webos.Package._objectToPackageList(response.getData()));
	}, function(response) {
		callback.error(response);
	}));
};

/**
 * Recharger le cache.
 * @param Webos.Callback callback Le callback.
 */
Webos.Package.updateCache = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Package.notify('updatestart');
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'updateCache'
	}).load(new Webos.Callback(function(response) {
		callback.success(response);
		
		Webos.Package.notify('update');
		Webos.Package.notify('updatesuccess');
		Webos.Package.notify('updatecomplete');
	}, function(response) {
		callback.error(response);
		
		Webos.Package.notify('updateerror');
		Webos.Package.notify('updatecomplete');
	}));
};

/**
 * Installer les mises a jour.
 * @param Webos.Callback callback Le callback.
 */
Webos.Package.upgrade = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	Webos.Package.notify('upgradestart');
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'upgrade'
	}).load(new Webos.Callback(function(response) {
		callback.success(response);
		
		Webos.Package.notify('upgrade');
		Webos.Package.notify('upgradesuccess');
		Webos.Package.notify('upgradecomplete');
	}, function(response) {
		callback.error(response);
		
		Webos.Package.notify('upgradeerror');
		Webos.Package.notify('upgradecomplete');
	}));
};

/**
 * Convertir un objet en liste de paquets.
 * @param data L'objet a convertir.
 * @return object Un objet contenant les paquets.
 */
Webos.Package._objectToPackageList = function(data) {
	var list = [];
	for (var key in data) {
		list.push(new Webos.Package(data[key], key));
	}
	return list;
};

//Objet contenant le nom de code des categories et leur titre associe
Webos.Package._categories = {
	accessories: 'Accessoires',
	office: 'Bureautique',
	graphics: 'Graphisme',
	internet: 'Internet',
	games: 'Jeux',
	soundandvideo: 'Son et vid&eacute;o',
	system: 'Syst&egrave;me'
};
Webos.Package.categories = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	callback.success(Webos.Package._categories);
	
	return Webos.Package._categories;
};