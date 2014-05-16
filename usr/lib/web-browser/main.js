(function () {
	var WebBrowserWindow = function (url) {
		var that = this;

		Webos.Observable.call(this);

		this.initialize();

		this.once('ready', function () {
			that.browse(url || 'about:home');
		});
	};
	WebBrowserWindow.prototype = {
		_url: '',
		_$win: $(),
		_$iframe: $(),
		_$configForm: $(),
		_config: {
			homepage: 'https://www.duckduckgo.com/?kd=-1&kn=-1',
			enableProxy: true,
			proxyUrl: 'http://symbiose-proxy.herokuapp.com/',
			proxyFlags: {
				'include_form'    : false,
				'remove_scripts'  : false,
				'accept_cookies'  : true,
				'show_images'     : true,
				'show_referer'    : true,
				'rotate13'        : false,
				'base64_encode'   : true,
				'strip_meta'      : false,
				'strip_title'     : false,
				'session_cookies' : true,
				'allow_304' 	  : true
			}
		},
		_settingsPreviousUrl: '',
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/web-browser/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');

				var $win = that._$win;

				$win.window('open');

				that._initUi();

				that.trigger('ready');
			});
		},
		_initUi: function () {
			var that = this;
			var $win = this._$win;

			$win.find('.input-url').keydown(function(e) {
				if (e.keyCode == 13) {
					that.browse($(this).val());
					e.preventDefault();
				}
			});

			$win.find('.btn-go-previous').click(function () {
				that.previous();
			});
			$win.find('.btn-go-next').click(function () {
				that.next();
			});
			$win.find('.btn-settings').click(function () {
				that.switchSettings();
			});
		},
		_proxyFlagsAsBinary: function () {
			var proxyFlagsStr = '';

			for (var flag in this._config.proxyFlags) {
				proxyFlagsStr += (this._config.proxyFlags[flag]) ? 1 : 0;
			}

			return proxyFlagsStr;
		},
		_baseConvert: function(number, frombase, tobase) {
			return parseInt(number + '', frombase | 0).toString(tobase | 0);
		},
		_proxifyUrl: function(url, location) {
			if (url.indexOf('about:') === 0) {
				return url;
			}

			var proxyFlagsStr = this._baseConvert(this._proxyFlagsAsBinary(), 2, 16);

			var proxifiedUrl = this._config.proxyUrl + '?q='+encodeURIComponent(btoa(url))+'&hl='+encodeURIComponent(proxyFlagsStr);

			return proxifiedUrl;
		},
		_XFramesOptionError: function () {
			var extensions = {
				firefox: 'https://addons.mozilla.org/en-US/firefox/addon/modify-headers/',
				chrome: 'https://chrome.google.com/webstore/detail/ignore-x-frame-headers/gleekbfjekiniecknbkamfmkohkpodhe'
			};

			W.Error.trigger('Cannot open page: internal error', 'most of the time that\'s due to security restrictions: see https://github.com/symbiose/symbiose/wiki/Proxy', 403);
		},
		_goToConfig: function() {
			var that = this;

			this._$win.find('.browser-ctn').hide();
			this._$configForm.remove();

			this._$configForm = $.w.entryContainer().addClass('settings-ctn').appendTo(this._$win.window('content'));
			var form = this._$configForm;

			var $proxyConfig = $();

			var proxySwitcher = $.w.switchButton('Enable proxy ', this.config().enableProxy).on('switchbuttonchange', function() {
				that._config.enableProxy = $(this).switchButton('value');
				$proxyConfig.toggle(that._config.enableProxy);
			}).appendTo(form);

			var proxyUrl = $.w.textEntry('Proxy URL ', this.config().proxyUrl).on('textentrychange', function() {
				that._config.proxyUrl = $(this).textEntry('value');
			}).appendTo(form);
			$proxyConfig = $proxyConfig.add(proxyUrl);

			var proxyFlagsDesc = {
				'remove_scripts'  : 'Enable Javascript',
				'accept_cookies'  : 'Accept cookies',
				'show_images'     : 'Show images'
			};

			for (var flag in proxyFlagsDesc) {
				(function(flag, label) {
					var switcher = $.w.switchButton(label+' ', that.config().proxyFlags[flag]).on('switchbuttonchange', function() {
						that._config.proxyFlags[flag] = $(this).switchButton('value');
					}).appendTo(form);

					$proxyConfig = $proxyConfig.add(switcher);
				})(flag, proxyFlagsDesc[flag]);
			}
			
			$proxyConfig.toggle(this.config().enableProxy);
		},
		switchSettings: function() {
			if (this.url() == 'about:config') {
				this._$configForm.hide();
				this._$win.find('.browser-ctn').show();

				this._$win.find('.input-url').val(this._settingsPreviousUrl);
				this._url = this._settingsPreviousUrl;
			} else {
				this._settingsPreviousUrl = this.url();
				this.browse('about:config');
			}
		},
		url: function () {
			return this._url;
		},
		config: function () {
			return this._config;
		},
		browse: function (location) {
			var that = this;

			that._$win.window('loading', false);

			var url = '';
			if (Webos.isInstanceOf(location, Webos.File)) {
				url = location.get('realpath');
				this.historyLocation++;
			} else if (typeof location == 'string') {
				url = location;
				this.historyLocation++;
			}

			if (url == 'about:home') {
				url = this._config.homepage;
			}

			var showConfig = false;
			if (url == 'about:config') {
				showConfig = true;
			}

			this._$win.find('.input-url').val(url);
			this._url = url;

			if (showConfig) {
				this._goToConfig();
				return;
			} else {
				this._$configForm.hide();
				this._$win.find('.browser-ctn').show();
			}

			if (this.config().enableProxy) {
				url = this._proxifyUrl(url);
			}

			this._$iframe.remove();
			this._$iframe = $('<iframe></iframe>', { src: url });

			this._$iframe.appendTo(this._$win.find('.browser-ctn'));

			this._$win.window('loading', true, {
				lock: false
			});

			this._$iframe.unload(function(e) {
				that._$win.window('loading', true, {
					lock: false
				});
			}).load(function() {
				that._$win.window('loading', false);

				if (that.config().enableProxy) {
					var proxyHref = '';

					try {
						proxyHref = that._$iframe[0].contentWindow.location.href;
					} catch (e) {
						return;
					}

					var proxyQuery = proxyHref.split('?')[1],
						proxyParamsList = proxyQuery.split('&'),
						proxyUrl = url;

					var proxyParams = {};
					for (var i = 0; i < proxyParamsList.length; i++) {
						var item = proxyParamsList[i].split('=');

						proxyParams[item[0]] = item[1];
					}

					var encodedUrl;
					if (proxyParams.____pgfa) {
						encodedUrl = proxyParams.____pgfa;
					} else if (proxyParams.q) {
						encodedUrl = proxyParams.q;
					}

					if (encodedUrl) {
						try {
							proxyUrl = window.atob(decodeURIComponent(encodedUrl));
						} catch(e1) {
							try {
								proxyUrl = window.atob(decodeURIComponent(decodeURIComponent(encodedUrl)));
							} catch(e2) {
								proxyUrl = encodedUrl;
							}
						}
					}

					that._$win.find('.input-url').val(proxyUrl);
					that._url = proxyUrl;
				}
			}).error(function() {
				that._$win.window('loading', false);
				that._XFramesOptionError();
			});
		},
		previous: function (diff) {
			this._$iframe[0].contentWindow.history.go(-1);
		},
		next: function (diff) {
			this._$iframe[0].contentWindow.history.go(1);
		},
		goHome: function () {
			this.browse('about:home');
		},
		reload: function (diff) {
			this._$iframe[0].contentWindow.location.reload();
		}
	};
	Webos.inherit(WebBrowserWindow, Webos.Observable);

	WebBrowserWindow.open = function (url) {
		return new WebBrowserWindow(url);
	};

	window.WebBrowserWindow = WebBrowserWindow;
})();
/*

function WebBrowserWindow(url) {
	this._iframe = $();
	this._configForm = $();

	var previousUrl;
	this.switchConfig = function() {
		if (this.url() == 'about:config') {
			this._configForm.hide();
			this._iframe.show();

			this._urlInput.val(previousUrl);
			this._url = previousUrl;
		} else {
			previousUrl = this.url();
			this.browse('about:config');
		}
	};
	
	this._toolbar = $.w.toolbarWindowHeader().appendTo(this._window.window('header'));
	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-previous'))
		.click(function() {
			that.previous();
		})
		.appendTo(this._toolbar);
	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-next'))
		.click(function() {
			that.next();
		})
		.appendTo(this._toolbar);
	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-home'))
		.click(function() {
			that.goHome();
		})
		.appendTo(this._toolbar);
	
	this._urlInput = $('<input />', { type: 'text' })
		.keydown(function(e) {
			if (e.keyCode == 13) {
				that.browse($(this).val());
				e.preventDefault();
			}
		})
		.appendTo($('<li></li>', { 'class': 'input-container' }).appendTo(this._toolbar));

	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/cog'))
		.click(function() {
			that.switchConfig();
		})
		.appendTo(this._toolbar);
	
	this._window.window('open');
	
	if (url) {
		this.browse(url);
	} else {
		this.browse('about:home');
	}
}*/
