/**
 * Widgets pour le gestion des fenetres.
 * @author Simon Ser <contact@simonser.fr.nf>
 * @version 1.2
 * @since 1.0beta2
 */

 (function($) {

/**
 * A window.
 * @namespace $.webos.window
 */
$.webos.widget('window', 'container', {
	_name: 'window',
	/**
	 * Options:
	 *  - _string_ **title** : the window's title
	 *  - _string|[Webos.Icon](Library_icon)_ **icon** : the window's icon
	 *  - _number_ **width** : the window's width
	 *  - _number_ **height** : teh window's height
	 *  - _boolean_ **closeable** : true if the window cannot be closed by the user
	 *  - _boolean_ **maximizable** : true if the window cannot be maximizedby the user
	 *  - _boolean_ **hideable** : true if the window cannot be hidden by the user
	 *  - _boolean_ **maximized** : true if the window is maximized when opened
	 *  - _boolean_ **dialog** : true if the window is a dialog window
	 *  - _jQuery_ **parentWindow** : the parent window
	 *  - **workspace** : the window's workspace
	 *  - _string_ **stylesheet** : the window's stylesheet
	 */
	options: {
		title: 'Fen&ecirc;tre',
		icon: undefined,
		resizable: true,
		closeable: true,
		maximizable: true,
		hideable: true,
		opened: false,
		maximized: false,
		parentWindow: $(),
		childWindow: $(),
		dialog: false,
		badge: 0
	},
	_create: function() {
		this._super('_create');

		var that = this;
		
		this.options.states = {};
		for (var i = 0; i < $.webos.window.states.length; i++) {
			this.options.states[$.webos.window.states[i][0]] = false;			
		}
		
		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0) {
			this.options.parentWindow.window('option', 'childWindow', this.element);
		}
		
		this._setOption('icon', this.options.icon);
		
		if (this.options.resizable == false) {
			this.options.maximizable = false;
		}
		
		if (typeof this.options.stylesheet != 'undefined') {
			this.stylesheet(this.options.stylesheet);
		}

		var windowChildren = this.element.children();

		var windowTitleEl = windowChildren.filter('h1');
		if (windowTitleEl.length) {
			this.options.title = windowTitleEl.text();
			windowTitleEl.remove();
		}

		var windowHeaderContents = $(),
			windowHeaderEl = windowChildren.filter('header'),
			windowStyleEls = windowChildren.filter('style');
		if (windowHeaderEl.length) {
			windowHeaderContents = windowHeaderEl.children().detach();
			windowTitleEl.remove();
		}
		if (windowStyleEls) {
			windowStyleEls.detach();
		}

		var windowContents = this.element.contents().detach();

		this.element
			.empty()
			.css('position', 'absolute')
			.mousedown(function() {
				that.toForeground();
			})
			.focus(function(event) {
				that._focus = $(event.target);
			})
			.hide();
		
		this.options._components.header = $('<div></div>', { 'class': 'header' }).appendTo(this.element);
		
		var headerTop = $('<div></div>')
			.addClass('top')
			.dblclick(function() {
				that.minimizeOrMaximize();
			})
			.appendTo(this.options._components.header);
		
		this.options._components.controllers = {};
		var controllers = $('<div></div>', { 'class': 'controllers' }).appendTo(headerTop);
		
		this.options._components.controllers.close = $('<span></span>', {
			'class': 'close'
		})
			.click(function() {
				that.close();
			})
			.appendTo(controllers);
		
		this.options._components.controllers.hide = $('<span></span>', {
			'class': 'hide'
		})
			.click(function() {
				that.hide();
			})
			.appendTo(controllers);
		
		this.options._components.controllers.maximize = $('<span></span>', {
			'class': 'maximize'
		})
			.click(function() {
				that.minimizeOrMaximize();
			})
			.appendTo(controllers);
		
		if(this.options.closeable == false) {
			this.closeable(false);
		}
		
		if(this.options.hideable == false) {
			this.hideable(false);
		}
		
		if(this.options.maximizable == false) {
			this.maximizable(false);
		}
		
		this.options._components.title = $('<div></div>', {
			'class': 'title'
		})
			.mousedown(function(e) {
				e.preventDefault();
			})
			.appendTo(headerTop);
		
		this.options._components.specificHeader = $('<div></div>', { 'class': 'header-specific' }).appendTo(this.options._components.header);

		if (windowHeaderContents.length) {
			windowHeaderContents.appendTo(this.header());
		}
		if (windowStyleEls.length) {
			windowStyleEls.prependTo(this.element);
		}
		
		this.options._content = $('<div></div>', {
			'class': 'content'
		})
			.html(windowContents)
			.appendTo(this.element);
		
		this.option('title', this.options.title);

		if (this.options.width != undefined) {
			this.setWidth(this.options.width);
		}
		if (this.options.height != undefined) {
			this.setHeight(this.options.height);
		}

		if (this.options.left) {
			this.option('left', this.options.left);
		}
		if (this.options.top) {
			this.option('top', this.options.top);
		}

		if (typeof this.options.workspace == 'undefined' && $.w.window.workspace) {
			this.options.workspace = $.w.window.workspace.getCurrent();
		}

		this.dialog(this.options.dialog);
		
		this.draggable(true);
		
		this.option('resizable', (typeof this.options.resizable == 'undefined') ? true : this.options.resizable);
	},
	_update: function(key, value) {
		switch(key) {
			case 'icon':
				if (/^(https?)?\:\/\//.test(value)) {
					this.options.icon = { realpath: function() { return value; } };
				} else {
					this.options.icon = W.Icon.toIcon(value);
				}
				break;
			case 'title':
				this.options._components.title.html(value);
				this._trigger('changetitle', { type: 'changetitle' }, { title: value });
				break;
			case 'resizable':
				this.resizable(value);
				break;
			case 'stylesheet':
				this.stylesheet(value);
				break;
			case 'width':
				this.setWidth(value);
				break;
			case 'height':
				this.setHeight(value);
				break;
			case 'left':
				this.element.css('left', value);
				break;
			case 'top':
				this.element.css('top', value);
				break;
			case 'dialog':
				this.dialog(value);
				break;
			case 'badge':
				this._trigger('badge', parseInt(value) || 0);
				return;
		}
	},
	/**
	 * Destroy this window.
	 * @private
	 */
	destroy: function() {
		if (this.is('closed')) {
			this._super('destroy');
			this.element.empty().remove();
			return;
		}

		this._trigger('beforeclose', { type: 'beforeclose' }, { window: this.element });

		this._trigger('close', { type: 'close' }, { window: this.element });
		this.options.states.opened = false;

		if (typeof this.options.childWindow != 'undefined' && this.options.childWindow.length > 0) {
			this.options.childWindow.window('destroy');
		}

		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0) {
			this.options.parentWindow.window('option', 'childWindow', []);
		}

		this._super('destroy');

		this.element.empty().remove();

		if (typeof $.webos.window.getActive() != 'undefined') {
			$.webos.window.getActive().window('toForeground');
		}
	},
	/**
	 * Open this window.
	 */
	open: function() {
		var that = this;
		
		if (this.is('opened')) {
			return;
		}
		
		if (this._trigger('beforeopen', { type: 'beforeopen' }, { window: this.element }) === false) {
			return;
		}
		
		this.element.appendTo('#desktop');
		
		this._trigger('open', { type: 'open' }, { window: this.element });

		if (!$.w.window.workspace || this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
			this.element.css({
				opacity: 0,
				scale: 0.9,
				display: 'block'
			}).animate({
				opacity: 1,
				scale: 1
			}, 'fast', function() {
				that._trigger('afteropen', { type: 'afteropen' }, { window: that.element });
			});
		}
		
		if (this.options.maximized == true) {
			var maximizeOptions = {
				animate: false
			};

			if (this.options.maximizedDisplay) {
				maximizeOptions = $.extend({}, this.options.maximizedDisplay, maximizeOptions);
			}
			this.maximize(maximizeOptions);
		} else if (!this.options.top && !this.options.left) { //Si on ne fournit pas la position, on centre la fenetre
			this.center(); //On la centre si l'on a pas definit sa position
		}
		
		this._saveDimentions(); //On stocke en memoire ses dimentions
		this.options.states.opened = true;

		if (!$.w.window.workspace || this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
			this.toForeground(); //On met la fenetre en avant-plan
		} else {
			that._trigger('afteropen', { type: 'afteropen' }, { window: that.element });
		}
	},
	/**
	 * Close this window.
	 */
	close: function() {
		var that = this;
		
		if (this.is('closed')) {
			return;
		}
		
		if(this._trigger('beforeclose', { type: 'beforeclose' }, { window: this.element }) === false) {
			return;
		}
		
		this.element.addClass('closing');
		
		this.options.states.opened = false;
		this.options.states.foreground = false;
		this._trigger('close', { type: 'close' }, { window: this.element });
		
		if (typeof this.options.childWindow != 'undefined' && this.options.childWindow.length > 0) {
			this.options.childWindow.window('close');
			this.options.childWindow = [];
		}
		
		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0) {
			this.options.parentWindow.window('option', 'childWindow', []);
		}

		this.element.animate({
			opacity: 0,
			scale: 0.9
		}, 'fast', function() {
			that._trigger('afterclose', { type: 'afterclose' }, { window: that.element });
			$(this).removeClass('closing').detach();

			var activeWindow = $.webos.window.getActive();
			if (activeWindow && activeWindow.length) {
				activeWindow.window('toForeground');
			}
		});
	},
	/**
	 * Maximize this window.
	 */
	maximize: function() {
		if (this.is('maximized')) {
			return;
		}

		if (!this.options.maximizable) {
			return;
		}
		
		if (this.is('opened')) {
			this._saveDimentions();
		}
		
		var $desktop = $('#desktop');
		var maxHeight = $desktop.height();
		var maxWidth = $desktop.width();

		var options = {
			animate: true,
			mode: 'full',
			position: 'left'
		};
		if (typeof arguments[0] == 'object') {
			$.extend(options, arguments[0]);
		} else if (typeof arguments[0] != 'undefined') {
			options.animate = (arguments[0]) ? true : false;
		}
		
		var duration = 'fast';
		if (!options.animate) {
			duration = 0;
		}

		var finalCSS = {};
		if (options.mode == 'half') {
			if (options.position == 'right') {
				finalCSS = {
					width: maxWidth / 2,
					height: maxHeight,
					top: 0,
					left: maxWidth / 2
				};
			} else {
				finalCSS = {
					width: maxWidth / 2,
					height: maxHeight,
					top: 0,
					left: 0
				};
			}
		} else {
			finalCSS = {
				width: maxWidth,
				height: maxHeight,
				top: 0,
				left: 0
			};
		}

		this.options.maximizedDisplay = {
			mode: options.mode,
			position: options.position
		};
		this.options._maximizedPosition = {
			left: finalCSS.left,
			top: finalCSS.top
		};
		this.options._maximizedDimentions = {
			width: finalCSS.width,
			height: finalCSS.height
		};
		
		this.element.addClass('animating').animate(finalCSS, duration);
		
		var that = this;

		this.options._content.animate({
			width: finalCSS.width,
			height: (finalCSS.height - that.options._components.header.outerHeight(true))
		}, duration, function() {
			that.element
				.addClass('maximized')
				.removeClass('animating');
			
			that.options.states.maximized = true;
			that._trigger('maximize', { type: 'maximize' }, { window: that.element });
			that._trigger('resize', { type: 'resize' }, { window: that.element });
			that._trigger('move', { type: 'resize' });
		});

		if (this.options.resizable) {
			this.element.resizable('disable');
		}

		this.element.children('.title-window').css('cursor','auto');
	},
	/**
	 * Recalculate and apply maximized dimentions on this window.
	 * @param  {Boolean} animate True to animate, false otherwise.
	 * @private
	 */
	remaximize: function (animate) {
		if (!this.is('maximized')) {
			return;
		}

		if (!this.options.maximizable) {
			return;
		}

		var $desktop = $('#desktop');
		var maxHeight = $desktop.height();
		var maxWidth = $desktop.width();

		var options = {
			animate: (typeof animate == 'undefined' || animate) ? true : false,
			mode: 'full',
			position: 'left'
		};
		$.extend(options, this.options.maximizedDisplay);

		var duration = 'fast';
		if (!options.animate) {
			duration = 0;
		}

		var finalCSS = {};
		if (options.mode == 'half') {
			if (options.position == 'right') {
				finalCSS = {
					width: maxWidth / 2,
					height: maxHeight,
					top: 0,
					left: maxWidth / 2
				};
			} else {
				finalCSS = {
					width: maxWidth / 2,
					height: maxHeight,
					top: 0,
					left: 0
				};
			}
		} else {
			finalCSS = {
				width: maxWidth,
				height: maxHeight,
				top: 0,
				left: 0
			};
		}

		this.options._maximizedPosition = {
			left: finalCSS.left,
			top: finalCSS.top
		};
		this.options._maximizedDimentions = {
			width: finalCSS.width,
			height: finalCSS.height
		};

		this.element.addClass('animating').animate(finalCSS, duration);
		
		var that = this;

		this.options._content.animate({
			width: finalCSS.width,
			height: (finalCSS.height - that.options._components.header.outerHeight(true))
		}, duration, function() {
			that.element.removeClass('animating');

			that._trigger('resize', { type: 'resize' }, { window: that.element });
			that._trigger('move', { type: 'resize' });
		});
	},
	/**
	 * Minimize this window.
	 */
	minimize: function(animate) {
		if (this.is('minimized')) {
			return;
		}
		
		if (this.options.maximizable == true) {
			var dimentions = this.options._dimentions;
			var position = this.options._position;
			
			var that = this;

			var duration = 'fast';
			if (animate == false) {
				duration = 0;
			}
			
			this.options._content.animate({
				width: dimentions.width,
				height: (that.options._dimentions.height - that.options._components.header.height())
			}, duration);

			this.element.addClass('animating').animate({
				width: dimentions.width,
				height: dimentions.height,
				top: position.top,
				left: position.left
			}, duration, function() {
				that._saveDimentions();
				that.element
					.removeClass('animating')
					.removeClass('maximized');
				
				that._trigger('minimize', { type: 'minimize' }, { window: that.element });
				that.options.states.maximized = false;
				that._trigger('resize', { type: 'resize' }, { window: that.element });
				that._trigger('move', { type: 'resize' });
			});

			if (this.options.resizable) {
				this.element.resizable('enable');
			}
			
			this.element.children('.title-window').css('cursor','move');
		}
	},
	/**
	 * Maximize/minimize the window, depending on its current status.
	 */
	minimizeOrMaximize: function() {
		if (this.is('maximized')) {
			this.minimize();
		} else {
			this.maximize();
		}
	},
	/**
	 * Get this window's maximized display data.
	 *  - `mode`: the maximize mode (`full` or `half`)
	 *  - `position`: if `mode` is set to `half`, the position of the window (`right` or `left`)
	 * @return {Object}
	 */
	maximizedDisplay: function() {
		return this.options.maximizedDisplay;
	},
	/**
	 * Hide this window.
	 */
	hide: function() {
		if (this.is('hidden')) {
			return;
		}
		
		this._saveDimentions();
		
		var hidePos = $.webos.window.getHidePos(this.element);
		
		var that = this;
		
		this.element
			.addClass('hidden-window')
			.removeClass('bg-window')
			.animate({
				opacity: 0,
				width: 0,
				height: 0,
				top: hidePos.top,
				left: hidePos.left
			}, {
				duration: 'fast',
				complete: function() {
					$(this).css('display','none');
					that.toBackground();
					var activeWindow = $.webos.window.getActive();
					if (typeof activeWindow != 'undefined') {
						activeWindow.window('toForeground');
					}
					that._trigger('hide', { type: 'hide' }, { window: that.element });
					that.options.states.hidden = true;
				},
				queue: false
			});
		
		if (typeof this.options.childWindow != 'undefined' && this.options.childWindow.length > 0 && this.options.childWindow.is(':visible:not(:animated)')) {
			this.options.childWindow.window('hide');
		}
		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0 && this.options.parentWindow.is(':visible:not(:animated)')) {
			this.options.parentWindow.window('hide');
		}
	},
	/**
	 * Show this window.
	 */
	show: function() {
		if (this.is('visible')) {
			return;
		}
		
		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0 && this.options.parentWindow.is(':hidden:not(:animated)')) {
			this.options.parentWindow.window('show');
		}
		
		var pos, dim;
		if (this.is('maximized')) {
			pos = this.options._maximizedPosition;
			dim = this.options._maximizedDimentions;
		} else {
			pos = this.options._position;
			dim = this.options._dimentions;
		}
		
		var that = this;
		
		this.element
			.css('display','block')
			.removeClass('hidden-window')
			.animate({
				width: dim.width,
				height: dim.height,
				top: pos.top,
				left: pos.left,
				opacity: 1
			}, {
				duration: 'fast',
				complete: function() {
					that._trigger('show', { type: 'show' }, { window: that.element });
					that.options.states.hidden = false;
				},
				queue: false
			});

		this.toForeground();
		
		if (typeof this.options.childWindow != 'undefined' && typeof this.options.childWindow.length > 0 && this.options.childWindow.is(':hidden:not(:animated)')) {
			this.options.childWindow.window('show');
		}
	},
	/**
	 * Hide/show the window, depending on its current status.
	 */
	hideOrShow: function() {
		if (this.is('hidden')) {
			this.show();
		} else {
			this.hide();
		}
	},
	/**
	 * Send the window to foreground.
	 */
	toForeground: function() {
		$.webos.window.allToBackGroundExcluding(this.element);
		
		if (this.is('foreground')) {
			return;
		}
		
		this.element.css('z-index', $.webos.window.requestZIndex());
		this._restoreFocus();
		this.element.removeClass('bg-window');
		this._trigger('toforeground', { type: 'toforeground' }, { window: this.element });
		this.options.states.foreground = true;
		
		if (typeof this.options.childWindow != 'undefined' && this.options.childWindow.length > 0) {
			this.options.childWindow.window('toForeground');
		}
	},
	/**
	 * Send the window to background.
	 */
	toBackground: function() {
		if (this.is('background')) {
			return;
		}
		
		this.element.addClass('bg-window');
		this._trigger('tobackground', { type: 'tobackground' }, { window: this.element });
		this.options.states.foreground = false;
	},
	/**
	 * Hide/show/send to foreground the window, depending on its current status.
	 */
	hideOrShowOrToForeground: function() {
		if (this.is('visible')) {
			if (this.is('background')) {
				this.toForeground();
			} else {
				this.hide();
			}
		} else {
			this.show();
		}
	},
	/**
	 * Get current window's states.
	 * @return {Array}
	 */
	states: function() {
		return this.options.states;
	},
	/**
	 * Check if the window is in a given state.
	 * @param {String} state The state to check.
	 * @return {Boolean} True if the window is in the specified state, false otherwise.
	 */
	is: function(state) {
		if (typeof this.options.states[state] != 'undefined') {
			return this.options.states[state];
		} else {
			for (var i = 0; i < $.webos.window.states.length; i++) {
				if ($.webos.window.states[i][1] == state) {
					return !this.options.states[$.webos.window.states[i][0]];
				}
			}
		}
		
		return false;
	},
	/**
	 * Save this window's dimentions to an internal cache.
	 * These dimentions will be restored when minimizing this window.
	 * @private
	 */
	_saveDimentions: function() {
		if (this.is('maximized')) {
			if (!this.options._dimentions) {
				this.options._dimentions = {
					width: (this.options.width) ? this.options.width : 100,
					height: (this.options.height) ? this.options.height : 100
				};
			}
			if (!this.options._position) {
				this.options._position = {
					top: (this.options.top) ? this.options.top : ($('#desktop').height() - this.options._dimentions.height) / 2,
					left: (this.options.left) ? this.options.left : ($('#desktop').width() - this.options._dimentions.width) / 2
				};
			}
			return;
		}
		
		this.options._dimentions = {};
		this.options._dimentions.width = this.element.width();
		this.options._dimentions.height = this.element.height();
		this.options._position = this.element.position();
	},
	/**
	 * Get this window's cached dimentions.
	 * @return {Object} An object containing `width` and `height` properties.
	 */
	cachedDimentions: function() {
		return this.options._dimentions;
	},
	/**
	 * Get this window's dimentions.
	 * @return {Object} An object containing `width` and `height` properties.
	 */
	dimentions: function() {
		if (this.is('maximized')) {
			return this.options._maximizedDimentions;
		} else {
			return this.options._dimentions;
		}
	},
	/**
	 * Get this window's content's dimentions.
	 * @return {Object} An object containing `width` and `height` properties.
	 */
	contentDimentions: function() {
		var dim = $.extend({}, this.dimentions());
		dim.height -= this.options._components.header.outerHeight(true);
		return dim;
	},
	/**
	 * Get this window's content's cached dimentions.
	 * @return {Object} An object containing `width` and `height` properties.
	 */
	contentCachedDimentions: function() {
		var dim = $.extend({}, this.cachedDimentions());
		dim.height -= this.options._components.header.outerHeight(true);
		return dim;
	},
	/**
	 * Get this window's position.
	 * @return {Object} An object containing `top` and `left` properties.
	 */
	position: function() {
		if (this.is('maximized')) {
			return this.options._maximizedPosition;
		} else {
			return this.options._position;
		}
	},
	/**
	 * Restore focus to the element which previously had it.
	 * @private
	 */
	_restoreFocus: function() {
		if (typeof this.options._focus != 'undefined') {
			this.options._focus.focus();
		}
	},
	/**
	 * Get this window's header.
	 * @return {jQuery}
	 */
	header: function() {
		return this.options._components.specificHeader;
	},
	/**
	 * Move this window in the center of the screen.
	 */
	center: function() {
		var dimentions = {
			top: ($('#desktop').height() - this.element.outerHeight()) / 2,
			left: ($('#desktop').width() - this.element.outerWidth()) / 2
		};
		dimentions.top = (dimentions.top < 0) ? 0 : dimentions.top;
		dimentions.left = (dimentions.left < 0) ? 0 : dimentions.left;

		this.option({
			left: dimentions.left,
			top: dimentions.top
		});
	},
	/**
	 * Set this window's width.
	 * @param {Number} width The new width.
	 * @deprecated Use options instead.
	 */
	setWidth: function(width) {
		if (width == 0) {
			return;
		}

		this.element.width(width);
		this.options._content.width(this.element.innerWidth());
	},
	/**
	 * Set this window's height.
	 * @param {Number} height The new height.
	 * @deprecated Use options instead.
	 */
	setHeight: function(height) {
		if (height == 0) {
			return;
		}

		this.options._content.height(height);
	},
	/**
	 * Define if the window is loading or not.
	 * @param {Boolean} value True if teh window is loading, false otherwise.
	 * @param {Object} [opts] Options. Can contain `message` to set a loading message and `lock` to set if the window should be locked.
	 */
	loading: function(value, opts) {
		if (value) {
			var options = $.extend({
				message: 'Loading...',
				lock: true,
				progress: null
			}, opts);

			if (typeof options.progress == 'number') {
				if (options.progress > 100) {
					options.progress = 100;
				}
				if (options.progress < 0) {
					options.progress = 0;
				}
			} else {
				options.progress = null;
			}

			this.options.loading = options;
			
			if (options.lock) {
				if (!this.is('loading')) {
					var width = this.options._content.outerWidth(true);
					var height = this.options._content.outerHeight(true);
					this.options._content.hide();
					
					this.options._loadingContent = $('<div></div>', { 'class': 'content loading cursor-wait' })
						.width(width)
						.height(height)
						.css('min-height', '50px')
						.css('min-width', '50px')
						.insertAfter(this.options._content);
					
					var $messContainer = $('<div></div>', { 'class': 'message-container' }).appendTo(this.options._loadingContent);
					var $message = $('<div></div>', { 'class': 'message' }).appendTo($messContainer);
					
					if (this.options.resizable) {
						this.element.resizable('option', 'alsoResize', this.options._loadingContent);
					}
				}
				
				this.options._loadingContent.find('.message').html(options.message);
			} else {
				if (this.options._loadingContent) {
					this.options._loadingContent.remove();
					this.options._content.show();
				}
			}
			
			this._trigger('loadingstart');
			if (typeof options.progress == 'number') {
				this._trigger('progress', { type: 'progress' }, { value: options.progress });
			}
			this.options.states.loading = true;
		} else {
			if (this.is('ready')) {
				return;
			}
			
			if (this.options.loading.lock) {
				$(this.options._loadingContent).remove();
				delete this.options._loadingContent;
				this.options._content
					.show()
					.addClass('content');
				
				if (this.options.resizable) {
					this.element
						.css('width', 'auto')
						.css('height', 'auto')
						.resizable('option', 'alsoResize', this.options._content);
				}
			}

			this.options.states.loading = false;
			this._trigger('loadingstop');
			if (typeof this.options.loading.progress == 'number') {
				this.options.loading.progress = 100;
				this._trigger('progress', { type: 'progress' }, { value: 100 });
			}
		}
	},
	/**
	 * Add an overlay on all iframes in this window.
	 * Usefull when dragging when window, because mouse events over an iframe cannot be captured by thge parent document.
	 * @private
	 */
	_protectIframes: function(value) {
		if (value || typeof value == 'undefined') {
			//Add an overlay over iframes
			var iframesOverlays = $();
			this.element.find('iframe').each(function() {
				var pos = $(this).position();

				iframesOverlays = iframesOverlays.add($('<div></div>').css({
					position: 'absolute',
					top: pos.top,
					left: pos.left,
					width: $(this).outerWidth(),
					height: $(this).outerHeight()
				}).insertAfter(this));
			});

			this.options._components.iframesOverlays = iframesOverlays;
		} else if (this.options._components.iframesOverlays) {
			this.options._components.iframesOverlays.remove();

			this.options._components.iframesOverlays = null;
		}
	},
	/**
	 * Set this window resizable or not.
	 * @deprecated Use options instead.
	 */
	resizable: function(value) {
		this.options.resizable = (value) ? true : false;
		if (!this.options.resizable && this.options.maximizable) {
			this.maximizable(false);
		}
		
		if (this.options.resizable) {
			var that = this;
			
			this.element.resizable({
				alsoResize: this.options._content,
				minWidth: 200,
				minHeight: 150,
				handles: 'all',
				start: function() {
					that.element.addClass('resizing');
					that._protectIframes();
				},
				stop: function() {
					that._saveDimentions();
					that.element.removeClass('resizing');
					that._protectIframes(false);

					var contentDim = that.contentCachedDimentions();
					that.options._content.css(contentDim);

					that._trigger('resize', { type: 'resize' }, { window: that.element });
				}
			});
		} else if (this.element.is(':ui-resizable')) {
			this.element.resizable('destroy');
		}
	},
	/**
	 * Make this window draggable.
	 * @private
	 * @deprecated All windows are draggable.
	 */
	draggable: function() {
		var that = this;
		
		this.options._components.header.bind('mousedown.window.widget.webos', function(e) {
			if ($(e.target).add($(e.target).parents()).is('.controllers *, .header-specific * *')) {
				return;
			}

			//Add an overlay over iframes
			that._protectIframes();
			
			var el = that.element[0];
			var posX = that.element.position().left,
			posY = that.element.position().top,
			diffX = e.pageX - posX,
			diffY = e.pageY - posY;
			var desktopPosX = $('#desktop').position().left,
				desktopPosY = $('#desktop').position().top,
				desktopWidth = $('#desktop').outerWidth();

			var maximizeHelperShown = false,
			maximizeHelperMode = null,
			maximizeHelperPos = null,
			$maximizeHelper = $(); 
			var showMaximizeHelper = function(mode, position) {
				if (maximizeHelperShown) { return; }
				if (!that.options.maximizable) { return; }

				mode = mode || 'full';
				position = position || 'left';
				
				maximizeHelperMode = mode;
				maximizeHelperPos = position;

				var baseCSS = {}, animateCSS = {};
				if (mode == 'half') {
					if (position == 'right') {
						baseCSS = {
							top: '12.5%',
							right: 0,
							width: '37.5%',
							height: '75%'
						};
						animateCSS = {
							width: '50%',
							height: '100%',
							top: 0
						};
					} else {
						baseCSS = {
							top: '12.5%',
							left: 0,
							width: '37.5%',
							height: '75%'
						};
						animateCSS = {
							width: '50%',
							height: '100%',
							top: 0
						};
					}
				} else {
					baseCSS = {
						top: 0,
						left: '12.5%',
						width: '75%',
						height: '75%'
					};
					animateCSS = {
						width: '100%',
						height: '100%',
						left: 0
					};
				}

				$.extend(baseCSS, {
					position: 'absolute',
					opacity: 0,
					'z-index': that.element.css('z-index')
				});
				$.extend(animateCSS, {
					opacity: 1
				});

				$maximizeHelper = $('<div></div>')
					.addClass('webos-window-manip-helper')
					.css(baseCSS)
					.insertBefore(that.element)
					.animate(animateCSS);

				maximizeHelperShown = true;
			};
			var hideMaximizeHelper = function() {
				if (!maximizeHelperShown) { return; }
				if (!that.options.maximizable) { return; }

				$maximizeHelper.stop().fadeOut('normal', function() {
					$(this).remove();
				});
				$maximizeHelper = $();
				maximizeHelperShown = false;
			};

			if (that.is('maximized')) {
				var ratioX = diffX / that.element.outerWidth(true);
				$('body').one('mousemove.maximized.window.widget.webos', function(e) {
					that.minimize(false);
					posX = e.pageX - ratioX * that.element.outerWidth(true);
					posY = e.pageY - diffY;
					that.element.css({
						left: posX,
						top: posY
					});
					diffX = e.pageX - posX;
					diffY = e.pageY - posY;
				}).one('mouseup', function() {
					$('body').unbind('mousemove.maximized.window.widget.webos');
				});
			}
			
			$('body').bind('mousemove.window.widget.webos', function(e) {
				posX = e.pageX - diffX, posY = e.pageY - diffY;
				
				if (posY < 0) { posY = 0; }
				
				el.style.left = posX+'px';
				el.style.top = posY+'px';

				if (e.pageY - desktopPosY <= 0) {
					showMaximizeHelper();
				} else if (e.pageX - desktopPosX <= 0) {
					showMaximizeHelper('half');
				} else if (e.pageX - desktopPosX - desktopWidth + 1 >= 0) {
					showMaximizeHelper('half', 'right');
				} else {
					hideMaximizeHelper();
				}
				
				e.preventDefault();
			}).one('mouseup', function(e) {
				$(this).unbind('mousemove.window.widget.webos');
				
				var desktopPos = $('#desktop').offset(),
					desktopPosX = desktopPos.left,
					desktopPosY = desktopPos.top;
				if (posX + that.element.width() < desktopPosX) {
					that.element.css('left', 0);
				}
				if (posX > desktopPosX + $('#desktop').outerWidth()) {
					that.element.css('left', $('#desktop').width() - that.element.width());
				}
				if (posY > desktopPosY + $('#desktop').outerHeight()) {
					var topPos = $('#desktop').height() - that.element.outerHeight();
					if (topPos < 0) {
						topPos = 0;
					}
					that.element.css('top', topPos);
				}
				
				that.element.removeClass('dragging cursor-move');

				that._protectIframes(false);
				
				that._saveDimentions();

				if (maximizeHelperShown) {
					that.maximize({ mode: maximizeHelperMode, position: maximizeHelperPos });
					hideMaximizeHelper();
				}

				that.option({
					left: posX,
					top: posY
				});
				that._trigger('move');
				
				e.preventDefault();
			});
			
			that.element.addClass('dragging cursor-move');
			
			e.preventDefault();
		});
	},
	/**
	 * Get/set this window's workspace.
	 * @param {Number} [workspace] If specified, the new workspace id.
	 * @return {Number} The current workspace id.
	 */
	workspace: function(workspace) {
		if (typeof workspace != 'undefined') {
			this.options.workspace = workspace;
		} else {
			return this.options.workspace;
		}
	},
	/**
	 * Check/set if the window can be closed.
	 * @deprecated Use options instead.
	 */
	closeable: function(value) {
		if (typeof value == 'undefined') {
			return this.options.closeable;
		} else {
			this.options.closeable = (value) ? true : false;
			if (this.options.closeable) {
				this.element.removeClass('not-closeable');
			} else {
				this.element.addClass('not-closeable');
			}
		}
	},
	/**
	 * Check/set if the window can be hidden.
	 * @deprecated Use options instead.
	 */
	hideable: function(value) {
		if (typeof value == 'undefined') {
			return this.options.hideable;
		} else {
			this.options.hideable = (value) ? true : false;
			if (this.options.hideable) {
				this.element.removeClass('not-hideable');
			} else {
				this.element.addClass('not-hideable');
			}
		}
	},
	/**
	 * Check/set if the window can be maximized.
	 * @deprecated Use options instead.
	 */
	maximizable: function(value) {
		if (typeof value == 'undefined') {
			return this.options.maximizable;
		} else {
			this.options.maximizable = (value) ? true : false;
			if (this.options.maximizable) {
				this.element.removeClass('not-maximizable');
			} else {
				this.element.addClass('not-maximizable');
			}
		}
	},
	/**
	 * Get/set this window's stylesheet.
	 * @deprecated Use options instead.
	 */
	stylesheet: function(stylesheet) {
		if (typeof stylesheet == 'undefined') {
			return this.options.stylesheet;
		} else {
			var that = this;

			Webos.require({
				path: stylesheet,
				styleContainer: this.element,
				forceExec: true
			}, function() {
				that._trigger('stylesheetload', { type: 'stylesheetload' }, { window: that.element });
			});
		}
	},
	/**
	 * Check/set if the window is a dialog.
	 * @deprecated Use options instead.
	 */
	dialog: function(value) {
		if (typeof value == 'undefined') {
			return this.element.is('.dialog');
		} else {
			this.element.toggleClass('dialog', value);
		}
	}
});

