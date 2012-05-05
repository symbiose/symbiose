function STheme(desktop, icons, background, animations) {
	if (background == 'default') {
		background = STheme.defaultBackground;
	}
	
	this._data = {
		desktop: desktop,
		icons: icons,
		background: background,
		animations: (animations == true) ? true : false
	};
	
	this.desktop = function() {
		return this._data.desktop;
	};
	this.icons = function() {
		return this._data.icons;
	};
	this.background = function() {
		return this._data.background;
	};
	this.animations = function() {
		return this._data.animations;
	};
	
	var that = this;
	
	this.load = function() {
		new W.ServerCall({
			'class': 'ThemeController',
			'method': 'loadCss',
			'arguments': {
				'theme': that.desktop(),
				'ui': W.UserInterface.current.name()
			}
		}).load(new W.Callback(function(response) {
			$.fx.off = !that.animations();
			var cssFiles = response.getData().css;
			for (var index in cssFiles) {
				new W.Stylesheet(cssFiles[index], '#'+W.UserInterface.current.element.attr('id'));
			}
			that.loadBackground();
			STheme.current = that;
		}));
	};
	
	this.loadBackground = function() {
		W.UserInterface.current.element
			.css('background', 'url("'+this.background()+'") no-repeat center center fixed #27001f')
			.css('-webkit-background-size', 'cover')
			.css('-moz-background-size', 'cover')
			.css('-o-background-size', 'cover')
			.css('background-size', 'cover')
			.css('filter', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+this.background()+'\', sizingMethod=\'scale\')')
			.css('-ms-filter', '"progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+this.background()+'\', sizingMethod=\'scale\')"');
	};
	
	this.changeBackground = function(path, callback) {
		callback = W.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ThemeController',
			'method': 'change',
			'arguments': {
				'component': 'background',
				'value': path,
				'ui': W.UserInterface.current.name()
			}
		}).load(new W.Callback(function() {
			that._data.background = path;
			that.loadBackground();
			callback.success(path);
		}, function(response) {
			callback.error(response);
		}));
	};
	this.changeAnimations = function(value, callback) {
		callback = W.Callback.toCallback(callback);
		
		value = (value == true) ? 1 : 0;
		
		new W.ServerCall({
			'class': 'ThemeController',
			'method': 'change',
			'arguments': {
				'component': 'animations',
				'value': value,
				'ui': W.UserInterface.current.name()
			}
		}).load(new W.Callback(function() {
			that._data.animations = (value) ? true : false;
			$.fx.off = !that.animations();
			callback.success();
		}, function(response) {
			callback.error(response);
		}));
	};
	this.changeDesktop = function(theme, callback) {
		callback = W.Callback.toCallback(callback);
		
		new W.ServerCall({
			'class': 'ThemeController',
			'method': 'change',
			'arguments': {
				'component': 'desktop',
				'value': theme,
				'ui': W.UserInterface.current.name()
			}
		}).load(new W.Callback(function() {
			that._data.desktop = theme;
			callback.success();
		}, function(response) {
			callback.error(response);
		}));
	};
}

STheme.current = new STheme('ambiance', 'humanity', 'default', true);
STheme.backgroundsDir = '/usr/share/images/backgrounds/';
STheme.defaultBackground = 'usr/share/images/backgrounds/default.png';
STheme.getAvailable = function(callback) {
	callback = W.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'ThemeController',
		'method': 'getAvailable',
		'arguments': {
			'ui': W.UserInterface.current.name()
		}
	}).load(new W.Callback(function(response) {
		callback.success(response.getData());
	}, function(response) {
		callback.error(response);
	}));
};
STheme.getConfig = function(callback) {
	callback = W.Callback.toCallback(callback);
	
	new W.ServerCall({
		'class': 'ThemeController',
		'method': 'get',
		'arguments': {
			'ui': W.UserInterface.current.name()
		}
	}).load(new W.Callback(function(response) {
		var config = response.getData();
		var theme = new STheme(config.desktop, config.icons, config.background, config.animations);
		callback.success(theme);
	}, function(response) {
		callback.error(response);
	}));
};