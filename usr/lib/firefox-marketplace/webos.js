Webos.require([
	'/usr/lib/webos/data.js',
	'/usr/lib/xtag/webos.js',
	'/usr/lib/apt/apt.js'
], function() {
	var FirefoxMarketplace = {};

	FirefoxMarketplace.api = {};
	Webos.Observable.build(FirefoxMarketplace.api);

	FirefoxMarketplace.api._config = {
		baseUrl: 'https://marketplace.firefox.com/api'
		//baseUrl: 'https://marketplace-dev.allizom.org/api' //For dev only
	};
	FirefoxMarketplace.api.config = function(key) {
		if (typeof key == 'undefined') {
			return FirefoxMarketplace.api._config;
		} else {
			return FirefoxMarketplace.api._config[key];
		}
	};
	FirefoxMarketplace.api._sendRequest = function(options, callback) {
		callback = W.Callback.toCallback(callback);

		var defaults = {
			url: null,
			type: 'get',
			parameters: {}
		};
		options = $.extend({}, defaults, options);

		if (!options.url) {
			callback.error(Webos.Callback.Result.error('Cannot send Firefox Marketplace request : empty request url'));
			return;
		}

		var operation = new Webos.Operation();
		operation.addCallbacks(callback);

		$.ajax({
			type: options.type,
			url: FirefoxMarketplace.api.config('baseUrl') + '/' + options.url,
			data: options.parameters,
			dataType: 'json'
		}).done(function(data) {
			operation.setCompleted(data);
		}).fail(function(jqXHR, textStatus, httpCode) {
			var msg = 'Firefox Marketplace request failed ['+httpCode+']';

			var data = null;
			try {
				data = $.parseJSON(jqXHR.responseText);
			} catch(e) {}

			if (data) {
				for (var key in data.error_message) {
					msg = data.error_message[key];
					break;
				}
			}

			operation.setCompleted(Webos.Callback.Result.error(msg));
		});

		return operation;
	};

	FirefoxMarketplace.api.App = function(data) {
		Webos.Package.call(this, data);
	};
	FirefoxMarketplace.api.App.prototype = {
		hydrate: function(data) {
			if (!data.title) {
				data.title = data.name;
				data.name = data.codename;
			}
			if (!data.codename) {
				if (data.slug) {
					data.codename = data.slug;
				} else if (data.name) {
					data.codename = data.name;
				}
			}
			if (!data.version) {
				data.version = data.current_version;
			}
			data.lastupdate = Date.parse(data.created) / 1000;

			return Webos.Package.prototype.hydrate.call(this, data);
		},
		icon: function() {
			if (this._get('icon')) {
				return this._get('icon');
			}

			var icons = this._get('icons');
			if (icons['48']) {
				return icons['48'];
			} else {
				for(var size in icons) {
					return icons[size];
				}
			}
		},
		shortdescription: function() {
			var desc = this._get('description'), maxShortDescLength = 40, shortDescription = desc;

			if (desc.length > maxShortDescLength) {
				shortDescription = desc.slice(0, maxShortDescLength) + '...';
			}

			return shortDescription;
		},
		installable: function() {
			return (this.get('app_type') == 'hosted');
		},
		runnable: function() {
			return (this.get('app_type') == 'hosted');
		},
		run: function(callback) {
			callback = W.Callback.toCallback(callback);
			var that = this;

			if (!this.get('runnable')) {
				callback.error(Webos.Callback.Result.error('This app cannot be executed without installation'));
				return;
			}

			FirefoxMarketplace._getManifest(this.get('manifest_url'), [function(manifest) {
				var appData = {
					manifestURL: that.get('manifest_url'),
					manifest: manifest,
					app: that.data()
				};

				FirefoxMarketplace._runApp(appData, callback);
			}, callback.error]);
		},
		install: function(callback) {
			var that = this;

			var manifestFilePath = '/usr/lib/firefox-marketplace/webapps/'+this.get('codename')+'/manifest.webapp',
				operation = new Webos.Operation();

			operation.addCallbacks(callback);

			if (!this.get('installable')) {
				operation.setCompleted(Webos.Callback.Result.error('This app cannot be installed'));
				return;
			}

			this.trigger('installstart');
			Webos.Package.trigger('installstart', { 'package': this });

			new W.ServerCall({
				'class': 'FirefoxMarketplaceController',
				method: 'install',
				arguments: {
					'manifestUrl': this.get('manifest_url'),
					'appData': that.data()
				}
			}).load([function(res) {
				that._hydrate({
					'installed': true,
					'installDate': Math.round(+new Date() / 1000)
				});

				that.trigger('install installcomplete installsuccess');
				Webos.Package.trigger('install installcomplete installsuccess', { 'package': that });

				operation.setCompleted();
			}, function(res) {
				that.trigger('installcomplete installerror');
				Webos.Package.trigger('installcomplete installerror', { 'package': that });

				operation.setCompleted(res);
			}]);

			return operation;
		},
		remove: function(callback) {
			callback = W.Callback.toCallback(callback);
			var that = this;

			if (!this.get('installed')) {
				callback.error(Webos.Callback.Result.error('This app is not installed'));
				return;
			}

			this.trigger('removestart');
			Webos.Package.trigger('removestart', { 'package': this });

			return new W.ServerCall({
				'class': 'FirefoxMarketplaceController',
				method: 'remove',
				arguments: {
					'appName': this.get('codename')
				}
			}).load([function(res) {
				that._hydrate({
					'installed': false,
					'installDate': null
				});

				that.trigger('remove removecomplete removesuccess');
				Webos.Package.trigger('remove removecomplete removesuccess', { 'package': that });

				callback.success();
			}, function(res) {
				that.trigger('removecomplete removeerror');
				Webos.Package.trigger('removecomplete removeerror', { 'package': that });

				callback.error(res);
			}]);
		}
	};
	Webos.inherit(FirefoxMarketplace.api.App, Webos.Package);

	FirefoxMarketplace.api.buildPkg = function(data) {
		return new FirefoxMarketplace.api.App(data);
	};
	FirefoxMarketplace.api._parseAppsList = function(objects) {
		var apps = [];

		for(var i = 0; i < objects.length; i++) {
			apps.push(FirefoxMarketplace.api.buildPkg(objects[i]));
		}

		return apps;
	};

	FirefoxMarketplace.api.featuredApps = function(params, callback) {
		callback = W.Callback.toCallback(callback);

		params = $.extend({
			type: 'app',
			app_types: 'hosted'
		}, params);

		return FirefoxMarketplace.api._sendRequest({
			url: 'v1/fireplace/search/featured/',
			parameters: params
		}, [function(data) {
			var list = FirefoxMarketplace.api._parseAppsList(data.objects);

			if (typeof params.limit == 'number') {
				list = list.slice(0, params.limit);
			}

			callback.success(list);
		}, callback.error]);
	};

	FirefoxMarketplace.api.featuredPackages = function(params, callback) {
		return FirefoxMarketplace.api.featuredApps(params, callback);
	};

	FirefoxMarketplace.api.searchPackages = function(params, callback) {
		callback = W.Callback.toCallback(callback);

		params = $.extend({
			type: 'app',
			app_types: 'hosted'
		}, params);

		return FirefoxMarketplace.api._sendRequest({
			url: 'v1/apps/search/',
			parameters: params
		}, [function(data) {
			var list = FirefoxMarketplace.api._parseAppsList(data.objects);

			if (typeof params.limit == 'number') {
				list = list.slice(0, params.limit);
			}

			callback.success(list);
		}, callback.error]);
	};

	FirefoxMarketplace.api.lastPackages = function(params, callback) {
		params = $.extend({}, params, {
			sort: 'created'
		});

		return FirefoxMarketplace.api.searchPackages(params, callback);
	};

	FirefoxMarketplace.api.categories = function(callback) {
		callback = W.Callback.toCallback(callback);

		return FirefoxMarketplace.api._sendRequest({
			url: 'v1/apps/category/'
		}, [function(data) {
			var list = {};
			for (var i = 0; i < data.objects.length; i++) {
				var catData = data.objects[i];
				list[catData.slug] = catData.name;
			}

			callback.success(list);
		}, callback.error]);
	};

	FirefoxMarketplace.api.installPackage = function(pkg, callback) {
		callback = W.Callback.toCallback(callback);

		return FirefoxMarketplace.api._sendRequest({
			url: 'v1/apps/category/'
		}, [function(data) {
			var list = {};
			for (var i = 0; i < data.objects.length; i++) {
				var catData = data.objects[i];
				list[catData.slug] = catData.name;
			}

			callback.success(list);
		}, callback.error]);
	};

	if (!Webos.Package.typeExists('firefoxMarketplace')) {
		Webos.Package.addType('firefoxMarketplace', FirefoxMarketplace.api);
		Webos.Package.addSource('firefoxMarketplace', 'firefoxMarketplace');
	}

	FirefoxMarketplace._getManifest = function(manifestUrl, callback) {
		callback = W.Callback.toCallback(callback);

		return new Webos.ServerCall({
			'class': 'FirefoxMarketplaceController',
			'method': 'getManifest',
			'arguments': {
				'manifestUrl': manifestUrl
			}
		}).load([function(res) {
			var manifest = $.parseJSON(res.getData().manifest);

			callback.success(manifest);
		}, callback.error]);
	};

	FirefoxMarketplace._checkLaunchPage = function(launchPage, callback) {
		callback = W.Callback.toCallback(callback);

		return new Webos.ServerCall({
			'class': 'FirefoxMarketplaceController',
			'method': 'checkLaunchPage',
			'arguments': {
				'launchPage': launchPage
			}
		}).load([function(res) {
			callback.success(res.getData());
		}, callback.error]);
	};

	FirefoxMarketplace._runApp = function(appData, callback) {
		callback = W.Callback.toCallback(callback);

		var manifestLink = document.createElement("a");
		manifestLink.href = appData.manifestURL;

		var launchUrl = manifestLink.host;
		if (appData.manifest.launch_path) {
			launchUrl += '/' + appData.manifest.launch_path;
		}
		launchUrl = launchUrl.replace(/\/{2,}/, '/');
		launchUrl = manifestLink.protocol+'//'+launchUrl;

		var windowSize = { width: 320, height: 480 };
		var isMaximized = false, appIcon = null;

		if (appData.localIcon) {
			appIcon = appData.localIcon;
		} else if (appData.app.icons['48']) {
			appIcon = appData.app.icons['48'];
		} else {
			for(var size in icons) {
				appIcon = appData.app.icons[size];
				break;
			}
		}

		if ($.inArray('desktop', appData.app.device_types) != -1 || $.inArray('tablet', appData.app.device_types) != -1) {
			isMaximized = true;
		}

		var appWindow = $.w.window({
			title: appData.app.title,
			icon: appIcon,
			width: windowSize.width,
			height: windowSize.height,
			maximized: isMaximized
		});

		appWindow.window('open').window('loading', true, {
			message: 'Checking app compatibility...'
		});

		FirefoxMarketplace._checkLaunchPage(launchUrl, [function(launchData) {
			if (!launchData.isLaunchable) {
				appWindow.window('close');
				callback.error(Webos.Callback.Result.error('This app is not supported'));
				return;
			}

			appWindow.window('loading', true, {
				lock: false
			});

			var iframe = $('<iframe></iframe>', {
				src: launchUrl
			}).css({
				border: 'none',
				width: '100%',
				height: '100%'
			}).appendTo(appWindow.window('content'));

			iframe.one('load', function() {
				appWindow.window('loading', false);
			});

			appWindow.window('content').css('overflow', 'hidden');
		}, function(res) {
			appWindow.window('close');
			callback.error(res);
		}]);
	};

	window.FirefoxMarketplace = FirefoxMarketplace; //Export API
});