/**
 * A window.
 * @param {Object} The window's options.
 * @constructor
 * @augments $.w.container
 */
$.webos.window = function(options) {
	return $('<div></div>').window(options);
};

/**
 * Windows' states.
 * @static
 * @private
 */
$.webos.window.states = [
	['opened', 'closed'],
	['foreground', 'background'],
	['hidden', 'visible'],
	['maximized', 'minimized'],
	['loading', 'ready']
];

/**
 * A main window.
 * @param {Object} [opts] The window's options.
 * @constructor
 * @augments $.w.window
 */
$.webos.subwidget('window', 'main', function(args, $mainWindow) {
	var options = args[0];
	$mainWindow.window('option', options);

	$mainWindow.one('windowafterclose', function() {
		if (typeof $(this).window('pid') == 'number') {
			var process = Webos.Process.get($(this).window('pid'));
			if (process) {
				process.stop();
			}
		}
	});

	if (typeof $mainWindow.window('pid') == 'number') {
		var process = Webos.Process.get($mainWindow.window('pid'));

		process.on('stop', function () {
			if (!$mainWindow.window('is', 'closed')) {
				$mainWindow.window('close');
			}
		});

		if (Webos.isInstanceOf(process, Webos.Cmd)) {
			var i = $.webos.window.main._list.push($mainWindow[0]) - 1;

			var savedSession = $.webos.window.main._cache[process.cmd];
			if (savedSession) {
				var options = {
					top: savedSession.position.top,
					left: savedSession.position.left,
					maximized: savedSession.states.maximized,
					maximizedDisplay: savedSession.maximizedDisplay
				};

				if (typeof savedSession.dimentions.width == 'number') {
					options.width = savedSession.dimentions.width;
				}
				if (typeof savedSession.dimentions.height == 'number') {
					options.height = savedSession.dimentions.height;
				}

				if (typeof savedSession.workspace == 'number' && $.w.window.workspace) {
					var workspace = $.w.window.workspace.get(savedSession.workspace);
					if (workspace) {
						options.workspace = workspace;
					}
				}

				$mainWindow.window('option', options);
			}

			$mainWindow.bind('windowbeforeclose', function() {
				$.webos.window.main._cache[process.cmd] = $.webos.window.main._getWindowDisplay($mainWindow);
			});
		}
	}

	return $mainWindow;
});

