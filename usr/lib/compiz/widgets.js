/**
 * Widgets pour le gestion des fenetres.
 * @author Simon Ser <contact@simonser.fr.nf>
 * @version 1.2
 * @since 1.0beta2
 */

 (function($) {

//Window
$.webos.widget('window', 'container', {
	_name: 'window',
	options: {
		title: 'Fen&ecirc;tre',
		icon: undefined,
		closeable: true,
		maximizable: true,
		hideable: true,
		opened: false,
		parentWindow: $(),
		childWindow: $(),
		dialog: false
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
		
		var windowContents = this.element.html();
		
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
		
		var headerTop = $('<div></div>').addClass('top').appendTo(this.options._components.header);
		
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
			.dblclick(function() {
				that.minimizeOrMaximize();
			})
			.appendTo(headerTop);
		
		this.options._components.specificHeader = $('<div></div>', { 'class': 'header-specific' }).appendTo(this.options._components.header);
		
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
		
		if (this.options.top) {
			this.element.css('top', this.options.top);
		}
		if (this.options.left) {
			this.element.css('left', this.options.left);
		}
		
		if (typeof this.options.workspace == 'undefined') {
			this.options.workspace = $.w.window.workspace.getCurrent();
		}

		this.dialog(this.options.dialog);
		
		this.draggable(true);
		
		this._setOption('resizable', (typeof this.options.resizable == 'undefined') ? true : this.options.resizable);
	},
	_update: function(key, value) {
		switch(key) {
			case 'icon':
				this.options.icon = W.Icon.toIcon(value);
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
		}
	},
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

		if (this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
			this.element.fadeIn('fast', function() {
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

		if (this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
			this.toForeground(); //On met la fenetre en avant-plan
		} else {
			that._trigger('afteropen', { type: 'afteropen' }, { window: that.element });
		}
	},
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
		this._trigger('close', { type: 'close' }, { window: this.element });
		
		if (typeof this.options.childWindow != 'undefined' && this.options.childWindow.length > 0) {
			this.options.childWindow.window('close');
			this.options.childWindow = [];
		}
		
		if (typeof this.options.parentWindow != 'undefined' && this.options.parentWindow.length > 0) {
			this.options.parentWindow.window('option', 'childWindow', []);
		}

		this.element.fadeOut('fast', function() {
			that._trigger('afterclose', { type: 'afterclose' }, { window: that.element });
			$(this).removeClass('closing').detach();

			var activeWindow = $.webos.window.getActive();
			if (activeWindow && activeWindow.length) {
				activeWindow.window('toForeground');
			}
		});
	},
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
		
		var maxHeight = $('#desktop').height();
		var maxWidth = $('#desktop').width();

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
		
		this.element.animate(finalCSS, duration);
		
		var that = this;
		
		this.options._content.addClass('animating').animate({
			width: finalCSS.width,
			height: (finalCSS.height - that.options._components.header.outerHeight(true))
		}, duration, function() {
			that.element
				.addClass('maximized')
				.removeClass('animating');
			
			that.options.states.maximized = true;
			that._trigger('maximize', { type: 'maximize' }, { window: that.element });
			that._trigger('resize', { type: 'resize' }, { window: that.element });
		});

		if (this.options.resizable) {
			this.element.resizable('disable');
		}

		this.element.children('.title-window').css('cursor','auto');
	},
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
			});

			if (this.options.resizable) {
				this.element.resizable('enable');
			}
			
			this.element.children('.title-window').css('cursor','move');
		}
	},
	minimizeOrMaximize: function() {
		if (this.is('maximized')) {
			this.minimize();
		} else {
			this.maximize();
		}
	},
	maximizedDisplay: function() {
		return this.options.maximizedDisplay;
	},
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
	hideOrShow: function() {
		if (this.is('hidden')) {
			this.show();
		} else {
			this.hide();
		}
	},
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
	toBackground: function() {
		if (this.is('background')) {
			return;
		}
		
		this.element.addClass('bg-window');
		this._trigger('tobackground', { type: 'tobackground' }, { window: this.element });
		this.options.states.foreground = false;
	},
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
	states: function() {
		return this.options.states;
	},
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
	cachedDimentions: function() {
		return this.options._dimentions;
	},
	dimentions: function() {
		if (this.is('maximized')) {
			return this.options._maximizedDimentions;
		} else {
			return this.options._dimentions;
		}
	},
	contentDimentions: function() {
		var dim = this.dimentions();
		dim.height -= this.options._components.header.outerHeight(true);
		return dim;
	},
	contentCachedDimentions: function() {
		var dim = this.cachedDimentions();
		dim.height -= this.options._components.header.outerHeight(true);
		return dim;
	},
	position: function() {
		if (this.is('maximized')) {
			return this.options._maximizedPosition;
		} else {
			return this.options._position;
		}
	},
	_restoreFocus: function() {
		if (typeof this.options._focus != 'undefined') {
			this.options._focus.focus();
		}
	},
	header: function() {
		return this.options._components.specificHeader;
	},
	center: function() {
		var dimentions = {
			top: ($('#desktop').height() - this.element.outerHeight()) / 2,
			left: ($('#desktop').width() - this.element.outerWidth()) / 2
		};
		dimentions.top = (dimentions.top < 0) ? 0 : dimentions.top;
		dimentions.left = (dimentions.left < 0) ? 0 : dimentions.left;
		this.element.css('top', dimentions.top);
		this.element.css('left', dimentions.left);
	},
	setWidth: function(width) {
		if (width == 0) {
			return;
		}

		this.element.width(width);
		this.options._content.width(this.element.innerWidth());
	},
	setHeight: function(height) {
		if (height == 0) {
			return;
		}

		this.options._content.height(height);
	},
	loading: function(value, opts) {
		if (value) {
			var options = $.extend({
				message: 'Chargement...',
				lock: true
			}, opts);
			
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
			this.options.states.loading = true;
		} else {
			if (this.is('ready')) {
				return;
			}
			
			if (this.options.loading.lock) {
				this.options._loadingContent.remove();
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
			
			this._trigger('loadingstop');
			this.options.states.loading = false;
		}
	},
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
				},
				stop: function() {
					that._saveDimentions();
					that.element.removeClass('resizing');
					that._trigger('resize', { type: 'resize' }, { window: that.element });
				}
			});
		} else if (this.element.is(':ui-resizable')) {
			this.element.resizable('destroy');
		}
	},
	draggable: function() {
		var that = this;
		
		this.options._components.header.bind('mousedown.window.widget.webos', function(e) {
			if ($(e.target).is('.controllers, .header-specific ul *')) {
				return;
			}
			
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
				
				var desktopPosX = $('#desktop').offset().left, desktopPosY = $('#desktop').offset().top;
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
				
				that._saveDimentions();

				if (maximizeHelperShown) {
					that.maximize({ mode: maximizeHelperMode, position: maximizeHelperPos });
					hideMaximizeHelper();
				}
				
				e.preventDefault();
			});
			
			that.element.addClass('dragging cursor-move');
			
			e.preventDefault();
		});
	},
	workspace: function(workspace) {
		if (typeof workspace != 'undefined') {
			this.options.workspace = workspace;
		} else {
			return this.options.workspace;
		}
	},
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
	stylesheet: function(stylesheet) {
		if (typeof stylesheet == 'undefined') {
			return this.options.stylesheet;
		} else {
			new W.Stylesheet(stylesheet, this.selector());
		}
	},
	dialog: function(value) {
		if (typeof value == 'undefined') {
			return this.element.is('.dialog');
		} else {
			this.element.toggleClass('dialog', value);
		}
	}
});

