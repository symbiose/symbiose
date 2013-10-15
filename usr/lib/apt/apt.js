(function() {
	if (typeof Webos.Package != 'undefined') {
		return;
	}

	/**
	 * Webos.Package represente un paquet.
	 * @param name Le nom du paquet.
	 * @param data Les donnees sur le paquet.
	 * @return Webos.Package Le paquet.
	 */
	Webos.Package = function WPackage(data) {
		Webos.Model.call(this, data);

		this.on('installstart removestart', function() {
			this._operationPending = true;
		});
		this.on('installcomplete removecomplete', function() {
			this._operationPending = false;
		});
	};

	Webos.Package.prototype = {
		_operationPending: false,
		/**
		 * Trigger an error because the current action is unavailable on this type of package.
		 * @param {Webos.Callback} [callback] The callback function which will be called.
		 * @private
		 */
		_unsupportedMethod: function(callback) {
			callback = Webos.Callback.toCallback(callback);
			
			callback.error(Webos.Callback.Result.error('Cannot execute this operation on this type of package "'+this.get('name')+'"'));
		},
		/**
		 * Install this package system-wide.
		 * @param Webos.Callback callback
		 */
		install: function(callback) {
			this._unsupportedMethod(callback);
		},
		/**
		 * Delete this package system-wide.
		 * @param Webos.Callback callback
		 */
		remove: function(callback) {
			this._unsupportedMethod(callback);
		},
		/**
		 * Check if an operation is pending on this package.
		 * @return {boolean} True if an operation is pending, false otherwise.
		 */
		operationPending: function() {
			return this._operationPending;
		},
		installed_time: function() {
			return this.get('installDate');
		},
		author: function() {
			return this.get('maintainer');
		},
		category: function() {
			if (typeof this._get('category') != 'undefined') {
				return this._get('category');
			}
			if (typeof this._get('categories') != 'undefined') {
				return this._get('categories')[0];
			}
		},
		//Cannot edit a package's data
		set: function() {
			return false;
		}
	};
	Webos.inherit(Webos.Package, Webos.Model);

	Webos.Observable.build(Webos.Package);
	Webos.Package._types = {};
	Webos.Package._sources = [];
	Webos.Package._cache = {
		categories: null,
		installed: null
	};

	Webos.Package.typeApi = function(typeName) {
		return Webos.Package._types[typeName];
	};
	Webos.Package.types = function() {
		return Webos.Package._types;
	};
	Webos.Package.typeExists = function(typeName) {
		return (typeof Webos.Package._types[typeName] != 'undefined');
	};
	Webos.Package.addType = function(typeName, typeApi) {
		Webos.Package._types[typeName] = typeApi;
	};
	Webos.Package.removeType = function(typeName) {
		delete Webos.Package._types[typeName];
	};

	Webos.Package.sources = function() {
		return Webos.Package._sources;
	};
	Webos.Package.addSource = function(sourceName, sourceType, sourceData) {
		if (!Webos.Package.typeExists(sourceType)) {
			return false;
		}

		Webos.Package._sources.push({
			name: sourceName,
			type: sourceType,
			data: sourceData || {}
		});
	};
	Webos.Package.removeSource = function(sourceName) {
		var sources = [];

		for(var i = 0; i < Webos.Package._sources.length; i++) {
			if (Webos.Package._sources[i].name !== sourceName) {
				sources.push(Webos.Package._sources[i]);
			}
		}

		Webos.Package._sources = sources;
	};

	Webos.Package._pkgsListToObject = function(list) {
		var pkgs = {};

		for (var i = 0; i < list.length; i++) {
			pkgs[list[i].get('codename')] = list[i];
		}

		return pkgs;
	};
	Webos.Package._getPackagesList = function(method, customArgs, callback) {
		callback = Webos.Callback.toCallback(callback);

		var mergeWithInstalledPkgs = function(pkgs, callback) {
			Webos.Package.getInstalled([function(installedList) {
				var installed = Webos.Package._pkgsListToObject(installedList);

				for (var i = 0; i < pkgs.length; i++) {
					var pkgName = pkgs[i].get('codename');
					if (typeof installed[pkgName] != 'undefined') {
						pkgs[i].hydrate(installed[pkgName].data());
					}
				}

				callback.success(pkgs);
			}, callback.error]);
		};

		var sources = Webos.Package.sources(),
			operationsList = [],
			pkgs = [];

		var args = customArgs || [];
		if (!(args instanceof Array)) {
			args = [args];
		}

		args.push([function(sourcePkgs) {
			pkgs = pkgs.concat(sourcePkgs);
		}, callback.error]);

		for (var i = 0; i < sources.length; i++) {
			var typeApi = Webos.Package.typeApi(sources[i].type);
			operationsList.push(typeApi[method].apply(typeApi, args));
		}

		var operations = Webos.Operation.group(operationsList);
		if (operations.observables().length > 0) {
			operations.one('success', function() {
				mergeWithInstalledPkgs(pkgs, callback);
			});
		} else {
			mergeWithInstalledPkgs(pkgs, callback);
		}

		return operations;
	};

	/**
	 * Recuperer un paquet.
	 * @param string name Le nom du paquet.
	 * @param Webos.Callback callback
	 */
	Webos.Package.get = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);

		var operation = new Webos.Operation();
		
		if (Webos.isInstanceOf(name, Webos.Package)) {
			callback.success(name);
			return;
		} else {
			var sources = Webos.Package.sources(), result, found = false, notFound = 0;
			for(var i = 0; i < sources.length; i++) {
				var typeApi = Webos.Package.typeApi(sources[i].type);
				typeApi.get(name, [function(pkg) {
					if (found) {
						return;
					}

					found = true;
					callback.success(pkg);
					operation.setCompleted(pkg);
				}, function() {
					if (found) {
						return;
					}

					notFound++;
					
					if (notFound >= sources.length) {
						callback.error('Cannot find package "'+name+'"');
						operation.setCompleted(false);
					}
				}]);
			}
		}

		return operation;
	};

	/**
	 * Recuperer tous les paquets d'une categorie.
	 * @param string name Le nom de la categorie.
	 * @param Webos.Callback callback
	 */
	Webos.Package.getFromCategory = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		return Webos.Package._getPackagesList('searchPackages', {
			cat: name
		}, [function(list) {
			for (var i = 0; i < list.length; i++) {
				list[i]._set('category', name);
			}
			callback.success(list);
		}, callback.error]);
	};

	/**
	 * Recuperer les derniers paquets parus.
	 * @param int limit Le nombre de paquets a renvoyer.
	 * @param Webos.Callback callback
	 */
	Webos.Package.getLastPackages = function(limit, callback) {
		return Webos.Package._getPackagesList('lastPackages', {
			limit: limit
		}, callback);
	};

	/**
	 * Recuperer les derniers paquets parus.
	 * @param int limit Le nombre de paquets a renvoyer.
	 * @param Webos.Callback callback
	 */
	Webos.Package.getFeaturedPackages = function(limit, callback) {
		return Webos.Package._getPackagesList('featuredPackages', {
			limit: limit
		}, callback);
	};

	/**
	 * Recuperer les paquets installes.
	 * @param Webos.Callback callback
	 */
	Webos.Package.getInstalled = function(callback) {
		callback = Webos.Callback.toCallback(callback);

		if (Webos.Package._cache.installed !== null) {
			callback.success(Webos.Package._cache.installed);
			return;
		}

		return new W.ServerCall({
			'class': 'LocalRepositoryController',
			'method': 'getInstalled'
		}).load([function(response) {
			var packagesData = response.getData(), list = [];

			for (var i in packagesData) {
				var pkgData = packagesData[i];
				var typeApi = Webos.Package.typeApi(pkgData.type);
				list.push(typeApi.buildPkg(pkgData));
			}

			Webos.Package._cache.installed = list;

			callback.success(list);
		}, callback.error]);
	};

	Webos.Package.getLastInstalled = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);

		return Webos.Package.getInstalled([function(list) {
			list.sort(function (a, b) {
				if (a.get('installDate') > b.get('installDate')) {
					return 1;
				}
				if (a.get('installDate') < b.get('installDate')) {
					return -1;
				}
				return 0;
			});

			callback.success(list.slice(0, limit));
		}, callback.error]);
	};

	Webos.Package.searchPackages = function(query, callback) {
		return Webos.Package._getPackagesList('searchPackages', {
			q: query
		}, callback);
	};

	/**
	 * Recuperer les mises a jour disponibles.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Package.getUpdates = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		
	};

	/**
	 * Installer les mises a jour.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Package.upgrade = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		

	};

	Webos.Package.categories = function(callback) {
		callback = Webos.Callback.toCallback(callback);

		if (Webos.Package._cache.categories) {
			callback.success(Webos.Package._cache.categories);
			return;
		}

		var types = Webos.Package.types(),
			operationsList = [],
			categories = {};

		for (var typeName in types) {
			operationsList.push(types[typeName].categories([function(sourceCats) {
				$.extend(categories, sourceCats);
			}, callback.error]));
		}

		var operations = Webos.Operation.group(operationsList);
		if (operations.observables().length > 0) {
			operations.one('success', function() {
				Webos.Package._cache.categories = categories;
				callback.success(categories);
			});
		} else {
			Webos.Package._cache.categories = categories;
			callback.success(categories);
		}

		return operations;
	};

	Webos.Package.on('install.application.webos remove.application.webos', function() {
		if (Webos.Application) {
			Webos.Application.clearCache();
		}
	});


	// CONFITURE

	Webos.Confiture = {};
	Webos.Observable.build(Webos.Confiture);

	/**
	 * Webos.Confiture.Package represente un paquet.
	 * @param name Le nom du paquet.
	 * @param data Les donnees sur le paquet.
	 * @return Webos.Confiture.Package Le paquet.
	 */
	Webos.Confiture.Package = function (data, codename) {
		this._codename = codename;
		this._running = false;
		Webos.Package.call(this, data);
	};

	Webos.Confiture.Package.prototype = {
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
			Webos.Confiture.Package.notify('installstart', { 'package': that });
			
			return new W.ServerCall({
				'class': 'PackageController',
				'method': 'install',
				arguments: {
					'package': this.codename(),
					//'repository': this.get('repository') //Do not specify the repository (prevent from installing from the local repository)
				}
			}).load(new Webos.Callback(function(response) {
				that._running = false;
				that._hydrate({
					'installed': true,
					'installed_time': Math.round(+new Date() / 1000)
				});
				
				callback.success(that);
				
				that.notify('install');
				Webos.Confiture.Package.notify('install', { 'package': that });
				that.notify('installsuccess');
				Webos.Confiture.Package.notify('installsuccess', { 'package': that });
				that.notify('installcomplete');
				Webos.Confiture.Package.notify('installcomplete', { 'package': that });
			}, function(response) {
				that._running = false;
				callback.error(response);
				
				that.notify('installerror');
				Webos.Confiture.Package.notify('installerror', { 'package': that });
				that.notify('installcomplete');
				Webos.Confiture.Package.notify('installcomplete', { 'package': that });
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
			Webos.Confiture.Package.notify('removestart', { 'package': that });
			
			return new W.ServerCall({
				'class': 'PackageController',
				'method': 'remove',
				arguments: {
					'package': this.codename()
				}
			}).load(new Webos.Callback(function(response) {
				that._running = false;
				that._hydrate({
					'installed': false,
					'installed_time': null
				});
				
				callback.success(that);
				
				that.notify('remove');
				Webos.Confiture.Package.notify('remove', { 'package': that });
				that.notify('removesuccess');
				Webos.Confiture.Package.notify('removesuccess', { 'package': that });
				that.notify('removecomplete');
				Webos.Confiture.Package.notify('removecomplete', { 'package': that });
			}, function(response) {
				that._running = false;
				callback.error(response);
				
				that.notify('removeerror');
				Webos.Confiture.Package.notify('removeerror', { 'package': that });
				that.notify('removecomplete');
				Webos.Confiture.Package.notify('removecomplete', { 'package': that });
			}));
		},
		isRunning: function() {
			return this._running;
		},
		set: function() {
			return false;
		}
	};
	Webos.inherit(Webos.Confiture.Package, Webos.Package);

	/**
	 * Recuperer tous les paquets disponibles.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getAvailable = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getAvailable'
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer un paquet.
	 * @param string name Le nom du paquet.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.get = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getPackage',
			'arguments': {
				'package': name
			}
		}).load(new Webos.Callback(function(response) {
			var pkg = new Webos.Confiture.Package(response.getData(), name);
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
	Webos.Confiture.Package.getFromCategory = function(name, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getFromCategory',
			'arguments': {
				'category': name
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les derniers paquets parus.
	 * @param int limit Le nombre de paquets a renvoyer.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getLastPackages = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getLastPackages',
			'arguments': {
				'limit': limit
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les paquets installes.
	 * @param Webos.Callback callback
	 */
	Webos.Confiture.Package.getInstalled = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getInstalled'
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	Webos.Confiture.Package.getLastInstalled = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getLastInstalled',
			arguments: {
				limit: limit
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	Webos.Confiture.Package.searchPackages = function(search, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'searchPackages',
			arguments: {
				search: search
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recuperer les mises a jour disponibles.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.getUpdates = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'getUpdates'
		}).load(new Webos.Callback(function(response) {
			callback.success(Webos.Confiture.Package._objectToPackageList(response.getData()));
		}, function(response) {
			callback.error(response);
		}));
	};

	/**
	 * Recharger le cache.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.updateCache = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.Confiture.Package.notify('updatestart');
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'updateCache'
		}).load(new Webos.Callback(function(response) {
			callback.success(response);
			
			Webos.Confiture.Package.notify('update');
			Webos.Confiture.Package.notify('updatesuccess');
			Webos.Confiture.Package.notify('updatecomplete');
		}, function(response) {
			callback.error(response);
			
			Webos.Confiture.Package.notify('updateerror');
			Webos.Confiture.Package.notify('updatecomplete');
		}));
	};

	/**
	 * Installer les mises a jour.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Confiture.Package.upgrade = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.Confiture.Package.notify('upgradestart');
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'upgrade'
		}).load(new Webos.Callback(function(response) {
			callback.success(response);
			
			Webos.Confiture.Package.notify('upgrade');
			Webos.Confiture.Package.notify('upgradesuccess');
			Webos.Confiture.Package.notify('upgradecomplete');
		}, function(response) {
			callback.error(response);
			
			Webos.Confiture.Package.notify('upgradeerror');
			Webos.Confiture.Package.notify('upgradecomplete');
		}));
	};

	/**
	 * Convertir un objet en liste de paquets.
	 * @param data L'objet a convertir.
	 * @return object Un objet contenant les paquets.
	 */
	Webos.Confiture.Package._objectToPackageList = function(data) {
		var list = [];
		for (var key in data) {
			list.push(new Webos.Confiture.Package(data[key], key));
		}
		return list;
	};

	//Objet contenant le nom de code des categories et leur titre associe
	Webos.Confiture.Package._categories = {
		accessories: 'Accessoires',
		office: 'Bureautique',
		graphics: 'Graphisme',
		internet: 'Internet',
		games: 'Jeux',
		soundandvideo: 'Son et vid&eacute;o',
		system: 'Syst&egrave;me'
	};
	Webos.Confiture.Package.categories = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		callback.success(Webos.Confiture.Package._categories);
		
		return Webos.Confiture.Package._categories;
	};
})();