/**
 * A list of all main windows.
 * @private
 */
$.webos.window.main._list = [];
/**
 * A cache for this session.
 * Contains windows positions, dimentions and workspaces.
 * @private
 */
$.webos.window.main._cache = {};

/**
 * Helper function to get a window's position, dimentions and workspace.
 * @private
 */
$.webos.window.main._getWindowDisplay = function($mainWindow) {
	var display = {
		position: $mainWindow.window('position'),
		dimentions: {},
		states: $mainWindow.window('states'),
		workspace: ($mainWindow.window('option', 'workspace')) ? $mainWindow.window('option', 'workspace').id() : undefined
	};

	if ($mainWindow.window('option', 'resizable')) {
		display.dimentions = $mainWindow.window('contentCachedDimentions');
	}
	if ($mainWindow.window('option', 'maximizable')) {
		display.maximizedDisplay = ($mainWindow.window('is', 'maximized')) ? $mainWindow.window('maximizedDisplay') : null;
	}

	return display;
};
/**
 * Get the list of all main windows.
 * @return {jQuery}
 */
$.webos.window.main.list = function() {
	return $.webos.widget.filter($($.webos.window.main._list), 'window');
};
/**
 * Get/set the current session state.
 * @param {Object} [display] The session state to restore.
 * @return {Object} The current session state.
 */
