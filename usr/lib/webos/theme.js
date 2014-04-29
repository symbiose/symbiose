(function () {

if (Webos.Theme) {
	return;
}

Webos.require('/usr/lib/webos/config.js', function () {
	/**
	 * A theme.
	 * @param {Webos.ConfigFile} configFile The config file associated with the theme.
	 * @constructor
	 * @augments Webos.Model
	 */
	Webos.Theme = function (configFile) {
		var data = configFile.data();
		
		var defaults = {
			desktop: '',
			icons: '',
			background: '',
			animations: 0
		};
		data = $.extend({}, defaults, data);
		
		if (typeof data.animations == 'string') {
			data.animations = parseInt(data.animations, 10) || 0;
		}
		
		Webos.Model.call(this, data);
		
		this._configFile = configFile;
	};
	/**
	 * The theme's prototype.
	 */
	Webos.Theme.prototype = {
		/**
		 * This theme's loaded stylesheets.
		 * @private
		 */
		_stylesheets: [],
		/**
		 * Load this theme.
		 * @param {Webos.Callback} callback The callback.
		 */
		load: function(callback) {
			callback = Webos.Callback.toCallback(callback);
			var that = this;
			
			return new W.ServerCall({
				'class': 'ThemeController',
				'method': 'loadCss',
				'arguments': {
					'theme': that.get('desktop'),
					'ui': Webos.UserInterface.Booter.current().name()
				}
			}).load([function(response) {
				var currentTheme = Webos.Theme.current();
				currentTheme.unload();

				that._setAnimations();
				var css = response.getData().css;
				for (var index in css) {
					that._stylesheets.push(Webos.Stylesheet.insertCss(css[index], '#'+W.UserInterface.Booter.current().element().attr('id')));
				}
				that._loadBackground();
				Webos.Theme._current = that;
				callback.success();
				that.trigger('load');
				Webos.Theme.trigger('load', { theme: that });
			}, callback.error]);
		},
		/**
		 * Unload this theme.
		 * This will remove added stylesheets.
		 */
		unload: function() {
			for (var i = 0; i < this._stylesheets.length; i++) {
				Webos.Stylesheet.removeCss(this._stylesheets[i]);
			}
		},
		/**
		 * Apply the theme's background on an element.
		 * @param {jQuery} el The element.
		 */
		applyBackgroundOn: function(el) {
			var $el = $(el);

			var bgImg = Webos.File.get(this.get('background')).get('realpath'),
				bgColor = this.get('backgroundColor'),
				bgRepeat = this.get('backgroundRepeat'),
				bgCover = (bgRepeat == 'no-repeat') ? true : false;

			if (this.get('hideBackground')) {
				$el.css('background', bgColor);
				return;
			}

			$el.css('background', 'url("'+bgImg+'") '+bgRepeat+' center center '+bgColor);

			if (bgCover) {
				$el
					.css('-webkit-background-size', 'cover')
					.css('-moz-background-size', 'cover')
					.css('-o-background-size', 'cover')
					.css('background-size', 'cover')
					.css('filter', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+bgImg+'\', sizingMethod=\'scale\')')
					.css('-ms-filter', '"progid:DXImageTransform.Microsoft.AlphaImageLoader(src=\''+bgImg+'\', sizingMethod=\'scale\')"');
			}
		},
		/**
		 * Load the theme's background.
		 * @param {Boolean} forceLoading By default, if the previous theme has the same background as this one, the background is not reloaded. If set to true, the background will be always reloaded.
		 * @private
		 */
		_loadBackground: function(forceLoading) {
			if (Webos.Theme._current && forceLoading !== true) {
				if (Webos.Theme._current.get('background') == this.get('background')) {
					return;
				}
			}

			this.applyBackgroundOn(Webos.UserInterface.Booter.current().element());
		},
		/**
		 * Apply this theme's animations preferences.
		 */
		_setAnimations: function() {
			$.fx.off = !this.get('animations');
		},
		/**
		 * Get this theme's background image.
		 * @return {String} The background image path.
		 */
		background: function() {
			var bg = this._get('background');
			if (!bg) {
				bg = Webos.Theme.defaultBackground();
			}
			return bg;
		},
		/**
		 * Get this theme's background color.
		 * @return {String} The background color.
		 */
		backgroundColor: function() {
			return this._get('backgroundColor') || 'black';
		},
		/**
		 * Get this theme's background reapeat value.
		 * @return {String} The background reapeat value.
		 */
		backgroundRepeat: function() {
			return this._get('backgroundRepeat') || 'no-repeat';
		},
		/**
		 * Check if this background image is hidden.
		 * @return {String} True if the background image is hidden, false otherwise.
		 */
		hideBackground: function() {
			return (this._get('hideBackground') ? true : false);
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
			var op = Webos.Operation.create();
			op.addCallbacks(callback);
			
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
			
			if (nbrChanges === 0) {
				op.setCompleted();
				return op;
			}
			
			this._configFile.sync([function() {
				for (var key in that._unsynced) {
					if (that._unsynced[key].state === 2) {
						that._data[key] = that._unsynced[key].value;
						delete that._unsynced[key];

						switch (key) {
							case 'background':
							case 'backgroundColor':
							case 'backgroundRepeat':
							case 'hideBackground':
								that._loadBackground(true);
								break;
							case 'animations':
								that._setAnimations();
								break;
						}
						
						that.notify('update', { key: key, value: that._data[key].value });
					}
				}

				op.setCompleted();
			}, function (resp) {
				op.setCompleted(resp);
			}]);

			return op;
		}
	};
	Webos.inherit(Webos.Theme, Webos.Model);

	Webos.Observable.build(Webos.Theme);


	Webos.Theme._current = null;
	Webos.Theme.current = function() {
		return Webos.Theme._current || new Webos.Theme(Webos.ConfigFile.get('~/.theme/'+Webos.UserInterface.Booter.current().name()+'/config.xml'));
	};
	Webos.Theme._defaultBackground = '/usr/share/images/backgrounds/default.jpg';
	Webos.Theme.defaultBackground = function() {
		return Webos.Theme._defaultBackground;
	};
	Webos.Theme.setDefaultBackground = function(bg) {
		Webos.Theme._defaultBackground = bg;
	};

	Webos.Theme.get = function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var ui = Webos.UserInterface.Booter.current().name();
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
				'ui': W.UserInterface.Booter.current().name()
			}
		}).load(new Webos.Callback(function(response) {
			callback.success(response.getData());
		}, function(response) {
			callback.error(response);
		}));
	};
});

})();