$.webos.window = function(options) {
	return $('<div></div>').window(options);
};

$.webos.window.states = [
	['opened', 'closed'],
	['foreground', 'background'],
	['hidden', 'visible'],
	['maximized', 'minimized'],
	['loading', 'ready']
];

$.webos.window.main = function(options) {
	var $mainWindow = $.webos.window(options);

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
		if (Webos.isInstanceOf(process, Webos.Cmd)) {
			var i = $.webos.window.main._list.push($mainWindow[0]) - 1;

			var savedSession = $.webos.window.main._cache[process.cmd];
			if (savedSession) {
				$mainWindow.window('option', {
					top: savedSession.position.top,
					left: savedSession.position.left,
					width: savedSession.dimentions.width || undefined,
					height: savedSession.dimentions.height || undefined,
					maximized: savedSession.states.maximized,
					maximizedDisplay: savedSession.maximizedDisplay,
					workspace: $.w.window.workspace.get(savedSession.workspace) || undefined
				});
			}

			$mainWindow.bind('windowbeforeclose', function() {
				$.webos.window.main._cache[process.cmd] = $.webos.window.main._getWindowDisplay($mainWindow);
			});
		}
	}

	return $mainWindow;
};
$.webos.window.main._list = [];
$.webos.window.main._cache = {};

$.webos.window.main._getWindowDisplay = function($mainWindow) {
	var display = {
		position: $mainWindow.window('position'),
		dimentions: {},
		states: $mainWindow.window('states'),
		workspace: $mainWindow.window('workspace').id()
	};

	if ($mainWindow.window('option', 'resizable')) {
		display.dimentions = $mainWindow.window('contentCachedDimentions');
	}
	if ($mainWindow.window('option', 'maximizable')) {
		display.maximizedDisplay = ($mainWindow.window('is', 'maximized')) ? $mainWindow.window('maximizedDisplay') : null;
	}

	return display;
};
$.webos.window.main.list = function() {
	return $($.webos.window.main._list);
};
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
		stylesheet: 'usr/share/css/gnome/aboutwindow.css'
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