$.webos.window.main.windowsDisplay = function(display) {
	if (typeof display == 'undefined') {
		var display = $.extend({}, $.webos.window.main._cache),
		$mainWindows = $.webos.window.main.list();

		$mainWindows.each(function() {
			var $mainWindow = $(this);

			if ($mainWindow.length && $.webos.widget.is($mainWindow, 'window') && $mainWindow.window('is', 'opened') && typeof $mainWindow.window('pid') == 'number') {
				var process = Webos.Process.get($mainWindow.window('pid'));
				if (Webos.isInstanceOf(process, Webos.Cmd)) {
					display[process.cmd] = $.webos.window.main._getWindowDisplay($mainWindow);
				}
			}
		});

		return display;
	} else {
		$.webos.window.main._cache = display;
	}
};

/**
 * An about window.
 * @param {Object} [opts] Options:
 *  - `name`: the software name
 *  - `version`: the software version number
 *  - `description`: the software description
 *  - `author`: the software author
 *  - _jQuery_ `parentWindow`: this window'sparent window
 * @constructor
 * @augments $.w.window
 */
$.webos.window.about = function(opts) {
	//Options par defaut
	var defaults = {
		parentWindow: $.webos.window.getActive(),
		name: 'Programme',
		version: '',
		description: '',
		author: 'la communaut&eacute;'
	};
	
	//On complete les options fournies
	var options = $.extend(defaults, opts);
	
	var aboutWindow = $.webos.window({
		parentWindow: options.parentWindow,
		title: '&Agrave; propos de '+options.name,
		icon: options.icon,
		resizable: false,
		hideable: false,
		width: 400,
		stylesheet: '/usr/share/css/gnome/aboutwindow.css'
	});
	
	var windowContent = aboutWindow.window('content');
	
	if (typeof options.icon != 'undefined') {
		$('<img />', { 'class': 'icon' })
			.attr('src', W.Icon.toIcon(options.icon).realpath(64))
			.appendTo(windowContent);
	}
	
	$('<h2></h2>')
		.html(options.name+' '+options.version)
		.appendTo(windowContent);
	
	$.webos.label(options.description).appendTo(windowContent);
	
	$.webos.label('D&eacute;velopp&eacute; par '+options.author)
		.addClass('detail')
		.appendTo(windowContent);
	
	if (typeof options.website != 'undefined') {
		$('<a></a>', { href: options.website })
			.html('Site Web de '+options.name)
			.appendTo(windowContent);
	}
	
	var buttons = $.webos.buttonContainer().appendTo(windowContent);
	
	$.webos.button('Fermer')
		.click(function() {
			aboutWindow.window('close');
		})
		.appendTo(buttons);
	
	return aboutWindow;
};

