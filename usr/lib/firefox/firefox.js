function FirefoxWindow(url) {
	this._window = $.w.window.main({
		title: 'Firefox',
		icon: new W.Icon('applications/firefox'),
		width: 500,
		height: 400,
		maximized: true,
		stylesheet: 'usr/share/css/firefox/main.css'
	});

	var that = this;

	this._iframe = $();
	this._configForm = $();

	this._url = '';

	this._homePage = 'http://www.duckduckgo.com/html?kd=-1&kn=-1';

	this._proxyEnabled = false;
	this._proxyUrl = '../phproxy-improved/';
	this._proxyFlags = {
		'include_form'    : false,
		'remove_scripts'  : false,
		'accept_cookies'  : true,
		'show_images'     : true,
		'show_referer'    : true,
		'rotate13'        : false,
		'base64_encode'   : true,
		'strip_meta'      : true,
		'strip_title'     : false,
		'session_cookies' : true
	};

	this.url = function() {
		return this._url;
	};

	this.proxyEnabled = function() {
		return this._proxyEnabled;
	};
	this.proxyFlag = function(flag) {
		return this._proxyFlags[flag];
	};
	this._getProxyFlagsBinary = function() {
		var proxyFlagsStr = '';

		for (var flag in this._proxyFlags) {
			proxyFlagsStr += (this._proxyFlags[flag]) ? 1 : 0;
		}

		return proxyFlagsStr;
	};
	this._baseConvert = function(number, frombase, tobase) {
		return parseInt(number + '', frombase | 0).toString(tobase | 0);
	};
	this._proxifyUrl = function(url, location) {
		if (url.indexOf('about:') == 0) {
			return url;
		}

		var proxyFlagsStr = this._baseConvert(this._getProxyFlagsBinary(), 2, 16);

		var proxifiedUrl = this._proxyUrl + '?q='+encodeURIComponent(btoa(url))+'&hl='+encodeURIComponent(proxyFlagsStr);

		return proxifiedUrl;
	};

	this._goToConfig = function() {
		var that = this;

		this._iframe.hide();
		this._configForm.remove();

		this._configForm = $.w.entryContainer().appendTo(this._window.window('content'));
		var form = this._configForm;

		var $proxyConfig = $();

		var proxySwitcher = $.w.switchButton('Enable proxy ', this.proxyEnabled()).on('switchbuttonchange', function(e, data) {
			that._proxyEnabled = data.value;
			$proxyConfig.toggle(data.value);
		}).appendTo(form);

		var proxyUrl = $.w.textEntry('Proxy URL ', this._proxyUrl).on('textentrychange', function(e, data) {
			that._proxyUrl = data.value;
		}).appendTo(form);
		$proxyConfig = $proxyConfig.add(proxyUrl);

		var proxyFlagsDesc = {
			'remove_scripts'  : 'Enable Javascript',
			'accept_cookies'  : 'Accept cookies',
			'show_images'     : 'Show images'
		};

		for (var flag in proxyFlagsDesc) {
			(function(flag, label) {
				var switcher = $.w.switchButton(label+' ', that.proxyFlag(flag)).on('switchbuttonchange', function(e, data) {
					that._proxyFlags[flag] = data.value;
				}).appendTo(form);

				$proxyConfig = $proxyConfig.add(switcher);
			})(flag, proxyFlagsDesc[flag]);
		}
		
		$proxyConfig.toggle(this.proxyEnabled());
	};
	
	this.browse = function(location) {
		var that = this;

		that._window.window('loading', false);

		var url = '';
		if (Webos.isInstanceOf(location, Webos.File)) {
			url = file.get('realpath');
			this.historyLocation++;
		} else if (typeof location == 'string') {
			url = location;
			this.historyLocation++;
		}

		if (url == 'about:home') {
			url = this._homePage;
		}

		var showConfig = false;
		if (url == 'about:config') {
			showConfig = true;
		}

		this._urlInput.val(url);
		this._url = url;

		if (this.proxyEnabled()) {
			url = this._proxifyUrl(url);
		}

		if (showConfig) {
			this._goToConfig();
			return;
		} else {
			this._configForm.hide();
			this._iframe.show();
		}

		this._iframe.remove();
		this._iframe = $('<iframe></iframe>', { src: url });

		this._iframe.appendTo(this._window.window('content'));


		this._window.window('loading', true, {
			lock: false
		});

		this._iframe.unload(function(e) {
			that._window.window('loading', true, {
				lock: false
			});
		}).load(function() {
			that._window.window('loading', false);

			if (that.proxyEnabled()) {
				var proxyHref = that._iframe[0].contentWindow.location.href,
				proxyQuery = proxyHref.split('?')[1],
				proxyParams = proxyQuery.split('&'),
				proxyUrl = url;

				for (var i = 0; i < proxyParams.length; i++) {
					proxyParams[i] = proxyParams[i].split('=');
				}

				proxyParams = _.object(proxyParams);

				var encodedUrl;
				if (proxyParams.____pgfa) {
					encodedUrl = proxyParams.____pgfa;
				} else if (proxyParams.q) {
					encodedUrl = proxyParams.q;
				}

				if (encodedUrl) {
					try {
						proxyUrl = window.atob(decodeURIComponent(encodedUrl));
					} catch(e) {
						try {
							proxyUrl = window.atob(decodeURIComponent(decodeURIComponent(encodedUrl)));
						} catch(e) {
							proxyUrl = encodedUrl;
						}
					}
				}

				that._urlInput.val(proxyUrl);
				that._url = proxyUrl;
			}
		}).error(function() {
			that._window.window('loading', false);
			W.Error.trigger('Impossible d\'afficher la page : une erreur du navigateur est survenue.');
		});
	};

	this.previous = function(diff) {
		this._iframe[0].contentWindow.history.go(-1);
	};
	
	this.next = function(diff) {
		this._iframe[0].contentWindow.history.go(1);
	};

	this.goHome = function() {
		this.browse('about:home');
	};

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
}