Webos.require([
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

		$.ajax({
			type: options.type,
			url: FirefoxMarketplace.api.config('baseUrl') + '/' + options.url,
			data: options.parameters,
			dataType: 'json'
		}).done(function(data) {
			callback.success(data);
			operation.setCompleted();
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

			callback.error(Webos.Callback.Result.error(msg));
			operation.setCompleted(false);
		});

		return operation;
	};

	FirefoxMarketplace.api.App = function(data) {
		Webos.Package.call(this, data);
	};
	FirefoxMarketplace.api.App.prototype = {
		hydrate: function(data) {
			data.codename = data.slug;
			data.title = data.name;
			data.version = data.current_version;
			data.lastupdate = Date.parse(data.created) / 1000;

			return Webos.Package.prototype.hydrate.call(this, data);
		},
		icon: function() {
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
				var manifestLink = document.createElement("a");
				manifestLink.href = that.get('manifest_url');

				var launchUrl = manifestLink.protocol+'//'+manifestLink.host;
				if (manifest.launch_path) {
					launchUrl += '/' + manifest.launch_path;
				}

				var windowSize = { width: 320, height: 480 };
				var isMaximized = false;

				var appWindow = $.w.window({
					title: that.get('title'),
					icon: that.get('icon'),
					width: windowSize.width,
					height: windowSize.height,
					maximized: isMaximized
				});

				appWindow.window('open');

				var iframe = $('<iframe></iframe>', {
					src: launchUrl
				}).css({
					border: 'none',
					width: '100%',
					height: '100%'
				}).appendTo(appWindow.window('content'));

				appWindow.window('content').css('overflow', 'hidden');
			}, callback.error]);
		}
	};
	Webos.inherit(FirefoxMarketplace.api.App, Webos.Package);

	FirefoxMarketplace.api._parseApp = function(data) {
		return new FirefoxMarketplace.api.App(data);
	};
	FirefoxMarketplace.api._parseAppsList = function(objects) {
		var apps = [];

		for(var i = 0; i < objects.length; i++) {
			apps.push(FirefoxMarketplace.api._parseApp(objects[i]));
		}

		return apps;
	};

	FirefoxMarketplace.api.featuredApps = function(params, callback) {
		callback = W.Callback.toCallback(callback);

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

	Webos.Package.addSource(FirefoxMarketplace.api);


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

	window.FirefoxMarketplace = FirefoxMarketplace; //Export API
});