/**
 * A dialog window.
 * @param {Object} [opts] The window's options.
 * @constructor
 * @augments $.w.window
 */
$.webos.window.dialog = function(opts) {
	var dialog = $.webos.window($.extend({
		resizable: false
	}, opts));

	dialog.window('dialog', true);

	return dialog;
};

/**
 * A confirm dialog.
 * @param {Object} [opts] Options. Can contain:
 *  - `title`: the dialog title
 *  - `label`: the dialog message
 *  - `details`: more details
 *  - _Function_ `cancel`: a callback which will be called if the user cancels the operation
 *  - _Function_ `confirm`: a callback which will be called if the user confirms the operation
 *  - `cancelLabel`: the cancel button value
 *  - `confirmLabel`: the confirm button value
 * @constructor
 * @augments $.w.window
 */
$.webos.window.confirm = function(opts) {
	var defaults = {
		title: 'Confirmation',
		label: '&Ecirc;tes-vous s&ucirc;r de vouloir effectuer cette action ?',
		details: '',
		cancel: function() {},
		confirm: function() {},
		cancelLabel: 'Annuler',
		confirmLabel: 'Valider'
	};
	
	var options = $.extend(defaults, opts);
	
	var confirm = $.webos.window.dialog({
		title: options.title,
		icon: 'actions/help',
		parentWindow: options.parentWindow,
		resizable: false,
		hideable: false,
		width: 450
	});
	
	var form = $.w.entryContainer().appendTo(confirm.window('content'));
	
	$.w.icon('actions/help').css('float', 'left').appendTo(form);
	$('<strong></strong>').html(options.label).appendTo(form);

	if (options.details) {
		$.w.label(options.details).appendTo(form);
	}
	
	var buttonContainer = $.w.buttonContainer().css('clear', 'both').appendTo(form);
	$.w.button(options.cancelLabel).click(function() {
		confirm.window('close');
		options.cancel();
	}).appendTo(buttonContainer);
	$.w.button(options.confirmLabel, true).appendTo(buttonContainer);
	
	form.submit(function() {
		confirm.window('close');
		options.confirm();
	});
	
	return confirm;
};

