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
		shortdescription: function() {
			var desc = this._get('description'), maxShortDescLength = 40, shortDescription = desc;

			if (desc.length > maxShortDescLength) {
				shortDescription = desc.slice(0, maxShortDescLength) + '...';
			}

			return shortDescription;
		},
		installed_time: function() {
			return this.get('installDate');
		},
		author: function() {
			return this.get('maintainer');
		},
		category: function() {
			if (this._get('category')) {
				return this._get('category');
			}
			if (this._get('categories')) {
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
			}, function() { //Error -> no problem, that's not so important
				callback.success(pkgs);
			}]);
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
	Webos.Package.listInstalled = function(callback) {
		callback = Webos.Callback.toCallback(callback);

		if (Webos.Package._cache.installed !== null) {
			callback.success(Webos.Package._cache.installed);
			return;
		}

		return new W.ServerCall({
			'class': 'LocalRepositoryController',
			'method': 'listInstalled'
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
	Webos.Package.on('install', function(data) {
		if (Webos.Package._cache.installed !== null) {
			Webos.Package._cache.installed.push(data.package);
		}

		if (Webos.Application) {
			Webos.Application.clearCache();
		}
	});
	Webos.Package.on('remove', function(data) {
		var pkgToRemove = data.package;
		
		if (Webos.Package._cache.installed === null) {
			return;
		}

		var list = [];

		for (var i = 0; i < Webos.Package._cache.installed.length; i++) {
			var pkg = Webos.Package._cache.installed[i];

			if (pkg.get('codename') != pkgToRemove.get('codename') || pkg.get('type') != pkgToRemove.get('type')) {
				list.push(pkg);
			}
		}

		Webos.Package._cache.installed = list;

		if (Webos.Application) {
			Webos.Application.clearCache();
		}
	});

	/**
	 * @deprecated Use Webos.Package.listInstalled() instead.
	 */
	Webos.Package.getInstalled = function(callback) {
		return Webos.Package.listInstalled(callback);
	};

	Webos.Package.getInstalledPackage = function(pkgName, callback) {
		callback = Webos.Callback.toCallback(callback);

		var findPackage = function(installed) {
			for (var i = 0; i < installed.length; i++) {
				var pkg = installed[i];

				if (pkg.get('name') == pkgName) {
					callback.success(pkg);
					return;
				}
			}

			callback.error(Webos.Callback.Result.error('Cannot find package "'+pkgName+'"'));
		};

		if (Webos.Package._cache.installed !== null) {
			findPackage(Webos.Package._cache.installed);
			return;
		}

		return Webos.Package.listInstalled([function (list) {
			findPackage(list);
		}, callback.error]);
	};

	Webos.Package.getLastInstalled = function(limit, callback) {
		callback = Webos.Callback.toCallback(callback);

		return Webos.Package.getInstalled([function(list) {
			list.sort(function (a, b) {
				return a.get('installDate') - b.get('installDate');
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

		callback.error(Webos.Callback.Result.error('Updates are not available for the moment'));
	};

	/**
	 * Installer les mises a jour.
	 * @param Webos.Callback callback Le callback.
	 */
	Webos.Package.upgrade = function(callback) {
		callback = Webos.Callback.toCallback(callback);

		callback.error(Webos.Callback.Result.error('Updates are not available for the moment'));
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
})();