$.webos.window.dialog = function(opts) {
	var dialog = $.webos.window($.extend({
		resizable: false
	}, opts));

	dialog.window('dialog', true);

	return dialog;
};

$.webos.window.confirm = function(opts) {
	var defaults = {
		title: 'Confirmation',
		label: '&Ecirc;tes-vous s&ucirc;r de vouloir effectuer cette action ?',
		cancel: function() {},
		confirm: function() {},
		cancelLabel: 'Annuler',
		confirmLabel: 'Valider'
	};
	
	var options = $.extend(defaults, opts);
	
	var confirm = $.webos.window.dialog({
		title: options.title,
		icon: new W.Icon('actions/help'),
		parentWindow: options.parentWindow,
		resizable: false,
		hideable: false,
		width: 450
	});
	
	var form = $.w.entryContainer().appendTo(confirm.window('content'));
	
	$.w.image(new W.Icon('actions/help')).css('float', 'left').appendTo(form);
	$('<strong></strong>').html(options.label).appendTo(form);
	
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
			icon = new W.Icon('status/info');
			break;
		case 'error':
			icon = new W.Icon('status/error');
			break;
		case 'warning':
			icon = new W.Icon('status/warning');
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
	
	$.w.image(icon).css('float', 'left').appendTo(contents);
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

$.webos.window.zIndexRange = [1005, 5000];
$.webos.window.currentZIndex = $.webos.window.zIndexRange[0];
$.webos.window.requestZIndex = function() {
	var nextZIndex = $.webos.window.currentZIndex + 1;
	
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

$.webos.window.hideAll = function() { //Cacher toutes les fenetres
	var list = $.w.window.workspace.getCurrent().getWindows();
	for(var i = 0; i < list.length; i++) {
		list[i].window('hide');
	}
};
$.webos.window.showAll = function() { //Afficher toutes les fenetres
	var list = $.w.window.workspace.getCurrent().getWindows();
	for(var i = 0; i < list.length; i++) {
		list[i].window('show');
	}
};
$.webos.window.hideOrShowAll = function() { //Afficher ou cacher ttes les fenetres
	var list = $.w.window.workspace.getCurrent().getWindows();
	for(var i = 0; i < list.length; i++) {
		list[i].window('hideOrShow');
	}
};
$.webos.window.getActive = function() { //Recuperer la fenetre active
	var visibleWindows = $($.w.window.workspace.getCurrent().getWindows());
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
$.webos.window.allToBackground = function() { //Envoyer toutes les fenetres a l'arriere-plan
	var list = $.w.window.workspace.getCurrent().getWindows();
	for(var i = 0; i < list.length; i++) {
		list[i].window('toBackground');
	}
};
$.webos.window.allToBackGroundExcluding = function(excludedWindow) { //Envoyer ttes les fenetres a l'arriere-plan sauf la fenetre specifiee
	var list = $.w.window.workspace.getCurrent().getWindows();
	for(var i = 0; i < list.length; i++) {
		if (list[i].window('id') != excludedWindow.window('id')) {
			list[i].window('toBackground');
		}
	}
};
$.webos.window.setButtonsBorder = function() { //Definir le bord des boutons des fenetres
	$.webos.window.buttons.children('.window-button-last').removeClass('window-button-last');
	$.webos.window.buttons.children('.window-button:visible').last().addClass('window-button-last');
};
$.webos.window.getWindows = function() { //Recuperer TOUTES les fenetres (tous espaces de travail confondus)
	return $('#desktop').children('.webos-window').not('.closing');
};
$.webos.window.getWindowById = function(id) { //Recuperer une fenetre a aprtir de son ID
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
$.webos.window._getHidePos = function() {
	return {
		top: 0,
		left: 0
	};
};
$.webos.window.getHidePos = function(thisWindow) {
	var hidePos = $.webos.window._getHidePos(thisWindow);
	return {
		top: (hidePos && hidePos.top > 0) ? hidePos.top : 0,
		left: (hidePos && hidePos.left > 0) ? hidePos.left : 0
	};
};
$.webos.window.setHidePosFn = function(fn) {
	$.webos.window._getHidePos = fn;
};

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
		if (typeof this.options._components.icon == 'undefined') {
			this.options._components.icon = $('<img />', { alt: '' }).prependTo(this.element);
		}
		this.options._components.icon.attr('src', src);
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

})(jQuery);