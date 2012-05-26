/**
 * SPackage represente un paquet.
 * @param name Le nom du paquet.
 * @param data Les donnees sur le paquet.
 * @return SPackage Le paquet.
 */
function SPackage(name, data) {
	this.name = name;
	this.data = data;
	this.running = false;
	
	var that = this;
	
	/**
	 * Determiner si un attribut existe.
	 * @param attribute L'attribut.
	 * @return Vrai si l'attribut existe.
	 */
	this.isAttribute = function(attribute) {
		return (typeof this.data[attribute] != 'undefined');
	};
	
	/**
	 * Recuperer un attribut.
	 * @param attribute L'attribut.
	 * @return La valeur de l'attribut.
	 */
	this.getAttribute = function(attribute) {
		if (this.isAttribute(attribute)) {
			return this.data[attribute];
		} else {
			return false;
		}
	};
	
	/**
	 * Recuperer le nom du paquet.
	 * @return Le nom du paquet.
	 */
	this.getName = function() {
		return this.name;
	};
	
	/**
	 * Installer le paquet.
	 */
	this.install = function(userCallback) {
		var callback = new W.Callback(function(response) {
			that.running = false;
			that.data.installed = true;
			that.data.installed_time = Math.round(+new Date()/1000);
			//On recharge le menu principal
			if (typeof SDashboard != 'undefined') {
				var list = SDashboard.getAppletsByName('MainMenu');
				for (var i = 0; i < list.length; i++) {
					list[i].reload();
				}
			}
			userCallback.success(that);
		}, function(response) {
			that.running = false;
			userCallback.error(response);
		});
		
		this.running = true;
		
		var name = this.getName();
		var repository = this.getAttribute('repository');
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'install',
			arguments: {
				'package': name,
				'repository': repository
			}
		}).load(callback);
	};
	
	/**
	 * Supprimer le paquet.
	 */
	this.remove = function(userCallback) {
		var callback = new W.Callback(function(response) {
			that.running = false;
			that.data.installed = false;
			//On recharge le menu principal
			if (typeof SDashboard != 'undefined') {
				var list = SDashboard.getAppletsByName('MainMenu');
				for (var i = 0; i < list.length; i++) {
					list[i].reload();
				}
			}
			userCallback.success(that);
		}, function(response) {
			that.running = false;
			userCallback.error(response);
		});
		
		this.running = true;
		
		var name = this.getName();
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'remove',
			arguments: {
				'package': name
			}
		}).load(callback);
	};
	
	this.isRunning = function() {
		return this.running;
	};
}

/**
 * Recuperer tous les paquets disponibles.
 * @param W.Callback userCallback Le callback.
 */
SPackage.getAvailable = function(userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getAvailable'
	}).load(callback);
};

/**
 * Recuperer un paquet.
 * @param name Le nom du paquet.
 * @param W.Callback userCallback Le callback.
 */
SPackage.get = function(name, userCallback) {
	var callback = new W.Callback(function(response) {
		var pkg = new SPackage(name, response.getData());
		userCallback.success(pkg);
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getPackage',
		'arguments': {
			'package': name
		}
	}).load(callback);
};

/**
 * Recuperer tous les paquets d'une categorie.
 * @param name Le nom de la categorie.
 * @param W.Callback userCallback Le callback.
 */
SPackage.getFromCategory = function(name, userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getFromCategory',
		'arguments': {
			'category': name
		}
	}).load(callback);
};

/**
 * Recuperer les derniers paquets parus.
 * @param limit Le nombre de paquets a renvoyer.
 * @param W.Callback userCallback Le callback.
 */
SPackage.getLastPackages = function(limit, userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getLastPackages',
		'arguments': {
			'limit': limit
		}
	}).load(callback);
};

/**
 * Recuperer les paquets installes.
 * @param W.Callback userCallback Le callback.
 */
SPackage.getInstalled = function(userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getInstalled'
	}).load(callback);
};

SPackage.getLastInstalled = function(limit, userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getLastInstalled',
		arguments: {
			limit: limit
		}
	}).load(callback);
};

SPackage.searchPackages = function(search, userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'searchPackages',
		arguments: {
			search: search
		}
	}).load(callback);
};

/**
 * Recuperer les mises a jour disponibles.
 * @param W.Callback userCallback Le callback.
 */
SPackage.getUpdates = function(userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(SPackage.objectToPackageList(response.getData()));
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getUpdates'
	}).load(callback);
};

/**
 * Recharger le cache.
 * @param W.Callback userCallback Le callback.
 */
SPackage.updateCache = function(userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(response);
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'updateCache'
	}).load(callback);
};

/**
 * Installer les mises a jour.
 * @param W.Callback userCallback Le callback.
 */
SPackage.upgrade = function(userCallback) {
	var callback = new W.Callback(function(response) {
		userCallback.success(response);
	}, function(response) {
		userCallback.error(response);
	});
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'upgrade'
	}).load(callback);
};

/**
 * Convertir un objet en liste de paquets.
 * @param data L'objet a convertir.
 * @return object Un objet contenant les paquets.
 */
SPackage.objectToPackageList = function(data) {
	var list = [];
	for (var key in data) {
		list.push(new SPackage(key, data[key]));
	}
	return list;
};

//Objet contenant le nom de code des categories et leur titre associe
SPackage._categories = {
	'accessories': 'Accessoires',
	'office': 'Bureautique',
	'graphics': 'Graphisme',
	'internet': 'Internet',
	'games': 'Jeux',
	'soundandvideo': 'Son et vid&eacute;o',
	'system': 'Syst&egrave;me'
};
SPackage.categories = function(callback) {
	callback = W.Callback.toCallback(callback);
	
	callback.success(SPackage._categories);
};