/**
 * A message dialog.
 * @param {Object} [opts] Options. Can contain:
 *  - `type`: the dialog type. Can be `information` (by default), `error` or `warning`.
 *  - `title`: the dialog title
 *  - `label`: the dialog message
 *  - `details`: more details
 *  - `closeLabel`: the close button value
 * @constructor
 * @augments $.w.window
 */
$.webos.window.messageDialog = function(opts) {
	if (!opts) {
		opts = {};
	}
	
	var defaults = {
		type: 'information',
		title: 'Message',
		label: '',
		details: '',
		closeLabel: 'Fermer'
	};
	
	switch (opts.type) {
		case 'information':
			defaults.title = 'Information';
			break;
		case 'error':
			defaults.title = 'Erreur';
			defaults.label = 'Une erreur est survenue.';
			break;
		case 'warning':
			defaults.title = 'Attention';
			break;
	}
	
	var options = $.extend(defaults, opts);
	
	var icon = new W.Icon('status/info');
	switch (options.type) {
		case 'information':
			icon = 'status/info';
			break;
		case 'error':
			icon = 'status/error';
			break;
		case 'warning':
			icon = 'status/warning';
			break;
	}
	
	var dialog = $.webos.window.dialog({
		title: options.title,
		icon: icon,
		parentWindow: options.parentWindow,
		resizable: false,
		hideable: false,
		width: 450
	});
	
	var contents = dialog.window('content');
	
	$.w.icon(icon).css('float', 'left').appendTo(contents);
	$('<strong></strong>').html(options.label).appendTo(contents);
	
	if (options.details) {
		$.w.label(options.details).appendTo(contents);
	}
	
	var buttonContainer = $.w.buttonContainer().css('clear', 'both').appendTo(contents);
	$.w.button(options.closeLabel).click(function() {
		dialog.window('close');
	}).appendTo(buttonContainer);

	return dialog;
};

