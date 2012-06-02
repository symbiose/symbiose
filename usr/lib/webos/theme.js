new Webos.ScriptFile('usr/lib/webos/file.js');
new Webos.ScriptFile('usr/lib/webos/config.js');

Webos.Theme = function WTheme(configFile) {
	var data = configFile.data();
	
	var defaults = {
		desktop: '',
		icons: '',
		background: '',
		animations: false
	};
	data = $.extend({}, defaults, data);
	
	Webos.Model.call(this, data);
	
	this._configFile = configFile;
};
Webos.Theme.prototype = {
	load: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		new W.ServerCall({
			'class': 'ThemeController',
			'method': 'loadCss',
			'arguments': {
				'theme': that.get('desktop'),
				'ui': Webos.UserInterface.current.name()
			}
		}).load(new Webos.Callback(function(response) {
			$.fx.off = !that.get('animations');
			var cssFiles = response.getData().css;
			for (var index in cssFiles) {
				new Webos.Stylesheet(cssFiles[index], '#'+W.UserInterface.current.element.attr('id'));
			}
			that._loadBackground();
			Webos.Theme.current = that;
			callback.success();
		}, callback.error));
	},
	_loadBackground: function() {
		var bg = Webos.File.get(this.get('background')).get('realpath');
		Webos.UserInterface.current.element
			.css('background', 'url("'+bg+'") no-repeat center center fixed #27001f')
			.css('-webkit-background-size', 'cover')
			.css('-moz-background-size', 'cover')
			.css('-o-background-size', 'cover')
			.css('background-size', 'cover')
			.css('filter', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+bg+'\', sizingMethod=\'scale\')')
			.css('-ms-filter', '"progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+bg+'\', sizingMethod=\'scale\')"');
	},
	background: function() {
		var bg = this._get('background');
		if (!bg) {
			bg = Webos.Theme.defaultBackground();
		}
		return bg;
	},
	setDesktop: function(value) {
		this._set('desktop', String(value));
		return true;
	},
	setBackground: function(value) {
		value = String(value);
		if (value == Webos.Theme.defaultBackground()) {
			value = '';
		}
		this._set('background', value);
		return true;
	},
	setIcons: function(value) {
		this._set('icons', String(value));
		return true;
	},
	setAnimations: function(value) {
		this._set('animations', (value) ? 1 : 0);
		return true;
	},
	sync: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		var data = {}, nbrChanges = 0;
		for (var key in this._unsynced) {
			if (this._unsynced[key].state === 1) {
				this._unsynced[key].state = 2;
				data[key] = this._unsynced[key].value;
				this._configFile.set(key, data[key]);
				nbrChanges++;
			}
		}
		
		if (nbrChanges == 0) {
			callback.success(this);
			return;
		}
		
		this._configFile.sync([function() {
			for (var key in that._unsynced) {
				if (that._unsynced[key].state === 2) {
					that._data[key] = that._unsynced[key].value;
					delete that._unsynced[key];
					
					switch (key) {
						case 'background':
							that._loadBackground();
							break;
						case 'animations':
							$.fx.off = !that.get('animations');
							break;
					}
					
					that.notify('update', { key: key, value: that._data[key].value });
				}
			}
			callback.success(that);
		}, callback.error]);
	}
};
Webos.inherit(Webos.Theme, Webos.Model);


Webos.Theme.current = null;
Webos.Theme._defaultBackground = 'usr/share/images/backgrounds/default.png';
Webos.Theme.defaultBackground = function() {
	return Webos.Theme._defaultBackground;
};

Webos.Theme.get = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var ui = Webos.UserInterface.current.name();
	Webos.ConfigFile.loadUserConfig('~/.theme/'+ui+'/config.xml', '/usr/etc/uis/'+ui+'/config.xml', [function(config) {
		var theme = new Webos.Theme(config);
		callback.success(theme);
	}, callback.error]);
};

Webos.Theme.backgroundsDir = '/usr/share/images/backgrounds/';
Webos.Theme.iconsDir = '/usr/share/icons/themes/';
Webos.Theme.getAvailable = function(module, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'ThemeController',
		'method': 'getAvailable',
		'arguments': {
			'ui': W.UserInterface.current.name()
		}
	}).load(new Webos.Callback(function(response) {
		callback.success(response.getData());
	}, function(response) {
		callback.error(response);
	}));
};