/**
 * A color picker window.
 * @param {Function} [pick] The callback.
 * @param {Object} [opts] The color picker's options.
 * @constructor
 * @augments $.w.window
 * @see $.webos.colorPicker
 */
$.webos.window.colorPicker = function(pick, opts) {
	pick = pick || function () {console.log(arguments);};

	var $win = $.webos.window({
		title: 'Pick a color',
		resizable: false,
		dialog: true
	});

	var $ctn = $win.window('content');
	var $colorPicker = $.w.colorPicker().colorPicker('option', opts).appendTo($ctn);

	var $btns = $.w.buttonContainer().appendTo($ctn);
	$.w.button('Custom').click(function () {
		$colorPicker.colorPicker('toggleMode');

		var lbl = ($colorPicker.colorPicker('option', 'mode') == 'palette') ? 'Custom' : 'Palette';
		$(this).button('option', 'label', lbl);
	}).appendTo($btns);
	$.w.button('Cancel').click(function () {
		$win.window('close');
	}).appendTo($btns);
	$.w.button('Pick').click(function () {
		$win.window('close');

		if (typeof pick == 'function') {
			pick($colorPicker.colorPicker('option', 'value'));
		}
	}).appendTo($btns);

	return $win;
};

/**
 * A color picker button.
 * @param {Function} [pick] The callback.
 * @param {Object} [opts] The color picker's options.
 * @constructor
 * @augments $.webos.button
 * @see $.webos.window.colorPicker
 * @see $.webos.colorPicker
 */
$.webos.colorPickerBtn = function(pick, opts) {
	return $('<span></span>').colorPickerBtn({
		colorPicker: opts,
		pick: pick
	});
};
/**
 * A color picker button.
 */
$.webos.colorPickerBtn.prototype = {
	options: {
		pick: function () {},
		colorPicker: {}
	},
	_create: function () {
		var that = this;

		this._super('_create');

		this.element.empty();
		var $color = $('<span></span>').css({
			display: 'inline-block',
			width: 50,
			height: 16,
			marginTop: 3,
			backgroundColor: this.options.colorPicker.value || '#000'
		}).appendTo(this.element);

		this.element.click(function () {
			$.webos.window.colorPicker(function (color) {
				$color.css('background-color', color);

				if (typeof that.options.pick == 'function') {
					that.options.pick(color);
				}
			}, that.options.colorPicker).window('open');
		});
	}
};
$.webos.widget('colorPickerBtn', 'button');

/**
 * Z-index range used to arrange windows.
 * @private
 */
$.webos.window.zIndexRange = [1005, 5000];
/**
 * Current greatest z-index.
 * @private
 */
$.webos.window.currentZIndex = $.webos.window.zIndexRange[0];
/**
 * Request a new z-index for a window.
 * @private
 */
$.webos.window.requestZIndex = function() {
	var nextZIndex = $.webos.window.currentZIndex + 1;
	
	// Next z-index out of range
	// We need to update all z-indexes
	if (nextZIndex > $.webos.window.zIndexRange[1]) {
		var diff = nextZIndex - $.webos.window.zIndexRange[0];
		$.webos.window.getWindows().each(function() {
			var thisZIndex = parseInt($(this).css('z-index'));
			if (thisZIndex > $.webos.window.zIndexRange[0]) {
				$(this).css('z-index', thisZIndex - diff);
			}
		});
		nextZIndex -= diff;
	}
	
	$.webos.window.currentZIndex = nextZIndex;
	return nextZIndex;
};

/**
 * Hide all windows.
 */
$.webos.window.hideAll = function() {
	var $list = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	$list.each(function() {
		$(this).window('hide');
	});
};
/**
 * Show all windows.
 */
$.webos.window.showAll = function() {
	var $list = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	$list.each(function() {
		$(this).window('show');
	});
};
/**
 * Hide/show all windows.
 */
$.webos.window.hideOrShowAll = function() {
	var $list = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	$list.each(function() {
		$(this).window('hideOrShow');
	});
};
/**
 * Get the current active window.
 * @return {jQuery}
 */
$.webos.window.getActive = function() {
	var visibleWindows = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	if (visibleWindows.length > 0) {
		var activeWindow = $(), activeWindowZIndex = $.webos.window.zIndexRange[0];
		visibleWindows.each(function() {
			var thisWindowZIndex = parseInt($(this).css('z-index'));

			if ($(this).window('is', 'hidden')) {
				return;
			}

			if (activeWindow.length == 0 || activeWindowZIndex < thisWindowZIndex) {
				activeWindow = $(this);
				activeWindowZIndex = thisWindowZIndex;
			}
		});
		return activeWindow;
	} else {
		return $();
	}
};
/**
 * Send all windows to background.
 */
$.webos.window.allToBackground = function() {
	var $list = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	$list.each(function() {
		$(this).window('toBackground');
	});
};
/**
 * Send all windows to background excluding one window.
 * @param {jQuery} [excludedWindow] The excluded window.
 */
$.webos.window.allToBackGroundExcluding = function(excludedWindow) { //Envoyer ttes les fenetres a l'arriere-plan sauf la fenetre specifiee
	var $list = $(($.w.window.workspace) ? $.w.window.workspace.getCurrent().getWindows() : $.webos.window.getWindows());
	$list.each(function() {
		if ($(this).window('id') != $(excludedWindow).window('id')) {
			$(this).window('toBackground');
		}
	});
};
/**
 * Get all windows from all workspaces.
 * @return {jQuery}
 */
$.webos.window.getWindows = function() {
	return $('#desktop').children('.webos-window').not('.closing');
};
/**
 * Get a window by id.
 * @param {Number} id The window id.
 * @return {jQuery}
 */
$.webos.window.getWindowById = function(id) {
	var list = $.webos.window.getWindows();

	var $foundWindow = $();
	list.each(function() {
		if ($(this).window('option','id') == id) {
			$foundWindow = $(this);
			return false;
		}
	});

	return $foundWindow;
};
/**
 * Internal function to get a window's hidding position for animations.
 * @param {jQuery} hiddenWindow The window being hidden.
 * @return {Object} An object containing properties `top` and `left`.
 * @private
 */
$.webos.window._getHidePos = function() {
	return {
		top: 0,
		left: 0
	};
};
/**
 * Get a window's hidding position for animations.
 * @param {jQuery} thisWindow The window being hidden.
 * @return {Object} An object containing properties `top` and `left`.
 */
$.webos.window.getHidePos = function(thisWindow) {
	var hidePos = $.webos.window._getHidePos(thisWindow);
	return {
		top: (hidePos && hidePos.top > 0) ? hidePos.top : 0,
		left: (hidePos && hidePos.left > 0) ? hidePos.left : 0
	};
};
/**
 * Define a callback which will determine windows' hidding positions.
 * @param {Function} fn The callback. Must take the window as parameter and return an object containing properties `top` and `left`.
 * @see $.webos.window.getHidePos
 */
$.webos.window.setHidePosFn = function(fn) {
	$.webos.window._getHidePos = fn;
};

/**
 * Remaximize all windows.
 * @private
 */
var resizeWindows = function () {
	$.webos.window.getWindows().each(function () {
		if ($(this).window('is', 'maximized')) {
			$(this).window('remaximize', false);
		}
	});
};

// Remaximize all windows after resize
var timer = window.setTimeout(function() {}, 0);
$(window).on('resize', function() {
	window.clearTimeout(timer);
	timer = window.setTimeout(function() {
		resizeWindows();
	}, 500);
});

//WindowHeader
$.webos.widget('windowHeader', 'container', {
	_name: 'windowheader'
});


//MenuWindowHeader
$.webos.widget('menuWindowHeader', 'menu', {
	_name: 'menuwindowheader'
});
$.webos.menuWindowHeader = function(contents) {
	return $('<ul></ul>').html(contents || '').menuWindowHeader();
};

//WindowHeaderMenuItem
$.webos.widget('menuWindowHeaderItem', 'container', {
	_name: 'menuwindowheaderitem',
	options: {
		label: ''
	},
	_create: function() {
		this._super('_create');

		var that = this;
		
		this.options._components.label = $('<a></a>', { href: '#' }).html(this.options.label).appendTo(this.element);
		this.options._content = $('<ul></ul>').appendTo(this.element);
		this.element.bind('click mouseenter', function(e) {
			var $menu = that.element, $menuContents = that.content();
			
			if ($menu.is('hover')) {
				return;
			}
			
			if (e.type == 'mouseenter' && $menu.parents('ul.webos-menuwindowheader li').length == 0) {
				return;
			}
			
			if ($menuContents.children().length > 0) {
				$menuContents.show();
			} else if (e.type == 'click') {
				$menu.removeClass('hover');
				$menu.parents('ul.webos-menuwindowheader li ul li').hide();
				return;
			}
			
			$menu.addClass('hover');
			
			var onDocClickFn = function(e) {
				//Si on clique sur le menu
				if ($(e.target).parents().filter($menu).length > 0) {
					if ($(e.target).parents().filter('ul.webos-menuwindowheader li').first().children('ul').children().length > 0) {
						return;
					}
				}
				//Sinon, on clique sur autre chose que le menu
				
				//On cache le sous-menu
				$menuContents.hide();
				//On le deselectionne
				$menu.removeClass('hover');
				$(this).unbind('click', onDocClickFn);
			};
			$(document).click(onDocClickFn);
			
			//On n'execute pas l'action par defaut pour ne pas changer de page
			e.preventDefault();
		}).bind('mouseleave', function() {
			var $menu = that.element, $menuContents = that.content();
			
			if ($menu.parents('ul.webos-menuwindowheader li').length == 0) {
				return;
			}
			
			$menu.removeClass('hover');
			$menuContents.hide();
		});
	},
	_update: function(key, value) {
		switch (key) {
			case 'label':
				this.options._components.label.html(value);
				break;
		}
	}
});
$.webos.menuWindowHeaderItem = function(label) {
	return $('<li></li>').menuItem({
		label: label
	});
};

//ToolbarWindowHeader
$.webos.widget('toolbarWindowHeader', 'windowHeader', {
	_name: 'toolbarwindowheader'
});
$.webos.toolbarWindowHeader = function() {
	return $('<ul></ul>').toolbarWindowHeader();
};

//ToolbarWindowHeaderItem
$.webos.widget('toolbarWindowHeaderItem', 'container', {
	_name: 'toolbarwindowheaderitem',
	options: {
		active: false
	},
	_create: function() {
		this._super('_create');

		if (typeof this.options.label != 'undefined' && this.options.label != '') {
			this._setLabel(this.options.label);
		}
		
		if (typeof this.options.icon != 'undefined') {
			this._setIcon(this.options.icon);
		}
		
		this.active(this.options.active);
	},
	_setIcon: function(src) {
		if (/^(https?)?\:\/\//.test(src)) {
			var icon = { realpath: function() { return src; } };
		} else {
			var icon = W.Icon.toIcon(src);
		}

		if (typeof this.options._components.icon == 'undefined') {
			this.options._components.icon = $('<img />', { alt: '' }).prependTo(this.element);
		}
		this.options._components.icon.attr('src', icon.realpath(22));
	},
	_setLabel: function(text) {
		if (typeof this.options._components.label == 'undefined') {
			this.options._components.label = $('<span></span>').appendTo(this.element);
		}
		this.options._components.label.html(text);
	},
	active: function(value) {
		if (typeof value == 'undefined') {
			return this.options.active;
		} else {
			this.options.active = (value) ? true : false;
			if (this.options.active) {
				this.element.addClass('active');
			} else {
				this.element.removeClass('active');
			}
		}
	},
	_update: function(key, value) {
		switch(key) {
			case 'icon':
				this._setIcon(value);
				break;
			case 'label':
				this._setLabel(value);
				break;
			case 'active':
				this.active(value);
				break;
		}
	}
});
$.webos.toolbarWindowHeaderItem = function(label, icon) {
	return $('<li></li>').toolbarWindowHeaderItem({
		label: label,
		icon: icon
	});
};

//WindowHeaderSearch
$.webos.widget('windowHeaderSearch', 'searchEntry', {});
$.webos.windowHeaderSearch = function() {
	return $('<li></li>').windowHeaderSearch();
};

//ButtonWindowHeader
/**
 * @deprecated Will be moved as tabWindowHeader
 */
$.webos.widget('buttonWindowHeader', 'windowHeader', {
	_name: 'buttonwindowheader'
});
$.webos.buttonWindowHeader = function() {
	return $('<ul></ul>').buttonWindowHeader();
};

//ButtonWindowHeaderItem
$.webos.widget('buttonWindowHeaderItem', 'container', {
	_name: 'buttonwindowheaderitem',
	_create: function() {
		this._super('_create');

		if (typeof this.options.icon == 'undefined') {
			this.options.icon = '';
		}
		
		this.options._components.separator = $('<div></div>')
			.addClass('buttonwindowheaderseparator')
			.appendTo(this.element);
		this.options._components.icon = $('<img />', { alt: '' })
			.attr('src', this.options.icon)
			.appendTo(this.element);
		this.element.append('<br />');
		this.options._content = $('<span></span>')
			.html(this.options.label)
			.appendTo(this.element);
		
		var that = this;
		
		this.element.click(function() {
			that.select();
		});
	},
	icon: function() {
		return this.options._components.icon;
	},
	select: function() {
		if (!this.element.is('.active')) {
			this.element.parent('ul').children('li.active').removeClass('active').trigger('unselect');
			this.element.addClass('active').trigger('update').trigger('select');
			this._trigger('select');
		}
	}
});
$.webos.buttonWindowHeaderItem = function(label, icon) {
	return $('<li></li>').buttonWindowHeaderItem({
		label: label,
		icon: icon
	});
};

//windowHeaderItem
$.webos.widget('windowHeaderItem', 'container', {
	_name: 'windowheaderitem'
});
$.webos.windowHeaderItem = function() {
	var contents = [];
	for (var i = 0; i < arguments.length; i++) {
		contents.push(arguments[i]);
	}

	return $('<li></li>').windowHeaderItem().html(contents);
};

})(jQuery);
