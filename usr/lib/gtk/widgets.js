/**
 * Webos' widgets.
 * @author Simon Ser
 * @version 2.0
 * @since 1.0alpha1
 */

(function($) {

Webos.require('/usr/share/css/gtk/widgets.css');

/**
 * Global namespace for webos' widgets.
 * @type {Object}
 */
$.webos = {};

/**
* Define a new widget.
* @param {String} widgetName The widget's name.
* @param {Object|String} arg1 The widget's properties. If it is the name of a widget, the new widget will inherit from it.
* @param {Object} [arg2] If arg1 is the name of a widget, arg2 will be the widget's properties.
* @static
*/
$.webos.widget = function(widgetName) {
	widgetName = String(widgetName);

	var properties, parentWidgetName, parentWidget;

	if (typeof arguments[1] == 'string') {
		parentWidgetName = arguments[1];

		if ($[$.webos.widget.namespace()][parentWidgetName]) {
			parentWidget = $[$.webos.widget.namespace()][parentWidgetName];
		}

		if (typeof arguments[2] == 'object') {
			properties = arguments[2];
		} else if ($.webos[widgetName] && $.webos[widgetName].prototype) {
			properties = $.webos[widgetName].prototype;
		}
	} else if (typeof arguments[1] == 'object') {
		properties = arguments[1];
	} else if (typeof arguments[1] == 'undefined') {
		if ($.webos[widgetName] && $.webos[widgetName].prototype) {
			properties = $.webos[widgetName].prototype;
		}
	}

	if (typeof properties != 'object') {
		return false;
	}

	properties.widgetEventPrefix = widgetName.toLowerCase();
	properties.widgetBaseClass = 'webos-' + widgetName.toLowerCase();

	// Backup constructor
	var originalConstructor = $.webos[widgetName];

	var fullWidgetName = $.webos.widget.namespace() + '.' + widgetName;
	if (parentWidget) {
		$.widget(fullWidgetName, parentWidget, properties);
	} else {
		$.widget(fullWidgetName, properties);
	}

	// Look to the created prototype because of inheritance
	// If the parent widget has "_translationsName", the child too!
	if ($[$.webos.widget.namespace()][widgetName].prototype._translationsName) {
		parentWidget = $[$.webos.widget.namespace()][widgetName];
		$.widget(fullWidgetName, parentWidget, {
			_translations: new Webos.Translation(),
			_create: function() {
				if (this._translations.isEmpty()) {
					var that = this, args = arguments, superFn = this._super;

					Webos.Translation.load(function(t) {
						that._translations = t;
						superFn.apply(that, args);
					}, this._translationsName);
				} else {
					this._superApply(arguments);
				}
			},
			translations: function() {
				return this._translations;
			}
		});
	}

	//Restore constructor
	if (typeof originalConstructor == 'function') {
		var newConstructor = $.webos[widgetName];
		var constrProperties = Object.keys(newConstructor);

		for (var i = 0; i < constrProperties.length; i++) {
			originalConstructor[constrProperties] = newConstructor[constrProperties];
		}

		$.webos[widgetName] = originalConstructor;
	}
};

/**
 * Define a new subwidget.
 * @param {String} widgetName The widget's name.
 * @param {String} widgetName The subwidget's name.
 * @param {Function} init The initialization callback.
 */
$.webos.subwidget = function(widgetName, subwidgetName, init) {
	var subwidgetFullName = widgetName+'.'+subwidgetName;

	var constructor = function(options) {
		$(this)[widgetName](options);
		init([], $(this));
		return $(this);
	};
	constructor.prototype = $[$.webos.widget.namespace()][widgetName].prototype;

	$[$.webos.widget.namespace()][subwidgetFullName] = constructor;
	$.fn[subwidgetFullName] = constructor;

	if ($.webos[widgetName]) { //Constructor
		$.webos[widgetName][subwidgetName] = function() {
			var args = Array.prototype.slice.call(arguments);
			var $widget = $.webos[widgetName]();
			init(args, $widget);
			return $widget;
		};
	}
};

/**
 * The widgets' namespace.
 * @type {String}
 * @static
 * @private
 */
$.webos.widget._namespace = 'gtk';

/**
 * Get the widgets' namespace.
 * @return {String}
 */
$.webos.widget.namespace = function() {
	return $.webos.widget._namespace;
};

/**
 * Get a widget selector.
 * @param {String} widgetName The widget's name.
 * @return {String}
 * @private
 */
$.webos.widget._widgetSelector = function(widgetName) {
	return ':data(\'' + $.webos.widget.namespace() + '-' + widgetName +'\')';
};

/**
 * Check if an element if a specified widget or not.
 * @param {jQuery} element The element which will be tested.
 * @param {String} widgetName The widget's name.
 * @return {Boolean}
 * @static
 */
$.webos.widget.is = function(element, widgetName) {
	return $(element).is($.webos.widget._widgetSelector(widgetName));
};

/**
 * Filter elements by widget name.
 * @param {jQuery} element Elements to filter.
 * @param {String} widgetName The widget's name.
 * @return {jQuery}
 * @static
 */
$.webos.widget.filter = function(element, widgetName) {
	return $(element).filter($.webos.widget._widgetSelector(widgetName));
};

/**
 * Get an element's widget name.
 * @param {jQuery} element The element.
 * @return {String} The widget name.
 * @deprecated Manipulates a large number of elements.
 */
$.webos.widget.get = function(element) {
	var widgetsList = $.webos.widget.listAll();
	var elWidgets = [];

	for (var widgetName in widgetsList) {
		if ($.webos.widget.is(element, widgetName)) {
			return widgetName;
		}
	}
};

/**
 * List all widgets.
 * @return {jQuery}
 * @deprecated Manipulates a large number of elements.
 */
$.webos.widget.listAll = function() {
	return $[$.webos.widget.namespace()];
};

/**
 * List all widgets.
 * @deprecated Use $.webos.widget.listAll() instead.
 */
$.webos.widget.list = function() {
	return $.webos.widget.listAll();
};

/**
 * A list of all widgets elements.
 * @type {Array}
 * @private
 */
$.webos.widgets = [];
/**
 * Get widgets by name.
 * @param {String} widgetName The widget name.
 * @return {jQuery} All elements that are widgets with the specified name.
 */
$.webos.getWidgets = function(widgetName) {
	if (widgetName) {
		return $($.webos.widgets).filter($.webos.widget._widgetSelector(widgetName));
	}
	
	return $($.webos.widgets);
};

/**
 * A widget.
 */
$.webos.widget.prototype = {
	/**
	 * The widget's name.
	 * @type {String}
	 * @private
	 */
	_name: 'widget',
	/**
	 * The widget's options.
	 * @type {Object}
	 */
	options: {
		id: 0,
		pid: null
	},
	/**
	 * Initialize the widget.
	 * @private
	 */
	_create: function() {
		this._super('_create');
		
		var that = this;

		this.options.id = $.webos.widgets.push(this.element) - 1;
		if (typeof Webos.Process.current() != 'undefined') {
			var proc = Webos.Process.current();
			this.options.pid = proc.getPid();
			/*proc.bind('stop', function() {
				var $el = that.element;

				if ($el.length > 0 && $el.closest('html').length > 0) {
					$el.empty().remove();
				}
			});*/
		}
		this.element.addClass('webos-'+this._name);
		this.element.attr('id', 'webos-widget-'+this.options.id);
	},
	/**
	 * Get this widget's id.
	 * @return {Number}
	 */
	id: function() {
		return this.options.id;
	},
	/**
	 * Get the process id which was running when creating the widget.
	 * @return {Number}
	 */
	pid: function() {
		return this.options.pid;
	},
	/**
	 * Destroy this widget.
	 */
	destroy: function() {
		this._trigger('destroy', { type: 'destroy' });

		delete $.webos.widgets[this.options.id];

		this._super('destroy');
	},
	/**
	 * Internal handler called when an option is updated.
	 * @private
	 */
	_setOption: function(key, value) {
		this.options[key] = value;
		this._update(key, value);
	},
	/**
	 * Get a selector for this widget.
	 * @return {String} The selector.
	 */
	selector: function() {
		return '#'+this.element.attr('id');
	},
	/**
	 * Callback for option changes.
	 * @private
	 */
	_update: function() {}
};
$.webos.widget('widget');

/**
 * A container.
 * @return {jQuery} The container.
 * @constructor
 * @augments $.webos.widget
 */
$.webos.container = function() {
	return $('<div></div>').container();
};
/**
 * A container.
 */
$.webos.container.prototype = {
	_name: 'container',
	options: {
		_content: undefined,
		_components: {}
	},
	_create: function() {
		this._super('_create');
		
		this.options._content = this.element;
	},
	/**
	 * Get this container's content wrapper.
	 * @return {jQuery}
	 */
	content: function() {
		return this.options._content;
	},
	/**
	 * Add an element to this container.
	 * @deprecated Useless function.
	 */
	add: function(element) {
		this.options._content.append(element);
		element.trigger('insert');
	},
	/**
	 * Get a component of this container.
	 * @param {String} component The component's name.
	 * @return {jQuery}
	 */
	component: function(component) {
		return this.options._components[component];
	}
};
$.webos.widget('container', 'widget');

/**
 * A container with a scrollbar.
 * @param {Object} options The widget's options.
 * @constructor
 * @augments $.webos.container
 */
$.webos.scrollPane = function(options) {
	return $('<div></div>').scrollPane(options);
};
/**
 * A container with a scrollbar.
 */
$.webos.scrollPane.prototype = {
	_name: 'scrollpane',
	/**
	 * Options :
	 *  - `autoReload = false` : auto reload scrollbars
	 *  - `expand = false` : expand the scrollpane to the largest available space
	 *  - `keyUpResize = false` : reload on keyup
	 *  - `alsoResize` : resize also another element
	 *  - `forceArtificialScrollbars` : force scrollbars to be artificial (you'll have to call the `reload()` function when content is updated)
	 *  - `forceStyledScrollbars` : force scrollbars to be native (you won't have to call `reload()`)
	 */
	options: {
		autoReload: false,
		horizontalDragMinWidth: 20,
		verticalDragMinHeight: 20,
		animate: false,
		mouseWheelSpeed: 30,
		expand: false,
		keyUpResize: false,
		alsoResize: null,
		forceArtificialScrollbars: false,
		forceStyledScrollbars: false
	},
	_create: function() {
		this._super('_create');

		var that = this;

		if (this.isNatural()) {
			this.element.addClass('scrollpane-natural');
			this.options._content = $('<div></div>', { 'class': 'pane-natural' }).appendTo(this.element);

			this.element.scroll(function() {
				that._trigger('scroll');
			});
		} else {
			var originalScrollTop = this.element.scrollTop(), originalScrollLeft = this.element.scrollLeft();
		
			this.element.attr('tabindex', 0);

			this.options._components.container = $('<div></div>', { 'class': 'container' });
			this.options._content = $('<div></div>', { 'class': 'pane' });
			this.element.wrapInner(this.options._components.container);
			this.options._components.container.wrapInner(this.options._content);
			this.options._components.verticalBar = $('<div class="vertical-bar" />').append(
				$('<div class="cap cap-top" />'),
				$('<div class="track" />').append(
					$('<div class="background" />'),
					$('<div class="drag-container" />').append(
						$('<div class="drag" />').append(
							$('<div class="drag-top" />'),
							$('<div class="drag-bottom" />')
						)
					)
				),
				$('<div class="cap cap-bottom" />')
			).appendTo(this.element);
			this.options._components.horizontalBar = $('<div class="horizontal-bar" />').append(
				$('<div class="corner" />'),
				$('<div class="cap cap-left" />'),
				$('<div class="track" />').append(
					$('<div class="background" />'),
					$('<div class="drag-container" />').append(
						$('<div class="drag" />').append(
							$('<div class="drag-left" />'),
							$('<div class="drag-right" />')
						)
					)
				),
				$('<div class="cap cap-right" />')
			).appendTo(this.element);
			
			this._track();
		}

		this._update('autoReload', this.options.autoReload);
		this._update('expand', this.options.expand);
		this._update('keyUpResize', this.options.keyUpResize);
		this._update('alsoResize', this.options.alsoResize);
		
		this.reload();

		if (originalScrollTop != 0) {
			this.scrollToY(originalScrollTop);
		}
		if (originalScrollLeft != 0) {
			this.scrollToX(originalScrollLeft);
		}
	},
	/**
	 * Check if this scrollpane have native scrollbars or not.
	 * @return {Boolean}
	 */
	isNatural: function() {
		return (!this.options.forceArtificialScrollbars && (!this.options.forceStyledScrollbars || (navigator.userAgent && /(webkit|chrome|safari)/i.test(navigator.userAgent) )));
	},
	_track: function() {
		var that = this;
		
		var cancelDrag = function() {
			$('html').unbind('dragstart.scrollpane.widget.webos selectstart.scrollpane.widget.webos mousemove.scrollpane.widget.webos mouseup.scrollpane.widget.webos mouseleave.scrollpane.widget.webos');
		};
		
		this.options._components.verticalBar.bind('mousedown.scrollpane.widget.webos', function(e) {
			// Stop IE from allowing text selection
			$('html').bind('dragstart.scrollpane.widget.webos selectstart.scrollpane.widget.webos', function(e) {
				e.preventDefault();
			});

			var startY = e.pageY - that.options._components.verticalBar.find('.drag-container').position().top;

			$this = $(this);
			$('html').bind('mousemove.scrollpane.widget.webos', function(e) {
				that.positionDragY(e.pageY - startY, false);
			}).bind('mouseup.scrollpane.widget.webos mouseleave.scrollpane.widget.webos', function() {
				$this.removeClass('dragging');
				cancelDrag();
			});

			$(this).addClass('dragging');

			e.preventDefault();
		}).bind('click.scrollpane.widget.webos', function(e) {
			e.preventDefault();
		});
		
		this.options._components.horizontalBar.bind('mousedown.scrollpane.widget.webos', function(e) {
			// Stop IE from allowing text selection
			$('html').bind('dragstart.scrollpane.widget.webos selectstart.scrollpane.widget.webos', function(e) {
				e.preventDefault();
			});

			var startX = e.pageX - that.options._components.horizontalBar.find('.drag-container').position().left;

			$this = $(this);
			$('html').bind('mousemove.scrollpane.widget.webos', function(e) {
				that.positionDragX(e.pageX - startX, false);
			}).bind('mouseup.scrollpane.widget.webos mouseleave.scrollpane.widget.webos', function() {
				$this.removeClass('dragging');
				cancelDrag();
			});

			$(this).addClass('dragging');

			e.preventDefault();
		}).bind('click.scrollpane.widget.webos', function(e) {
			e.preventDefault();
		});
	},
	_mousewheel: function(value) { //Support de la molette de la souris
		var that = this;
		var mwEvent = $.fn.mwheelIntent ? 'mwheelIntent.scrollpane.widget.webos' : 'mousewheel.scrollpane.widget.webos';
		
		if (value !== false) {
			this.element.unbind(mwEvent).bind(mwEvent, function (event, delta, deltaX, deltaY) {
				var data = that.element.data('scrollpane');
				var dX = data.horizontalDragPosition, dY = data.verticalDragPosition;
				that.scrollBy(deltaX * that.options.mouseWheelSpeed, - deltaY * that.options.mouseWheelSpeed, false);
				// return true if there was no movement so rest of screen can scroll
				return (dX == data.horizontalDragPosition && dY == data.verticalDragPosition);
			});
		} else {
			this.element.unbind(mwEvent);
		}
	},
	_touch: function(value) { // Support du touch
		
	},
	_focusHandler: function(value) { //Support de la navigation clavier
		
	},
	_update: function(key, value) {
		switch (key) {
			case 'autoReload':
				var that = this;
				var parent = $(window), eventName = 'resize.'+this.id()+'.scrollpane.widget.webos';
				if (this.element.parents().filter('.webos-window').length > 0) {
					parent = this.element.parents().filter('.webos-window').first();
					eventName = 'windowresize.'+this.id()+'.scrollpane.widget.webos windowopen.'+this.id()+'.scrollpane.widget.webos';
				}
				
				this.options.autoReload = (value) ? true : false;
				if (value) {
					parent.bind(eventName, function(e) {
						if (parent.is(window) && !$(e.target).is(window)) {
							return;
						}
						
						that.reload();
					});
					$(window).bind('windowopen.'+this.id()+'.scrollpane.widget.webos', function(e, data) {
						var thisWindow = that.element.parents().filter(data.window);
						if (!that.options.autoReload || thisWindow.length > 0) {
							$(this).unbind('windowopen.'+that.id()+'.scrollpane.widget.webos');
							parent.unbind(eventName);
						}
						if (thisWindow.length > 0) {
							that._update('autoReload', true);
							that.reload();
						}
					});
				} else {
					parent.unbind(eventName);
					$(window).unbind('windowopen.'+this.id()+'.scrollpane.widget.webos');
				}
				break;
			case 'expand':
				this.options.expand = (value) ? true : false;
				if (value) {
					this.element.css({
						width: '100%',
						height: '100%'
					});
				} else {
					this.element.css({
						width: '',
						height: ''
					});
				}
				break;
			case 'keyUpResize':
				this.options.keyUpResize = (value) ? true : false;
				if (value) {
					var that = this;
					this.element.bind('keyup.scrollpane.widget.webos', function() {
						that.reload();
					});
				} else {
					this.element.unbind('keyup.scrollpane.widget.webos');
				}
				break;
			case 'alsoResize':
				if (value) {
					if (this.isNatural()) {
						$(value).css({
							'min-width': '100%',
							'min-height': '100%'
						});
					} else {
						this.element.bind('scrollpanereload.scrollpane.widget.webos', function(e, data) {
							$(value).css({
								'min-width': data.containerWidth - data.verticalTrackWidth,
								'min-height': data.containerHeight - data.horizontalTrackHeight,
								width: data.paneWidth,
								height: data.paneHeight
							});
						}).bind('scrollpanebeforereload.scrollpane.widget.webos', function() {
							$(value).css({
								'min-width': 'auto',
								'min-height': 'auto',
								width: 'auto',
								height: 'auto'
							});
						});
					}
				} else {
					this.element.unbind('scrollpanereload.scrollpane.widget.webos');
				}
				break;
			case 'forceArtificialScrollbars':
			case 'forceStyledScrollbars':
				return false;
		}
	},
	positionDragY: function(destY, animate)
	{
		var data = this.element.data('scrollpane');
		
		if (!data.isScrollableV) {
			return;
		}
		if (destY < 0) {
			destY = 0;
		} else if (destY > data.dragMaxY) {
			destY = data.dragMaxY;
		}

		if (typeof animate == 'undefined') {
			animate = this.options.animate;
		}
		if (animate) {
			//jsp.animate(this.options._components.verticalBar.find('.drag-container'), 'top', destY, this._positionDragY);
		} else {
			this.options._components.verticalBar.find('.drag-container').css('top', destY);
			this._positionDragY(destY);
		}
	},
	_positionDragY: function(destY)
	{
		var data = this.element.data('scrollpane');
		
		if (destY === undefined) {
			destY = this.content().position().top;
		}

		this.options._components.container.scrollTop(0);
		var verticalDragPosition = destY;

		var isAtTop = (verticalDragPosition === 0),
			isAtBottom = (verticalDragPosition == data.dragMaxY),
			percentScrolled = destY / data.dragMaxY,
			destTop = Math.round( - percentScrolled * (data.paneHeight - data.containerHeight));
		
		if (data.wasAtTop != isAtTop || data.wasAtBottom != isAtBottom) {
			data.wasAtTop = isAtTop;
			data.wasAtBottom = isAtBottom;
			this.element.trigger('arrowchange', {}, [data.wasAtTop, data.wasAtBottom, data.wasAtLeft, data.wasAtRight]);
		}		
		
		this.content().css('top', destTop);
		this._trigger('scrolly', {}, [-destTop, isAtTop, isAtBottom]);
		this._trigger('scroll');
		
		this.element.data('scrollpane', data);
	},
	positionDragX: function(destX, animate)
	{
		var data = this.element.data('scrollpane');
		
		if (!data.isScrollableH) {
			return;
		}
		if (destX < 0) {
			destX = 0;
		} else if (destX > data.dragMaxX) {
			destX = data.dragMaxX;
		}

		if (typeof animate == 'undefined') {
			animate = this.options.animate;
		}
		if (animate) {
			//jsp.animate(this.options._components.horizontalBar.find('.drag-container'), 'top', destX, this._positionDragX);
		} else {
			this.options._components.horizontalBar.find('.drag-container').css('left', destX);
			this._positionDragX(destX);
		}
	},
	_positionDragX: function(destX)
	{
		var data = this.element.data('scrollpane');
		
		if (destX === undefined) {
			destX = this.content().position().left;
		}

		this.options._components.container.scrollTop(0);
		var horizontalDragPosition = destX;

		var isAtLeft = horizontalDragPosition === 0,
			isAtRight = horizontalDragPosition == data.dragMaxX,
			percentScrolled = destX / data.dragMaxX,
			destLeft = Math.round( - percentScrolled * (data.paneWidth - data.containerWidth));

		if (data.wasAtLeft != isAtLeft || data.wasAtRight != isAtRight) {
			data.wasAtLeft = isAtLeft;
			data.wasAtRight = isAtRight;
			this._trigger('arrowchange', {}, [data.wasAtTop, data.wasAtBottom, data.wasAtLeft, data.wasAtRight]);
		}
		
		this.content().css('left', destLeft);
		this._trigger('scrollx', {}, [-destLeft, isAtLeft, isAtRight]);
		this._trigger('scroll');
		
		this.element.data('scrollpane', data);
	},
	position: function(pos) {
		if (typeof pos == 'undefined') {
			if (this.isNatural()) {
				return {
					x: this.element.scrollLeft(),
					y: this.element.scrollTop()
				};
			} else {
				pos = this.content().position();
				return {
					x: - pos.left,
					y: - pos.top
				};
			}
		} else {
			this.scrollTo(pos.x, pos.y);
		}
	},
	scrollToX: function(destX, animate) {
		if (this.isNatural()) {
			this.element.scrollLeft(destX);
			return;
		}

		var data = this.element.data('scrollpane');
		if (data.paneWidth - data.containerWidth == 0) { //Division by 0
			return;
		}
		var percentScrolled = destX / (data.paneWidth - data.containerWidth);
		this.positionDragX(percentScrolled * data.dragMaxX, animate);
	},
	scrollToY: function(destY, animate) {
		if (this.isNatural()) {
			this.element.scrollTop(destY);
			return;
		}

		var data = this.element.data('scrollpane');
		if (data.paneHeight - data.containerHeight == 0) { //Division by 0
			return;
		}
		var percentScrolled = destY / (data.paneHeight - data.containerHeight);
		this.positionDragY(percentScrolled * data.dragMaxY, animate);
	},
	scrollTo: function(destX, destY, animate) {
		this.scrollToX(destX, animate);
		this.scrollToY(destY, animate);
	},
	scrollByX: function(deltaX, animate) {
		var data = this.element.data('scrollpane');
		var destX = this.position().x + Math[(deltaX < 0) ? 'floor' : 'ceil'](deltaX);
		this.scrollToX(destX, animate);
	},
	scrollByY: function(deltaY, animate) {
		var data = this.element.data('scrollpane');
		var destY = this.position().y + Math[(deltaY < 0) ? 'floor' : 'ceil'](deltaY);
		this.scrollToY(destY, animate);
	},
	scrollBy: function(deltaX, deltaY, animate) {
		this.scrollByX(deltaX, animate);
		this.scrollByY(deltaY, animate);
	},
	reload: function() {
		this._trigger('beforereload', { type: 'beforereload' });
		
		var data = {}, that = this;
		this.element.data('scrollpane', data);

		if (this.isNatural()) {
			that._trigger('reload', { type: 'reload' }, data);
			return;
		}
		
		this.element.css({
			overflow: 'hidden',
			padding: 0
		});
		this.content().css({
			width: 'auto',
			height: 'auto'
		});

		setTimeout(function() { //Delay for Mozilla
			data.containerWidth = that.element.width();
			data.containerHeight = that.element.height();

			data.paneWidth = that.content().outerWidth(true);
			data.paneHeight = that.content().outerHeight(true);

			data.percentInViewH = data.paneWidth / data.containerWidth;
			data.percentInViewV = data.paneHeight / data.containerHeight,
			data.isScrollableV = (data.percentInViewV > 1);
			data.isScrollableH = (data.percentInViewH > 1);

			if (!(data.isScrollableH || data.isScrollableV)) {
				that.element.removeClass('scrollable');
				
				that.options._components.horizontalBar.hide();
				that.options._components.verticalBar.hide();
				
				that.content().css({
					top: 0,
					left: 0,
					width: '100%',
					height: '100%'
				});
				
				that._mousewheel(false);
			} else {
				that.element.addClass('scrollable');
				
				that.content().css({
					width: 'auto',
					height: 'auto'
				});
				
				var top = that.content().position().top, left = that.content().position().left;
				if (data.isScrollableV) {
					that.options._components.verticalBar.show();
					top = (- top + (data.paneHeight - data.containerHeight) < 0) ? - (data.paneHeight - data.containerHeight) : top;
				} else {
					that.options._components.verticalBar.hide();
					top = 0;
				}
				if (data.isScrollableH) {
					that.options._components.horizontalBar.show();
					left = (- left + (data.paneWidth - data.containerWidth) < 0) ? - (data.paneWidth - data.containerWidth) : left;
				} else {
					that.options._components.horizontalBar.hide();
					left = 0;
				}
				
				that.content().css({
					top: top,
					left: left
				});
				
				data.horizontalTrackHeight = that.options._components.horizontalBar.children('.track').outerHeight(true);
				data.verticalTrackWidth = that.options._components.verticalBar.outerWidth(true);
				
				data.horizontalTrackWidth = data.containerWidth;
				data.verticalTrackHeight = data.containerHeight;
				that.element.find('>.vertical-bar>.cap:visible,>.vertical-bar>.arrow').each(function() {
					data.verticalTrackHeight -= $(that).outerHeight(true);
				});
				that.element.find('>.horizontal-bar>.cap:visible,>.horizontal-bar>.arrow').each(function() {
					data.horizontalTrackWidth -= $(that).outerWidth(true);
				});
				
				that.options._components.container.width(data.containerWidth - data.verticalTrackWidth).height(data.containerHeight - data.horizontalTrackHeight);

				that.content().css({
					'min-width': data.containerWidth - data.verticalTrackWidth,
					'min-height': data.containerHeight - data.horizontalTrackHeight
				});
				
				if (data.isScrollableH && data.isScrollableV) {
					data.verticalTrackHeight -= data.horizontalTrackHeight;
					that.options._components.horizontalBar.find('>.cap:visible,>.arrow').each(function() {
						data.horizontalTrackWidth += $(that).outerWidth(true);
					});
					data.horizontalTrackWidth -= data.verticalTrackWidth;
					data.paneHeight -= data.verticalTrackWidth;
					data.containerHeight -= 2 * data.verticalTrackWidth;
					data.paneWidth -= data.horizontalTrackHeight;
					data.containerWidth -= 2 * data.horizontalTrackHeight;
					that.options._components.horizontalBar.find('.corner').height(data.horizontalTrackHeight).width(data.verticalTrackWidth);
				}
				
				var dragContainerV = that.options._components.verticalBar.find('.drag-container');
				if (data.isScrollableV) {
					that.options._components.verticalBar.find('.track').height(data.verticalTrackHeight);
					data.verticalDragMarginY = parseInt(dragContainerV.css('padding-top'), 10) + parseInt(dragContainerV.css('padding-bottom'), 10);
					var verticalDragHeight = Math.ceil(1 / data.percentInViewV * data.verticalTrackHeight);
					if (verticalDragHeight < that.options.verticalDragMinHeight) {
						verticalDragHeight = that.options.verticalDragMinHeight;
					}
					data.verticalDragHeight = verticalDragHeight + data.verticalDragMarginY;
					data.dragMaxY = data.verticalTrackHeight - data.verticalDragHeight;

					var percentScrolled = top / (data.paneHeight - data.containerHeight);
					if (percentScrolled > 1) { percentScrolled = 1; }
					if (percentScrolled < 0) { percentScrolled = 0; }
					dragContainerV
						.height(verticalDragHeight)
						.css('top', Math.round(percentScrolled * data.dragMaxY) );
				}
				var dragContainerH = that.options._components.horizontalBar.find('.drag-container');
				if (data.isScrollableH) {
					that.options._components.horizontalBar.find('.track').width(data.horizontalTrackWidth);
					data.horizontalDragMarginX = parseInt(dragContainerH.css('padding-top'), 10) + parseInt(dragContainerH.css('padding-bottom'), 10);
					var horizontalDragWidth = Math.ceil(1 / data.percentInViewH * data.horizontalTrackWidth);
					if (horizontalDragWidth < that.options.horizontalDragMinWidth) {
						horizontalDragWidth = that.options.horizontalDragMinWidth;
					}
					data.horizontalDragWidth = horizontalDragWidth + data.horizontalDragMarginX;
					data.dragMaxX = data.horizontalTrackWidth - data.horizontalDragWidth;

					var percentScrolled = left / (data.paneWidth - data.containerWidth);
					if (percentScrolled > 1) { percentScrolled = 1; }
					if (percentScrolled < 0) { percentScrolled = 0; }
					dragContainerH
						.width(horizontalDragWidth)
						.css('left', Math.round(percentScrolled * data.dragMaxX) );
				}
				
				that._mousewheel(true);
			}
			
			that.element.data('scrollpane', data);
			
			that._trigger('reload', { type: 'reload' }, data);
		}, 5);
	}
};
$.webos.widget('scrollPane', 'container');

/**
 * A text container.
 * @param {String} text The text.
 * @constructor
 * @augments $.webos.container
 */
$.webos.label = function(text) {
	return $('<div></div>').label({
		text: text
	});
};
/**
 * A text container.
 */
$.webos.label.prototype = {
	/**
	 * Options:
	 *  - `text`: the label's text
	 */
	options: {
		text: ''
	},
	_name: 'label',
	_create: function() {
		this._super('_create');
		
		this.options._content.html(this.options.text);
	},
	_update: function(key, value) {
		switch(key) {
			case 'text':
				this.options._content.html(this.options.text);
				break;
		}
	}
};
$.webos.widget('label', 'container');

/**
 * An image.
 * @param {String} [src] The image's source path.
 * @param {String} [title] The image's title.
 * @param {Boolean} [loadHidden] Set to false to don't load the image if it's hidden.
 * @constructor
 * @augments $.webos.widget
 */
$.webos.image = function(src, title, loadHidden) {
	return $('<img />').image({
		src: src,
		title: title,
		loadHidden: loadHidden
	});
};
/**
 * An image.
 */
$.webos.image.prototype = {
	_name: 'image',
	/**
	 * Options:
	 *  - `src`: the image's source path
	 *  - `title`: the image's title
	 *  - `loadHidden = true`: load the image even if it is hidden
	 *  - `animate = false`: animate when the image is loaded
	 */
	options: {
		src: '',
		title: 'image',
		loadHidden: true,
		animate: false,
		img: null,
		parent: $()
	},
	_create: function() {
		if (!this.element.is('img')) {
			var $newEl = $('<img />');
			this.element.empty().append($newEl);
			this.element = $newEl;
		}

		this._super('_create');
		
		this.option('title', this.options.title);
		this.option('src', this.options.src);
	},
	/**
	 * Load the image.
	 */
	load: function() {
		if (this.options.img) {
			return;
		}

		//Transparent image (1x1 px)
		this.element.attr('src','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QEMDAMRXUW5DAAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAANSURBVAjXY/j//z8DAAj8Av5cn8/aAAAAAElFTkSuQmCC');

		if (!this.options.loadHidden) {
			if (this.element.is(':hidden')) {
				return;
			}

			if (this.element.closest('html').length == 0) {
				return;
			}

			var pos, dim, parentData;

			var parentDataIndex = 'image.widget.webos',
			timeout = 500,
			currentTime = (new Date).getTime(),
			parent = (this.options.parent.length) ? this.options.parent : this.element.parent();

			var generateParentData = function generateParentData() {
				var parentScroll;
				if ($.webos.widget.is(parent, 'scrollPane')) {
					parentScroll = parent.scrollPane('position');
				} else {
					parentScroll = { y: parent.scrollTop(), x: parent.scrollLeft() };
				}

				var parentData = {
					dim: { width: parent.width(), height: parent.height() },
					scroll: parentScroll,
					time: currentTime
				};

				parent.data(parentDataIndex, parentData);

				return parentData;
			};

			pos = this.element.position();
			parentData = parent.data(parentDataIndex);
			if (parentData) {
				if (parentData.time + timeout < currentTime) {
					parentData = generateParentData();
				}
			} else {
				parentData = generateParentData();
			}

			if (pos.left > parentData.dim.width + parentData.scroll.x || pos.top > parentData.dim.height + parentData.scroll.y) {
				return;
			}

			dim = { width: this.element.width(), height: this.element.height() };

			if (pos.left + dim.width < parentData.scroll.x || pos.top + dim.height < parentData.scroll.y) {
				return;
			}
		}
		
		var that = this;

		var src = String(this.options.src);
		this.options.img = new Image();
		this.options.img.onload = function() {
			if (that.options.animate) {
				that.element.css('opacity', 0);
			}

			that.element.attr('src', src);

			if (that.options.animate) {
				that.element.animate({ opacity: 1 }, 'fast');
			}

			that._trigger('load', { type: 'load' }, { img: that.options.img });
		};
		this.options.img.onerror = function() {
			that._trigger('error', { type: 'error' }, { img: that.options.img });
		};
		this.options.img.onabort = function() {
			that._trigger('abort', { type: 'abort' }, { img: that.options.img });
		};
		this.options.img.src = src;
	},
	/**
	 * Check if the image is loaded.
	 * @return {Boolean}
	 */
	loaded: function() {
		return (this.options.img) ? true : false;
	},
	_update: function(key, value) {
		switch(key) {
			case 'src':
				this.options.src = String(value);

				if (this.options.src) {
					this.load();
				}
				break;
			case 'title':
				this.element.attr('alt', value).attr('title', value);
				break;
			case 'parent':
				var that = this, $parent = $(value);

				if (!$parent.length) {
					return false;
				}

				var suffix = this.id()+'.image.widget.webos', eventName = 'scroll.'+suffix;
				if ($.webos.widget.is($parent, 'scrollPane')) {
					eventName = 'scrollpanescroll.'+suffix;
				}

				var delay = 250, //1/4 s.
				scrollTimeout = null,
				scrollTimeStamp;

				var setScrollTimeout = function() {
					scrollTimeStamp = (new Date).getTime();

					if (!scrollTimeout) {
						scrollTimeout = setTimeout(function() {
							scrollTimeout = null;

							var time = (new Date).getTime();
							if (time - scrollTimeStamp > delay + 50) { //Add an additionnal delay 
								setScrollTimeout();
							} else {
								scrollTimeStamp = null;

								that.element.one('imageload', function() {
									$parent.unbind(eventName);
								});

								that.load();
							}
						}, delay);
					}
				};

				$parent.bind(eventName, function(e) {
					setScrollTimeout();
				});
				break;
		}
	}
};
$.webos.widget('image', 'widget');

/**
 * An icon.
 * @param  {String} [src]  The icon's name.
 * @param  {Number} [size] The icon's size.
 * @constructor
 * @augments $.webos.image
 */
$.webos.icon = function(src, size) {
	return $('<img />').icon({
		src: src,
		size: size
	});
};
/**
 * An icon.
 */
$.webos.icon.prototype = {
	_name: 'icon',
	/**
	 * Options:
	 *  - `src`: the icon's name
	 *  - `size`: the icon's size
	 *  - `variant`: the icon's variant (can be `dark` or `light`)
	 */
	options: {
		src: '',
		size: undefined,
		variant: ''
	},
	_create: function() {
		this._super('_create');

		if (this.options.size) {
			this.option('size', this.options.size);
		}
		if (this.options.variant) {
			this.option('variant', this.options.variant);
		}
	},
	_update: function(key, value) {
		switch(key) {
			case 'src':
				if (!value) {
					return;
				}

				//TODO: that's ugly!
				if (typeof value == 'string' && (value.indexOf('sbin/') == 0 || value.indexOf('usr/') == 0)) {
					this.options.src = value;
				} else {
					this.options.src = W.Icon.toIcon(value);
					if (this.options.size) {
						this.options.src.setSize(this.options.size);
					}
				}

				this.load();
				break;
			case 'size':
				value = parseInt(value);
				this.options.src.setSize(value);
				this.element.css({
					width: value,
					height: value
				});
				this.load();
				break;
			case 'variant':
				value = String(value);
				this.element.removeClass('icon-'+this.options.variant).addClass('icon-'+value);
				this.options.variant = value;
				break;
		}
	}
};
$.webos.widget('icon', 'image');

$.webos.icon._svgFilters = {
	dark: $('<div style="width:0;height:0;overflow:hidden;"><svg height="0" xmlns="http://www.w3.org/2000/svg"><filter id="webos-icon-brightness-darker"><feComponentTransfer><feFuncR type="linear" slope="0.3"/><feFuncG type="linear" slope="0.3"/><feFuncB type="linear" slope="0.3"/></feComponentTransfer></filter></svg></div>').appendTo('body')
};


/**
 * A progress bar.
 * @param {Number} [value] The progress bar value.
 * @constructor
 * @augments $.webos.container
 */
$.webos.progressbar = function(value) {
	return $('<div></div>').progressbar({
		value: value
	});
};
/**
 * An progress bar.
 */
$.webos.progressbar.prototype = {
	_name: 'progressbar',
	/**
	 * Options:
	 *  - _Number_ `value`: the progress bar value
	 * @type {Object}
	 */
	options: {
		value: 0
	},
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<div></div>').appendTo(this.element);
		this.element.append(this.content());
		this.value(this.options.value);
	},
	_update: function(key, value) {
		switch(key) {
			case 'value':
				this.value(value);
				break;
		}
	},
	/**
	 * Get/set this progress bar value.
	 * @param  {Number} value The new value.
	 * @return {Number}       If `value` is not specified, returns the progress bar value.
	 * @deprecated Use option `value` instead.
	 */
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.options.value;
		} else {
			value = parseInt(value);
			if (isNaN(value)) {
				value = 0;
			}
			if (value < 0) {
				value = 0;
			}
			if (value > 100) {
				value = 100;
			}
			this.options.value = value;
			this.content().css('width', value+'%');
		}
	}
};
$.webos.widget('progressbar', 'container');

/**
 * A button container.
 * @constructor
 * @augments $.webos.container
 */
$.webos.buttonContainer = function() {
	return $('<div></div>').buttonContainer();
};
/**
 * A button container.
 */
$.webos.buttonContainer.prototype = {
	_name: 'button-container'
};
$.webos.widget('buttonContainer', 'container');

/**
 * A button group.
 * @constructor
 * @augments $.webos.container
 */
$.webos.buttonGroup = function() {
	return $('<div></div>').buttonGroup();
};
/**
 * A button container.
 */
$.webos.buttonGroup.prototype = {
	_name: 'button-group'
};
$.webos.widget('buttonGroup', 'container');

/**
 * A button.
 * @param  {String} label  The button label.
 * @param  {Boolean} submit True if it's a submit button.
 * @constructor
 * @augments $.webos.container
 */
$.webos.button = function(label, submit) {
	return $('<span></span>').button({
		label: label,
		submit: submit
	});
};
/**
 * A buton.
 */
$.webos.button.prototype = {
	/**
	 * Options:
	 *  - `label`: the button's label
	 *  - _Boolean_ `submit`: true if it's a submit button
	 *  - _Boolean_ `disabled`: true if this button is disabled
	 *  - _Boolean_ `activated`: true if this button is activated
	 */
	options: {
		label: '',
		icon: undefined,
		submit: false,
		disabled: false,
		activated: false,
		showIcon: true,
		showLabel: true
	},
	_name: 'button',
	_create: function() {
		this._super('_create');

		if (!this.options.label) {
			if (!this.element.is(':empty') && !this.options.label) {
				this.options.label = this.element.html();
			} else {
				this.options.label = 'Bouton';
			}
		}
				
		this._update('submit', this.options.submit);
		this._update('label', this.options.label);
		this._update('disabled', this.options.disabled);
		this._update('activated', this.options.activated);
		this._update('icon', this.options.icon);
		this._update('showLabel', this.options.showLabel);
		this._update('showIcon', this.options.showIcon);
	},
	_update: function(key, value) {
		switch (key) {
			case 'submit':
				var submitFn = function() {
					$(this).parents('form').first().submit();
				};
				if (value) {
					this.content().click(submitFn);
				} else {
					this.content().unbind('click', submitFn);
				}
				this.element.toggleClass('submit', (value) ? true : false);
				break;
			case 'label':
				this.content().html(value);
				break;
			case 'disabled':
				this.disabled(value);
				break;
			case 'activated':
				this.element.toggleClass('active', (value) ? true : false);
				break;
			case 'icon':
				break;
			case 'showLabel':
				break;
			case 'showIcon':
				break;
		}
	},
	/**
	 * Get/set this button disabled value.
	 * @deprecated Use option `disabled` instead.
	 */
	disabled: function(value) {
		if (typeof value == 'undefined') {
			return this.options.disabled;
		} else {
			this.options.disabled = (value) ? true : false;
			if (!this.element.is('.disabled') && this.options.disabled) {
				this.element.addClass('disabled cursor-default');
			}
			if (this.element.is('.disabled') && !this.options.disabled) {
				this.element.removeClass('disabled cursor-default');
			}
		}
	}
};
$.webos.widget('button', 'container');

/**
 * A list.
 * @param  {String|Array} columns The contents of one/all column(s).
 * @param  {Array} buttons The list's buttons.
 * @constructor
 * @augments $.webos.container
 */
$.webos.list = function(columns, buttons) {
	return $('<div></div>').list({
		columns: columns,
		buttons: buttons
	});
};
/**
 * A list.
 */
$.webos.list.prototype = {
	/**
	 * Options:
	 *  - _Array_ `columns`: the list's columns
	 *  - _Array_ `buttons`: the list's buttons
	 *  - _Boolean_ `multipleSelection=true`: true to enable multiple selection
	 */
	options: {
		columns: [],
		buttons: [],
		multipleSelection: true
	},
	_name: 'list',
	_create: function() {
		this._super('_create');
		
		this.options._components.table = $('<table></table>').appendTo(this.element);
		this.options._components.head = $('<thead></thead>').appendTo(this.options._components.table);
		this.options._content = $('<tbody></tbody>').appendTo(this.options._components.table);
		
		for (var i = 0; i < this.options.columns.length; i++) {
			this.addColumn(this.options.columns[i]);
		}
		
		for (var i = 0; i < this.options.buttons.length; i++) {
			this.addButton(this.options.buttons[i]);
		}
	},
	/**
	 * Add a new column.
	 * @param {String} [value] The new column's content.
	 * @return {jQuery} The new column.
	 */
	addColumn: function(value) {
		if (this.options._components.head.children('tr').length == 0) {
			this.options._components.head.append($('<tr></tr>'));
		}
		
		return $('<td></td>').html(value || '').appendTo(this.options._components.head.children('tr'));
	},
	/**
	 * Get/set a column.
	 * @param  {Number} id      The column id.
	 * @param  {String} [content] The column's content.
	 * @return {jQuery} The column.
	 */
	column: function(id, content) {
		var column;
		if (typeof id == 'undefined') {
			column = this.addColumn();
		} else {
			column = $(this.options._components.head.find('td')[id]);
			if (column.length == 0) {
				column = this.addColumn();
			}
		}
		
		if (typeof content != 'undefined') {
			column.html(content);
		}
		
		return column;
	},
	/**
	 * Sort this list by column.
	 * @param  {Number} column The column id.
	 * @param  {Boolean} invert True to invert sorting.
	 */
	sort: function(column, invert) {
		if (!column) {
			column = 0;
		}
		
		var items = this.content().children();
		var itemsArray = $.makeArray(items);
		itemsArray.sort(function(a, b) {
			a = $(a).text();
			b = $(b).text();
			for (var i = 0, aa, bb; (aa = a[i]) && (bb = b[i]); i++) {
				if (aa !== bb) {
					var c = Number(aa), d = Number(bb);
					if (c == aa && d == bb) {
						return c - d;
					} else {
						return (aa > bb) ? 1 : -1;
					}
				}
			}
			return a.length - b.length;
		});

		if (invert) {
			itemsArray.reverse();
		}

		var that = this;

		var sortedItems = [];

		items.each(function() {
			var item = $(this);
			var currentIndex = item.index(), index = jQuery.inArray(this, itemsArray);
			item.detach();
			
			for (var i = index - 1; i >= 0; i--) {
				if (jQuery.inArray(i, sortedItems) != -1) {
					item.insertAfter(itemsArray[i]);
					sortedItems.push(index);
					return;
				}
			}
			item.prependTo(that.content());
			sortedItems.push(index);
		});
	},
	/**
	 * Add a new button to this list.
	 * @param {jQuery} button The button.
	 */
	addButton: function(button) {
		if (typeof this.options._components.buttonContainer == 'undefined') {
			this.options._components.buttonContainer = $.w.buttonContainer().appendTo(this.element);
		}
		
		this.options._components.buttonContainer.append(button);
	},
	/**
	 * Get this list's items.
	 * @return {jQuery} Items.
	 */
	items: function() {
		return this.content().children();
	},
	/**
	 * Get/set this current list's selection.
	 * @param  {String|Number} selection The selection range. Can be `4` or `0-9`.
	 * @return {jQuery}           The current selection.
	 */
	selection: function(selection) {
		if (typeof selection == 'undefined') {
			return this.items().filter('.active');
		} else {
			if (typeof selection == 'string') {
				if (/^[0-9]+$/.test(selection)) {
					selection = [parseInt(selection)];
				} else if (/^[0-9]+\-[0-9]+$/.test(selection)) {
					var result = /^([0-9]+)-([0-9]+)$/.exec(selection);
					range = [parseInt(result[1]), parseInt(result[2])];

					if (range[0] > range[1]) {
						range = [range[1], range[0]];
					}

					selection = [];
					for (var i = range[0]; i <= range[1]; i++) {
						selection.push(i);
					}
				} else {
					return false;
				}
			} else if (typeof selection == 'number') {
				selection = [selection];
			}

			this.items().each(function() {
				if ($.inArray($(this).index(), selection) != -1) {
					$(this).listItem('active', true);
				} else {
					$(this).listItem('active', false);
				}
			});
		}
	},
	_update: function(key, value) {
		switch(key) {
			case 'columns':
				this.options._components.head.find('td').remove();
				for (var i = 0; i < this.options.columns.length; i++) {
					this.addColumn(this.options.columns[i]);
				}
				break;
			case 'buttons':
				if (typeof this.options._components.buttonContainer != 'undefined') {
					this.options._components.buttonContainer.remove();
				}
				for (var i = 0; i < this.options.buttons.length; i++) {
					this.addButton(this.options.buttons[i]);
				}
				break;
		}
	}
};
$.webos.widget('list', 'container');

/**
 * A list item.
 * @see $.webos.list
 * @constructor
 * @augments $.webos.container
 */
$.webos.listItem = function(columns) {
	return $('<tr></tr>').listItem({
		columns: columns
	});
};
/**
 * A list item.
 */
$.webos.listItem.prototype = {
	/**
	 * Options:
	 *  - _Array_ `columns`: the list's columns
	 */
	options: {
		columns: [],
		active: false
	},
	_name: 'list-item',
	_create: function() {
		this._super('_create');

		if (!(this.options.columns instanceof Array)) {
			this.options.columns = [this.options.columns];
		}

		for (var i = 0; i < this.options.columns.length; i++) {
			this.addColumn(this.options.columns[i]);
		}
		
		var that = this;
		
		this.options._content.mousedown(function(e) {
			if ($.webos.keyboard.pressed('shift')) {
				var list = that.parentList();
				var thisIndex = that.element.index(),
					selection = list.list('selection'),
					firstSelectionIndex = selection.first().index(),
					lastSelectionIndex = selection.last().index();

				var range = [that.element.index()];
				if (thisIndex < firstSelectionIndex) {
					range.push(firstSelectionIndex);
				} else if (thisIndex > lastSelectionIndex) {
					range.push(lastSelectionIndex);
				} else {
					range.push(firstSelectionIndex);
				}

				list.list('selection', range[0]+'-'+range[1]);

				e.preventDefault();
			} else {
				that.active(true, !$.webos.keyboard.pressed('ctrl'));
			}
		});
		
		this.active(this.options.active);
	},
	/**
	 * Add a new column.
	 * @param {String} [value] The new column's content.
	 * @return {jQuery} The new column.
	 */
	addColumn: function(value) {
		var column = $('<td></td>');
		if (typeof value != 'undefined') {
			column.html(value);
		}
		this.content().append(column);
		return column;
	},
	/**
	 * Get/set a column.
	 * @param  {Number} id      The column id.
	 * @param  {String} [content] The column's content.
	 * @return {jQuery} The column.
	 */
	column: function(id, content) {
		var column;
		if (typeof id == 'undefined') {
			column = this.addColumn();
		} else {
			column = $(this.content().children('td')[id]);
			if (column.length == 0) {
				column = this.addColumn();
			}
		}
		
		if (typeof content != 'undefined') {
			column.html(content);
		}
		
		return column;
	},
	/**
	 * Get/set this item active value.
	 * @param  {Boolean} value          True to set this item active, false to set it inactive.
	 * @param  {Boolean} unactiveOthers Unactive all other items.
	 * @return {Boolean}                True if this item is active, false otherwise.
	 */
	active: function(value, unactiveOthers) {
		if (typeof value == 'undefined') {
			return (this.options.active) ? true : false;
		} else {
			if (value) {
				if (unactiveOthers || !this.parentList().list('option', 'multipleSelection')) {
					this.parentList().list('items').filter('.active').listItem('active', false);
				}
				this.options._content.addClass('active').trigger('select');

				this._trigger('select');
			} else {
				this.options._content.removeClass('active').trigger('unselect');

				this._trigger('unselect');
			}
		}
	},
	/**
	 * Get this item's parent list.
	 * @return {jQuery} The list.
	 */
	parentList: function() {
		return this.options._content.parents('table').first().parent();
	},
	_update: function(key, value) {
		switch(key) {
			case 'active':
			case 'selected':
				this.active(value);
				break;
		}
	}
};
$.webos.widget('listItem', 'container');

/**
 * An icons list.
 * @constructor
 * @augments $.webos.container
 */
$.webos.iconsList = function() {
	return $('<ul></ul>').iconsList();
};
/**
 * An icons list.
 */
$.webos.iconsList.prototype ={
	_name: 'iconslist'
};
$.webos.widget('iconsList', 'container');

/**
 * An icons list item.
 * @param  {String} icon  The icon's name.
 * @param  {String} title The item's title.
 * @constructor
 * @augments $.webos.container
 */
$.webos.iconsListItem = function(icon, title) {
	return $('<li></li>').iconsListItem({
		icon: icon,
		title: title
	});
};
/**
 * An icons list item.
 */
$.webos.iconsListItem.prototype = {
	/**
	 * Options:
	 *  - `icon`: the icon's name
	 *  - `title`: the item's title
	 *  - `active`: true if this item is active
	 */
	options: {
		icon: '',
		title: '',
		active: false
	},
	_name: 'iconslistitem',
	_create: function() {
		this._super('_create');

		this.options._components.icon = $.w.icon().appendTo(this.element);
		this.options._components.title = $('<span></span>').appendTo(this.element);

		var that = this;

		this.element.mousedown(function() {
			that.active(true);
		});

		this._setIcon(this.options.icon);
		this._setTitle(this.options.title);
		this.active(this.options.active);
	},
	/**
	 * @private
	 */
	_setIcon: function(icon) {
		if (typeof icon == 'undefined') {
			return this.options.icon;
		} else {
			this.options._components.icon.icon('option', 'src', icon);
		}
	},
	/**
	 * @private
	 */
	_setTitle: function(title) {
		if (typeof title == 'undefined') {
			return this.options.title;
		} else {
			if (title == '') {
				this.element.children('br').remove();
			} else {
				$('<br />').insertBefore(this.options._components.title);
			}
			this.options._components.title.html(title);
		}
	},
	/**
	 * Get/set this item active value.
	 * @param  {Boolean} value          True to set this item active, false to set it inactive.
	 * @param  {Boolean} unactiveOthers Unactive all other items.
	 * @return {Boolean}                True if this item is active, false otherwise.
	 */
	active: function(value) {
		if (typeof value == 'undefined') {
			return (this.options.active) ? true : false;
		} else {
			if (value) {
				this.element.parent().children('.active').iconsListItem('active', false);
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
			case 'title':
				this._setTitle(value);
				break;
			case 'active':
				this.active(value);
				break;
		}
	}
};
$.webos.widget('iconsListItem', 'container');

/**
 * An icons list header.
 * @param {String} title The header's title.
 * @constructor
 * @augments $.webos.container
 */
$.webos.iconsListHeader = function(title) {
	return $('<li></li>').iconsListHeader({
		title: title
	});
};
/**
 * An icons list header.
 */
$.webos.iconsListHeader.prototype = {
	/**
	 * Options:
	 *  - `title`: the header's title
	 */
	options: {
		title: ''
	},
	_name: 'iconslistheader',
	_create: function() {
		this._super('_create');
		
		this.options._components.title = $('<span></span>', { 'class': 'title' }).appendTo(this.element);

		this.option('title', this.options.title);
	},
	_update: function(key, value) {
		switch(key) {
			case 'title':
				this.options._components.title.html(value);
				break;
		}
	}
};
$.webos.widget('iconsListHeader', 'container');

/**
 * A spoiler.
 * @param  {String} label The spoiler label.
 * @constructor
 * @augments $.webos.container
 */
$.webos.spoiler = function(label) {
	return $('<div></div>').spoiler({
		label: label
	});
};
/**
 * A spoiler.
 */
$.webos.spoiler.prototype = {
	_name: 'spoiler',
	/**
	 * Options:
	 *  - `label`: the spoiler label
	 *  - `shown`: true to show the spoiler's content, false otherwise
	 */
	options: {
		label: 'Plus',
		shown: false
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._components.label = $('<div></div>')
			.addClass('label')
			.html(this.options.label)
			.click(function() {
				that.toggle();
			})
			.appendTo(this.element);
		
		this.options._components.arrow = $('<span></span>')
			.addClass('arrow')
			.prependTo(this.options._components.label);
		
		this.options._content = $('<div></div>').addClass('content').appendTo(this.element);
		
		if (!this.options.shown) {
			this.content().hide();
		}
	},
	/**
	 * Show this spoiler's content.
	 */
	show: function() {
		this.content().slideDown();
		this.element.addClass('shown');
		this.options.shown = true;
		this._trigger('show');
	},
	/**
	 * Hide this spoiler's content.
	 */
	hide: function() {
		this.content().slideUp();
		this.element.removeClass('shown');
		this.options.shown = false;
		this._trigger('hide');
	},
	/**
	 * Toggle this spoiler (show if hidden, hide if shown).
	 */
	toggle: function() {
		if (this.options.shown) {
			this.hide();
		} else {
			this.show();
		}
	},
	_update: function(key, value) {
		switch(key) {
			case 'label':
				this.options._components.label.html(value);
				this.options._components.arrow = $('<span></span>')
					.addClass('arrow')
					.prependTo(this.options._components.label);
				break;
			case 'shown':
				if (value) {
					this.show();
				} else {
					this.hide();
				}
				break;
		}
	}
};
$.webos.widget('spoiler', 'container');

/**
 * An entry container (a form).
 * @constructor
 * @augments $.webos.container
 */
$.webos.entryContainer = function() {
	return $('<form></form>').entryContainer();
};
/**
 * An entry container.
 */
$.webos.entryContainer.prototype = {
	_name: 'entry-container',
	_create: function() {
		this._super('_create');
		
		this.element.submit(function(event) {
			event.preventDefault();
		});
		$('<input />', { type: 'submit', 'class': 'fake-submit' }).appendTo(this.content());
	}
};
$.webos.widget('entryContainer', 'container');

/**
 * An entry.
 * @constructor
 * @augments $.webos.container
 */
$.webos.entry = function () {};
/**
 * An entry.
 */
$.webos.entry.prototype = {
	/**
	 * Options:
	 *  - `label`: the entry label
	 *  - `value`: the entry default value
	 *  - `disabled`: true to disable the entry, false otherwise
	 */
	options: {
		label: '',
		value: '',
		disabled: false
	},
	_name: 'entry',
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._components.label = $('<label></label>')
			.html(this.options.label)
			.click(function() {
				that.options._content.focus();
			});
		this.element.append(this.options._components.label);
		
		this.element.bind('change', function() {
			that._trigger('change', { type: 'change' }, { entry: that.element, value: that.value() });
		});
	},
	/**
	 * Get/set this entry value.
	 * @param  {String} [value] The new value.
	 * @return {String}         The entry value.
	 */
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.content().val();
		} else if (this.value() != value) {
			this.content().val(value);
		}
	},
	/**
	 * Enable/disable this entry.
	 * @deprecated Use option `disabled` instead.
	 */
	disabled: function(value) {
		if (typeof value == 'undefined') {
			return this.content().prop('disabled');
		} else {
			this.options.disabled = (value) ? true : false;
			this.content().prop('disabled', this.options.disabled);
			if (this.options.disabled) {
				this.element.addClass('disabled');
			} else {
				this.element.removeClass('disabled');
			}
		}
	},
	/**
	 * Get this entry label container.
	 * @return {jQuery} The label container.
	 */
	label: function() {
		return this.options._components.label;
	},
	/**
	 * Get this entry input.
	 * @return {jQuery} The input.
	 */
	input: function() {
		return this.content();
	},
	_update: function(key, value) {
		switch(key) {
			case 'label':
				this.options._components.label.html(value);
				break;
			case 'disabled':
				this.disabled(value);
				break;
			case 'value':
				this.value(value);
				break;
		}
	}
};
$.webos.widget('entry', 'container');

/**
 * A checkable entry.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.checkableEntry = function () {};
/**
 * A checkable entry.
 */
$.webos.checkableEntry.prototype = {
	/**
	 * Options:
	 *  - `autoCheck`: true to auto check the entry's value as the user types
	 *  - `check`: a callback which takes the entry's value as argument and returns true if this value is valid, false otherwise
	 */
	options: {
		autoCheck: true,
		check: null
	},
	_name: 'checkable-entry',
	_create: function() {
		this._super('_create');
		
		this.option('autoCheck', this.options.autoCheck);
	},
	_update: function(key, value) {
		this._super(key, value);

		switch(key) {
			case 'autoCheck':
				if (value) {
					var that = this;
					this.input().bind('keyup.checkableentry.widget.webos focusout.checkableentry.widget.webos', function() {
						that.check();
					});
				} else {
					this.input().unbind('keyup.checkableentry.widget.webos focusout.checkableentry.widget.webos');
				}
				break;
		}
	},
	/**
	 * Check if the entry's value is valid.
	 * @return {Boolean} True if the value is valid, false otherwise.
	 */
	isValid: function() {
		if (typeof this.options.check == 'function') {
			return (this.options.check(this.value())) ? true : false;
		}
		
		return true;
	},
	/**
	 * Check if the entry's value is valid. If not, set this entry as invalid.
	 * @return {Boolean} True if the value is valid, false otherwise.
	 */
	check: function() {
		var message = null, valid = true;
		if (typeof this.options.check == 'function') {
			var result = this.options.check(this.value());
			message = (String(result)) ? String(result) : null;
			valid = (result === true) ? true : false;
		}
		
		if (!valid) {
			this.element.addClass('error');
		} else {
			this.element.removeClass('error');
		}
		
		this._trigger('check', { type: 'check' }, { valid: valid, message: message });
		
		return valid;
	}
};
$.webos.widget('checkableEntry', 'entry');

//TODO: implement $.webos.stringEntry with placeholder support. Maybe on $.webos.checkableEntry ?

/**
 * A text entry.
 * @param  {String} label The entry label.
 * @param  {String} value The entry default value.
 * @constructor
 * @augments $.webos.checkableEntry
 */
$.webos.textEntry = function(label, value) {
	return $('<div></div>').textEntry({
		label: label,
		value: value
	});
};
/**
 * A text entry.
 */
$.webos.textEntry.prototype = {
	_name: 'text-entry',
	_create: function() {
		this._super('_create');

		this.options._content = $('<input />', { type: 'text' });
		this.element.append(this.options._content);

		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	}
};
$.webos.widget('textEntry', 'checkableEntry');

/**
 * A captcha.
 * @constructor
 * @augments $.webos.container
 */
$.webos.captchaEntry = function() {
	return $('<div></div>').captchaEntry();
};
/**
 * A captcha.
 */
$.webos.captchaEntry.prototype = {
	_name: 'captcha-entry',
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._components.label = $.webos.label().appendTo(this.element);
		this.options._components.input = $.webos.textEntry().textEntry('option', 'check', function(value) {
			return that.isValid();
		}).hide().appendTo(this.element);
		this.options._components.reload = $.w.button('Recharger').click(function() {
			that.loadCaptcha();
		}).appendTo(this.options._components.input);
		
		this.loadCaptcha();
	},
	/**
	 * Load this captcha.
	 */
	loadCaptcha: function() {
		var that = this;

		this.options._components.label.html('Chargement...');
		this.options._components.reload.button('option', 'disabled', true);

		if (that.options._content.is('img')) {
			that.options._content.remove();
		}

		new W.ServerCall({
			'class': 'CaptchaController',
			method: 'get'
		}).load([function(response) {
			var data = response.getData();
			that.options._captchaId = data.id;
			switch (data.type) {
				case 1:
					that.options._components.input.textEntry('option', 'label', data.captcha);
					break;
				case 2:
					that.options._content = $('<img />', { src: 'data:image/png;base64,'+data.captcha, alt: 'captcha' }).insertAfter(that.options._components.label);
					that.options._components.input.textEntry('option', 'label', 'Veuillez recopier le texte de l\'image ci-dessus : ');
					break;
			}
			that.options._components.label.hide();
			that.options._components.input.show();
			that.options._components.reload.button('option', 'disabled', false);
		}, function(response) {
			that.options._components.label.html('Une erreur est survenue.');
			that.options._components.reload.button('option', 'disabled', false);
		}]);
	},
	/**
	 * Get this captcha id.
	 * @return {Number} The captcha id.
	 */
	captchaId: function() {
		return this.options._captchaId;
	},
	isValid: function() {
		return (this.options._components.input.textEntry('value').length > 0);
	},
	check: function() {
		return this.options._components.input.textEntry('check');
	},
	/**
	 * Get this captcha value.
	 * @return {String} The captcha value.
	 */
	value: function() {
		return this.options._components.input.textEntry('value');
	}
};
$.webos.widget('captchaEntry', 'container');

/**
 * A search entry.
 * @param  {String} label The entry label.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.searchEntry = function(label) {
	return $('<div></div>').searchEntry({
		label: label
	});
};
/**
 * A search entry.
 */
$.webos.searchEntry.prototype = {
	_name: 'search-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'text' });
		this.element.append(this.options._content);

		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	}
};
$.webos.widget('searchEntry', 'entry');

/**
 * A password entry.
 * @param  {String} label The entry label.
 * @constructor
 * @augments $.webos.checkableEntry
 */
$.webos.passwordEntry = function(label) {
	return $('<div></div>').passwordEntry({
		label: label
	});
};
/**
 * A password entry.
 */
$.webos.passwordEntry.prototype = {
	_name: 'password-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'password' });
		this.element.append(this.options._content);

		this.option('disabled', this.options.disabled);
	}
};
$.webos.widget('passwordEntry', 'checkableEntry');

/**
 * A number entry.
 * @param  {String} label The entry label.
 * @param  {Number} value The entry value.
 * @param  {Number} min   The minimum value.
 * @param  {Number} max   The maximum value.
 * @constructor
 * @augments $.webos.checkableEntry
 */
$.webos.numberEntry = function(label, value, min, max) {
	return $('<div></div>').numberEntry({
		label: label,
		value: value,
		min: min,
		max: max
	});
};
/**
 * A number entry.
 */
$.webos.numberEntry.prototype = {
	_name: 'number-entry',
	/**
	 * Options:
	 *  - `min`: the minimum value
	 *  - `max`: the maximum value
	 *  - `step`: the step
	 */
	options: {
		min: null,
		max: null,
		step: null
	},
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'number' });
		this.element.append(this.options._content);
		
		this.option('min', this.options.min);
		this.option('max', this.options.max);
		this.option('step', this.options.step);

		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	},
	value: function(value) {
		if (typeof value == 'undefined') {
			return parseInt(this.content().val());
		} else if (this.value() != value) {
			this.content().val(value);
		}
	},
	_update: function(key, value) {
		this._super(key, value);

		switch (key) {
			case 'min':
			case 'max':
			case 'step':
				if (!value && value !== 0) {
					this.options[key] = null;
					this.input().removeAttr(key);
				} else {
					value = parseInt(value);
					this.options[key] = value;
					this.input().attr(key, value);
				}
				break;
		}
	}
};
$.webos.widget('numberEntry', 'checkableEntry');

/**
 * An e-mail entry.
 * @param  {String} label The entry label.
 * @param  {String} value The entry default value.
 * @constructor
 * @augments $.webos.checkableEntry
 */
$.webos.emailEntry = function(label, value) {
	return $('<div></div>').emailEntry({
		label: label,
		value: value
	});
};
/**
 * An e-mail entry.
 */
$.webos.emailEntry.prototype = {
	_name: 'email-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'email' });
		this.element.append(this.options._content);

		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	}
};
$.webos.widget('emailEntry', 'checkableEntry');

/**
 * A multi-line text entry.
 * @param  {String} label The entry label.
 * @constructor
 * @augments $.webos.checkableEntry
 */
$.webos.textAreaEntry = function(label) {
	return $('<div></div>').textAreaEntry({
		label: label
	});
};
/**
 * A multi-line text entry.
 */
$.webos.textAreaEntry.prototype = {
	_name: 'textarea-entry',
	_create: function() {
		var that = this;

		this._super('_create');
		
		this.options._components.br = $('<br />').appendTo(this.element);
		this.options._content = $('<textarea></textarea>').appendTo(this.element);
		
		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
		this.option('label', this.options.label);
	},
	_update: function(key, value) {
		this._super(key, value);

		switch (key) {
			case 'label':
				this.options._components.br.toggle((value) ? true : false);
		}
	}
};
$.webos.widget('textAreaEntry', 'checkableEntry');

/**
 * A checkbox.
 * @param  {String} label The entry label.
 * @param  {Boolean} value The entry value.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.checkButton = function(label, value) {
	return $('<div></div>').checkButton({
		label: label,
		value: value
	});
};
/**
 * A checkbox.
 */
$.webos.checkButton.prototype = {
	_name: 'checkbutton',
	options: {
		value: false
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._content = $('<input />', { type: 'checkbox' }).change(function() {
			that.options.value = that.value();
		});
		this.element.prepend(this.content());
		
		this.value(this.options.value);
		this.option('disabled', this.options.disabled);

		this.label().click(function () { //Toggle the checkbox
			if (that.options.disabled) {
				return;
			}

			that.option('value', !that.options.value);
		});
	},
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.content().prop('checked');
		} else {
			this.options.value = (value) ? true : false;
			
			if (this.value() == value) {
				return;
			}
			
			this.content().prop('checked', this.options.value);
		}
	}
};
$.webos.widget('checkButton', 'entry');

/**
 * A radio button container.
 * @constructor
 * @augments $.webos.container
 */
$.webos.radioButtonContainer = function() {
	return $('<div></div>').radioButtonContainer();
};
/**
 * A radio button container.
 */
$.webos.radioButtonContainer.prototype = {
	_name: 'radiobutton-container'
}
$.webos.widget('radioButtonContainer', 'container');

/**
 * A radio button.
 * @param  {String} label The entry label.
 * @param  {Boolean} value The entry value.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.radioButton = function(label, value) {
	return $('<div></div>').radioButton({
		label: label,
		value: value
	});
};
/**
 * A radio button.
 */
$.webos.radioButton.prototype = {
	_name: 'radiobutton',
	options: {
		value: false
	},
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'radio' }).change(function() {
			$(this).parents('.webos-radiobutton-container').first().find(':checked').not(this).prop('checked', false);
		});
		
		this.element.prepend(this.options._content);
		this.value(this.options.value);
		this.option('disabled', this.options.disabled);

		this.label().click(function () { //Toggle the checkbox
			if (that.options.disabled) {
				return;
			}

			that.option('value', !that.options.value);
		});
	},
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.content().prop('checked');
		} else {
			this.options.value = (value) ? true : false;
			this.content().prop('checked', this.options.value);
		}
	}
};
$.webos.widget('radioButton', 'entry');

/**
 * A combo list.
 * @param  {String} label   The entry label.
 * @param  {Object} choices An object containing values associated with their label.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.selectButton = function(label, choices) {
	return $('<div></div>').selectButton({
		label: label,
		choices: choices
	});
};
/**
 * A combo list.
 */
$.webos.selectButton.prototype = {
	/**
	 * Options:
	 *  - _Object_ `choices`: an object containing values associated with their label
	 */
	options: {
		choices: {}
	},
	_name: 'selectbutton',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<select></select>').appendTo(this.element);
		this._setChoices(this.options.choices);

		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	},
	_setChoices: function(choices) {
		this.content().empty();
		for (var index in choices) {
			$('<option></option>', { value: index })
				.html(choices[index])
				.appendTo(this.content());
		}
	},
	value: function(choice) {
		if (typeof choice == 'undefined') {
			var selected = this.options._content.children('option:selected');
			if (selected.length == 1) {
				return selected.attr('value');
			} else {
				return;
			}
		} else {
			this.options._content.children('option[value="'+choice+'"]').attr('selected', 'selected');
		}
	},
	_update: function(key, value) {
		this._super(key, value);

		switch(key) {
			case 'choices':
				this._setChoices(value);
				break;
		}
	}
};
$.webos.widget('selectButton', 'entry');

/**
 * A switch.
 * @param  {String} label The entry label.
 * @param  {Boolean} value The entry value.
 * @constructor
 * @augments $.webos.entry
 */
$.webos.switchButton = function(label, value) {
	return $('<div></div>').switchButton({
		label: label,
		value: value
	});
};
/**
 * A switch.
 */
$.webos.switchButton.prototype = {
	options: {
		value: false
	},
	_name: 'switchbutton',
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._content = $('<div></div>', { 'class': 'entry off' }).click(function() {
			if (!that.options.disabled) {
				that._toggle();
			}
		}).prependTo(this.element);
		this.options._components.labels = $('<div></div>', { 'class': 'labels' }).appendTo(this.options._content);
		this.options._components.on = $('<div></div>', { 'class': 'label-on' }).html('I').appendTo(this.options._components.labels);
		this.options._components.off = $('<div></div>', { 'class': 'label-off' }).html('O').appendTo(this.options._components.labels);
		this.options._components.slider = $('<div></div>', { 'class': 'slider' }).appendTo(this.options._content);
		this.options._components.slider.ui_draggable({
			containment: 'parent',
			axis: 'x',
			stop: function(event, ui) {
				var ratio = (ui.position.left + that.options._components.slider.outerWidth() / 2) / that.options._content.innerWidth();
				if (ratio > 0.5) {
					that._value(true);
				} else {
					that._value(false);
				}
			}
		});
		
		this.value(this.options.value);
		this.option('disabled', this.options.disabled);
	},
	_value: function(choice) {
		choice = (choice) ? true : false;
		var changed = (choice != this.options.value);
		this.value(choice);
		if (changed) {
			this._trigger('change', { type: 'change' }, { entry: this.element, value: choice });
		}
	},
	value: function(choice) {
		if (typeof choice == 'undefined') {
			return this.options.value;
		} else {
			choice = (choice) ? true : false;
			
			if (choice) {
				this.options._content.removeClass('off').addClass('on');
				if (this.element.closest('html').length && this.element.is(':visible')) {
					this.options._components.slider.animate({
						left: this.options._content.innerWidth() - this.options._components.slider.outerWidth()
					}, 'fast');
				} else {
					this.options._components.slider.css('left', '36px');
				}
			} else {
				this.options._content.removeClass('on').addClass('off');
				if (this.element.closest('html').length && this.element.is(':visible')) {
					this.options._components.slider.animate({
						left: 0
					}, 'fast');
				} else {
					this.options._components.slider.css('left', '0px');
				}
			}
			
			if (choice != this.options.value) {
				this.options.value = choice;
			}
		}
	},
	/**
	 * Toggle this switch.
	 */
	toggle: function() {
		this.value(!this.value());
	},
	/**
	 * Toggle this switch value, without updating the element.
	 * @private
	 */
	_toggle: function() {
		this._value(!this.value());
	},
	disabled: function(value) {
		if (typeof value == 'undefined') {
			return this.options.disabled;
		} else {
			this.options.disabled = (value) ? true : false;
			
			if (this.options.disabled) {
				this.options._components.slider.ui_draggable('disable');
			} else {
				this.options._components.slider.ui_draggable('enable');
			}
		}
	}
};
$.webos.widget('switchButton', 'entry');

/**
 * A menu.
 * @constructor
 * @augments $.webos.container
 */
$.webos.menu = function() {};
/**
 * A menu.
 */
$.webos.menu.prototype = {
	_name: 'menu'
};
$.webos.widget('menu', 'container');


/**
 * A menu item.
 * @param  {String} label     The item label.
 * @param  {Boolean} separator True to show a separator on the top of this item.
 * @constructor
 * @augments $.webos.container
 */
$.webos.menuItem = function(label, separator) {
	return $('<li></li>').menuItem({
		label: label,
		separator: separator
	});
};
/**
 * A menu item.
 */
$.webos.menuItem.prototype = {
	_name: 'menuitem',
	/**
	 * Options:
	 *  - `label`: the item label
	 *  - _Boolean_ `disabled`: true if this item is disabled
	 *  - _Boolean_ `separator`: true to show a separator on the top of this item
	 * @type {Object}
	 */
	options: {
		label: '',
		disabled: false,
		separator: false
	},
	_create: function() {
		this._super('_create');
		
		var that = this;

		var submenu = this.element.children().detach();
		this.element.empty();
		
		this.options._components.label = $('<a></a>', { href: '#' }).html(this.options.label).appendTo(this.element);
		this.options._content = $('<ul></ul>').appendTo(this.element).append(submenu);
		this.element.bind('click mouseenter', function(e) {
			if (that.options.disabled && e.type == 'click') {
				return false;
			}
			
			var $menu = that.element, $menuContents = that.content();
			
			if ($menu.is('.hover')) {
				return;
			}
			
			if (e.type == 'mouseenter' && $menu.parents('.webos-menuitem').length == 0) {
				return;
			}
			
			if ($menuContents.children().length > 0) {
				$menuContents.show();
			} else if (e.type == 'click') {
				$menu.removeClass('hover');
				$menu.parents('.webos-menuitem ul .webos-menuitem').hide();
				return;
			}
			
			$menu.addClass('hover');
			
			var onDocClickFn = function(e) {
				//Si on clique sur le menu
				if ($(e.target).parents().filter($menu).length > 0) {
					if ($(e.target).parents().filter('.webos-menuitem').first().children('ul').children().length > 0) {
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
		}).bind('mouseleave', function() {
			var $menu = that.element, $menuContents = that.content();
			
			if ($menu.parents('.webos-menuitem').length == 0) {
				return;
			}
			
			$menu.removeClass('hover');
			$menuContents.hide();
		});
		
		this.options._components.label.bind('click', function(e) {
			e.preventDefault(); //On n'execute pas l'action par defaut pour ne pas changer de page
		});
		
		this.option('disabled', this.options.disabled);
		this.option('separator', this.options.separator);
	},
	_update: function(key, value) {
		switch (key) {
			case 'label':
				this.options._components.label.html(value);
				break;
			case 'disabled':
				value = (value) ? true : false;
				this.options.disabled = value;
				this.element.toggleClass('disabled', value);
				break;
			case 'separator':
				value = (value) ? true : false;
				this.options.separator = value;
				this.element.toggleClass('separator', value);
				break;
		}
	},
};
$.webos.widget('menuItem', 'container');

/**
 * A tab bar.
 * @param  {Object} tabs An object associating the tab title and its contents.
 * @constructor
 * @augments $.webos.container
 */
$.webos.tabs = function(tabs) {
	return $('<div></div>').tabs().tabs('setTabs', tabs);
};
/**
 * A tab bar.
 */
$.webos.tabs.prototype = {
	_name: 'tabs',
	/**
	 * Options:
	 *  - - _Number_ `selectedTab`: the selected tab index
	 */
	options: {
		selectedTab: null
	},
	_create: function() {
		this._super('_create');

		var that = this;

		var activeTab = 0;
		if (this.element.children('ul').length) {
			this.options._components.tabs = this.element.children('ul').addClass('tabs');
			
			var $tabsTitles = this.options._components.tabs.children();
			$tabsTitles.addClass('tab-btn');
			if ($tabsTitles.filter('.active').length) {
				activeTab = $tabsTitles.filter('.active').index();
			}
		} else {
			this.options._components.tabs = $('<ul></ul>', { 'class': 'tabs' }).prependTo(this.element);
		}
		if (this.element.children('.contents').length) {
			this.options._components.content = this.element.children('.contents');

			this.option('selectedTab', activeTab);
		} else {
			this.options._components.content = $('<div></div>', { 'class': 'contents' }).appendTo(this.element);
		}

		this.options._components.tabs.on('click', 'li.tab-btn', function(e) {
			that.option('selectedTab', $(this).index('li.tab-btn'));
		});
	},
	/**
	 * Get/set a tab.
	 * @param  {String|Number} arg0 The tab title or the tab index.
	 * @param  {String} arg1 The new tab contents or, if `arg0` is an index, the new tab title.
	 * @param  {String} arg2 The new tab contents, if `arg1` is the new tab title.
	 * @return {jQuery}      The tab contents container.
	 */
	tab: function(arg0, arg1, arg2) {
		var index, title, contents;

		if (typeof arg0 == 'undefined') {
			index = 0;
		} else if (typeof arg1 == 'undefined' && typeof arg0 == 'string') {
			title = arg0;
		} else if (typeof arg1 == 'undefined') {
			index = arg0;
		} else if (typeof arg2 == 'undefined' && typeof arg0 == 'string') {
			title = arg0;
			contents = arg1;
		} else if (typeof arg2 == 'undefined') {
			index = arg0;
			contents = arg1;
		} else {
			index = arg0;
			title = arg1;
			contents = arg2;
		}

		var tabTitle = $(),
			tabContents = $(),
			tabsTitles = this.options._components.tabs.children('li.tab-btn'),
			isNewTab = false;
		if (typeof index == 'undefined' || !tabsTitles[index]) {
			tabTitle = $('<li></li>', { 'class': 'tab-btn' }).appendTo(this.options._components.tabs);
			tabContents = $('<div></div>').appendTo(this.options._components.content);
			
			if (this.options.selectedTab === null) {
				this.options.selectedTab = 0;
				tabTitle.addClass('active');
				tabContents.addClass('active');
			}

			isNewTab = true;
		} else {
			tabTitle = $(tabsTitles[index]);
			tabContents = $(this.options._components.content.children('div')[index]);
		}

		if (typeof title != 'undefined' && title !== null) {
			tabTitle.html(title);
		}

		if (typeof contents != 'undefined' && contents !== null) {
			tabContents.html(contents);
		}

		if (isNewTab) {
			this._trigger('tabadd', { type: 'tabadd' }, { content: tabContents, index: index });
		}

		return tabContents;
	},
	removeTab: function (index) {
		var $tabTitle = $(this.options._components.tabs.children('li.tab-btn')[index]);
			$tabContents = $(this.options._components.content.children('div')[index]);

		$tabTitle.remove();
		$tabContents.detach();

		this._trigger('tabremove', { type: 'tabremove' }, { content: $tabContents, index: index });

		this._update('selectedTab', 0);
	},
	tabIndexFromContent: function (ctn) {
		var $ctn = this.options._components.content.children().filter(ctn);

		if (!$ctn.length) {
			return false;
		}

		return $ctn.index();
	},
	countTabs: function () {
		return this.options._components.content.children().length;
	},
	/**
	 * Create some tabs.
	 * @param {Object} tabs An object associating the tab title and its contents.
	 */
	setTabs: function(tabs) {
		var i = 0;
		for (var title in tabs) {
			this.tab(i, title, tabs[title]);
			i++;
		}
	},
	_update: function(key, value) {
		switch (key) {
			case 'selectedTab':
				if (typeof value != 'number') {
					value = this.tabIndexFromContent(value);
				}

				var index = parseInt(value);
				if (isNaN(index)) {
					index = 0;
				}

				var $tabTitles = this.options._components.tabs.children('li.tab-btn');
				if (!$tabTitles[index]) {
					return;
				}
				
				$tabTitles.filter('.active').removeClass('active');
				this.options._components.content.children('div.active').removeClass('active');
				
				$($tabTitles[index]).addClass('active');
				this.tab(index).addClass('active');

				this._trigger('select', { type: 'select' }, {
					content: this.tab(index),
					index: index
				});
				break;
		}
	}
};
$.webos.widget('tabs', 'container');

/**
 * A notebook.
 * Notebooks are a type of widget that allow showing one of multiple pages in an app, also colloquially referred to as "tab bars".
 * @param  {Object} tabs An object associating the tab title and its contents.
 * @constructor
 * @augments $.webos.tabs
 */
$.webos.notebook = function(tabs) {
	return $('<div></div>').notebook().notebook('setTabs', tabs);
};
/**
 * A notebook.
 */
$.webos.notebook.prototype = {
	_name: 'notebook'
};
$.webos.widget('notebook', 'tabs');

/**
 * A dynamic notebook.
 * @param  {Object} tabs An object associating the tab title and its contents.
 * @constructor
 * @augments $.webos.notebook
 */
$.webos.dynamicNotebook = function(tabs) {
	return $('<div></div>').dynamicNotebook().dynamicNotebook('setTabs', tabs);
};
/**
 * A notebook.
 */
$.webos.dynamicNotebook.prototype = {
	_create: function() {
		this._super('_create');

		var that = this;

		var $newTabBtn = $('<li></li>', { 'class': 'tab-btn-newtab' }).html('+').click(function () {
			that._trigger('newtab');
		});
		this.options._components.tabs.append($newTabBtn);
	},
	tab: function(arg0, arg1, arg2) {
		var that = this;

		var $tabCtn = this._super(arg0, arg1, arg2);

		var index = $tabCtn.index(),
			$tabTitle = $(this.options._components.tabs.children('li.tab-btn')[index]);
		
		if (!$tabTitle.children('.tab-btn-close').length) {
			$closeBtn = $('<span></span>', { 'class': 'tab-btn-close' }).html('&times;').click(function () {
				that.removeTab($tabCtn.index()); //Index can be modified
			});
			$tabTitle.prepend($closeBtn);
		}

		return $tabCtn;
	}
};
$.webos.widget('dynamicNotebook', 'notebook');

/**
 * A popover.
 * @param  {jQuery} toggle  The element which will toggle the popover.
 * @param  {jQuery} content The popover content.
 * @constructor
 * @augments $.webos.container
 */
$.webos.popover = function(toggle, content) {
	var $popover = $('<div></div>').popover();
	$popover.popover('component', 'toggle').html(toggle || '');
	$popover.popover('content').html(content || '');

	return $popover;
};
/**
 * A popover.
 * @type {Object}
 */
$.webos.popover.prototype = {
	_name: 'popover',
	/**
	 * Options:
	 *  - `trigger`: the event which will toggle the popover
	 */
	options: {
		trigger: 'click'
	},
	_create: function () {
		this._super('_create');

		var popoverToggle = this.element.children('.popover-toggle');
		if (!popoverToggle.length) {
			popoverToggle = $('<div></div>', { 'class': 'popover-toggle' }).prependTo(this.element);
		}
		this.options._components.toggle = popoverToggle;

		var popoverContent = this.element.children('.popover-content');
		if (!popoverContent.length) {
			popoverContent = $('<div></div>', { 'class': 'popover-content' }).appendTo(this.element);
		}
		this.options._components.content = popoverContent;

		this._update('trigger', this.options.trigger);
	},
	/**
	 * Show the popover.
	 */
	show: function () {
		this.options._components.content.stop().fadeIn('fast');
	},
	/**
	 * Hide the popover.
	 */
	hide: function () {
		this.options._components.content.stop().fadeOut('fast');
	},
	/**
	 * Toggle the popover (show/hide).
	 */
	toggle: function () {
		this.options._components.content.stop().fadeToggle('fast');
	},
	_update: function(key, value) {
		var that = this;

		switch (key) {
			case 'trigger':
				value = String(value);

				this.options._components.toggle.off('.toggle.popover.gtk').on(value+'.toggle.popover.gtk', function () {
					that.toggle();
				});
				this.options.trigger = value;
				break;
		}
	}
};
$.webos.widget('popover', 'container');

/**
 * An alert.
 * @param  {jQuery} content The alert content.
 * @constructor
 * @augments $.webos.container
 */
$.webos.alertContainer = function(content) {
	var $alert = $('<div></div>').alertContainer();
	$alert.alertContainer('content').html(content || '');

	return $alert;
};
/**
 * An alert.
 * @type {Object}
 */
$.webos.alertContainer.prototype = {
	_name: 'alert-container'
};
$.webos.widget('alertContainer', 'container');

/**
 * A color picker.
 * @param  {string} defaultColor The default color.
 * @constructor
 * @augments $.webos.container
 */
$.webos.colorPicker = function(defaultColor) {
	return $('<div></div>').colorPicker({
		color: defaultColor
	});
};
/**
 * A color picker.
 * @type {Object}
 */
$.webos.colorPicker.prototype = {
	_name: 'color-picker',
	_paletteColors: {
		red: ['#E78E89', '#DA4D45', '#AD2A23'],
		orange: ['#F7A575', '#F37329', '#C14E0B'],
		yellow: ['#FDE8AB', '#FBD25D', '#F9BC0F'],
		green: ['#CCDF7B', '#B3CF3B', '#809525'],
		blue: ['#8ECAF2', '#47A8E9', '#1881C8'],
		pink: ['#D997D8', '#C35CC2', '#983897'],
		black: ['#000', '#333', '#666', '#999', '#CCC', '#FFF']
	},
	options: {
		mode: 'palette',
		value: '#000' //Black
	},
	_create: function () {
		var that = this;

		this._super('_create');

		// Palette
		var $palette = $('<div></div>', { 'class': 'picker-palette' }).appendTo(this.element);

		for (var paletteVaration in this._paletteColors) {
			var variationColors = this._paletteColors[paletteVaration];

			var variation = '<ul class="palette-variation palette-variation-'+paletteVaration+'">';
			for (var i = 0; i < variationColors.length; i++) {
				var color = variationColors[i];

				variation += '<li style="background-color: '+color+';" data-color="'+color+'"></li>';
			}
			variation += '</ul>';

			$palette.append(variation);
		}

		$palette.on('click', 'li', function () {
			var newColor = $(this).data('color');

			that.option('value', newColor);

			$(this).addClass('color-picked');

			that._trigger('change', { type: 'change' }, { color: newColor });
		});

		// Custom
		var $custom = $('<div></div>', { 'class': 'picker-custom' }).hide().appendTo(this.element);
		var $colorInput = $('<input />', { type: 'color', value: this.options.value }).change(function (e) {
			e.stopPropagation();

			var newColor = $(this).val();

			that.option('value', newColor);
			that._trigger('change', { type: 'change' }, { color: newColor });
		}).appendTo($custom);
	},
	_update: function(key, value) {
		var that = this;

		switch (key) {
			case 'value':
				value = String(value);

				this.options.value = value;
				this.element.find('input[type="color"]').val(value);
				this.element.find('li.color-picked').removeClass('color-picked');
				break;
			case 'mode':
				var $modeCtn = this.element.children('.picker-'+value);

				if (!$modeCtn.length) {
					return false;
				}

				this.element.children().hide();
				$modeCtn.show();

				if (value == 'custom') {
					$modeCtn.find('input[type="color"]').click();
				}
		}
	},
	supportsColorInput: function () {
		var i = document.createElement("input");
		i.setAttribute("type", "color");
		return (i.type !== "text");
	},
	toggleMode: function () {
		this.option('mode', (this.options.mode == 'palette') ? 'custom' : 'palette');
	}
};
$.webos.widget('colorPicker', 'container');

/**
 * A draggable element.
 * Use the widget `ui_draggable` for jQuery UI's draggable widget.
 * @constructor
 * @augments $.webos.widget
 */
$.webos.draggable = function () {};
/**
 * A draggable element.
 */
$.webos.draggable.prototype = {
	_name: 'draggable',
	/**
	 * Options:
	 *  - `data`: data associated with the draggable element
	 *  - `dataType`: the data type
	 *  - `sourceFile`: the source file
	 *  - _jQuery_ `dragImage`: the image that will be dragged
	 *  - `revert`: do not change the draggable position when dragged
	 *  - `iframeFix`: allow the draggable to be dragged over iframes
	 *  - `distance`: the minimum distance traveled before begining to drag this element
	 */
	options: {
		data: null,
		dataType: null,
		sourceFile: null,
		dragImage: $(),
		revert: true,
		iframeFix: false,
		distance: 5
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.element.bind('mousedown.draggable.widget.webos', function(e) {
			if (e.button == 1 || e.button == 2) {
				return;
			}

			var el, diffX, diffY;
			if (that.options.dragImage && $(that.options.dragImage).length > 0) {
				if ($(that.options.dragImage).closest('html').length == 0) {
					$(that.options.dragImage).appendTo('body');
				}
				
				el = $(that.options.dragImage)[0];
				el.style.position = 'absolute';
				
				var dragImageWidth = $(el).width(), dragImageHeight = $(el).height();
				
				diffX = dragImageWidth / 2;
				diffY = dragImageHeight / 2;
				
				$(el).css({
					left: e.pageX - diffX,
					top: e.pageY - diffY
				}).hide();
			} else {
				el = that.element[0];
				el.style.position = 'relative';
				var actualX = parseInt(that.element.css('left').replace('px', '')), actualY = parseInt(that.element.css('top').replace('px', ''));
				if (isNaN(actualX)) {
					actualX = 0;
				}
				if (isNaN(actualY)) {
					actualY = 0;
				}
				
				diffX = e.pageX - (that.element.parent().offset().left + actualX);
				diffY = e.pageY - (that.element.parent().offset().top + actualY);
			}
			
			var actualZIndex = $(el).css('z-index');

			var traveledDistance = 0, dragStarted = false;
			
			var posX = e.pageX - diffX, posY = e.pageY - diffY;
			
			$(document).bind('mousemove.drag.draggable.widget.webos', function(e) {
				if (!dragStarted) {
					return;
				}

				posX = e.pageX - diffX, posY = e.pageY - diffY;
				
				el.style.left = posX+'px';
				el.style.top = posY+'px';
				
				$.webos.ddmanager.drag(that, e);
				
				e.preventDefault();
			}).on('mousemove.dragstart.draggable.widget.webos', function(e) {
				traveledDistance++;

				if (traveledDistance < that.options.distance) {
					return;
				}

				$(this).off('mousemove.dragstart.draggable.widget.webos');
				traveledDistance = 0;

				if(that._trigger('start', e) === false) {
					$(this).trigger('mouseup');
					return;
				}

				that._dragStart(el, e);
				dragStarted = true;
			}).one('mouseup', function(e) {
				$(this).unbind('mousemove.drag.draggable.widget.webos').unbind('mousemove.dragstart.draggable.widget.webos');
				
				$(el).removeClass('dragging cursor-move').css('z-index', actualZIndex);
				
				if (that.options.dragImage && $(that.options.dragImage).length > 0) {
					$(that.options.dragImage).detach();
				} else if (that.options.revert) {
					$(el).css({
						left: actualX,
						top: actualY
					});
				}

				$.webos.ddmanager.dragStop(that, e);
				that._trigger('stop', e);
				$.webos.ddmanager.drop(that, e);

				e.preventDefault();
			});
			
			$.webos.ddmanager.prepareOffsets(that, e);
			
			e.preventDefault();
		});
	},
	_dragStart: function(el, e) {
		$.webos.ddmanager.current = this;
		
		$.webos.ddmanager.dragStart(this, e);
		
		// Iframe fix
		$(this.options.iframeFix === true ? "iframe" : this.options.iframeFix).each(function() {
			$('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>')
			.css({
				width: this.offsetWidth+"px", height: this.offsetHeight+"px",
				position: "absolute", opacity: "0.001", zIndex: 1000
			})
			.css($(this).offset())
			.appendTo("body");
		});
		
		$(el).css('z-index', 100000).addClass('dragging cursor-move');
		
		if (this.options.dragImage && $(this.options.dragImage).length > 0) {
			$(this.options.dragImage).show();
		}
	}
};
$.webos.widget('draggable', 'widget');
$.widget.bridge('ui_draggable', $.ui.draggable);

/**
 * A droppable element.
 * Use the widget `ui_draggable` for jQuery UI's droppable widget.
 * @constructor
 * @augments $.webos.widget
 */
$.webos.droppable = function () {};
/**
 * A droppable element.
 */
$.webos.droppable.prototype = {
	_name: 'droppable',
	/**
	 * Options:
	 *  - `accept`: the `dataType` accepted for this droppable
	 */
	options: {
		accept: null
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		$.webos.ddmanager.droppables.push(this);
	},
	destroy: function() {
		for (var i = 0; i < $.webos.ddmanager.droppables.length; i++) {
			if ($.webos.ddmanager.droppables[i] == this) {
				$.webos.ddmanager.droppables.splice(i, 1);
			}
		}
	},
	_activate: function(event) {
		var draggable = $.webos.ddmanager.current;
		(draggable && this._trigger('activate', event, { draggable: draggable.element, droppable: this.element }));
	},
	_deactivate: function(event) {
		var draggable = $.webos.ddmanager.current;
		(draggable && this._trigger('deactivate', event, { draggable: draggable.element, droppable: this.element }));
	},
	_over: function(event) {
		var draggable = $.webos.ddmanager.current;
		(draggable && this._trigger('over', event, { draggable: draggable.element, droppable: this.element }));
	},
	_out: function(event) {
		var draggable = $.webos.ddmanager.current;
		(draggable && this._trigger('out', event, { draggable: draggable.element, droppable: this.element }));
	},
	_drop: function(event) {
		var draggable = $.webos.ddmanager.current;
		(draggable && this._trigger('drop', event, { draggable: draggable.element, droppable: this.element }));
	},
	/**
	 * Check if this droppable accepts a given draggable element.
	 * @param  {jQuery} el The draggable element.
	 * @return {Boolean}    True if the draggable can be accepted, false otherwise.
	 */
	accept: function(el) {
		if (!this.options.accept) {
			return true;
		}
		if (!el.draggable('option', 'dataType')) {
			return true;
		}
		
		return (el.draggable('option', 'dataType') == this.options.accept);
	}
};
$.webos.widget('droppable', 'widget');

/*!
 * The drag'n'drop manager.
 * @type {Object}
 */
$.webos.ddmanager = {
	current: null,
	droppables: [],
	prepareOffsets: function(t, event) {
		var m = $.webos.ddmanager.droppables;
		var type = event ? event.type : null;
		var list = (t.currentItem || t.element).find(":data(droppable)").andSelf();
		
		droppablesLoop: for (var i = 0; i < m.length; i++) {
			if(m[i].options.disabled || (t && !m[i].accept.call(m[i],(t.currentItem || t.element)))) continue;	//No disabled and non-accepted
			if (m[i].element.is(t.currentItem || t.element)) { continue; }
			for (var j=0; j < list.length; j++) { if(list[j] == m[i]) { m[i].proportions.height = 0; continue droppablesLoop; } }; //Filter out elements in the current dragged item
			m[i].visible = m[i].element.css("display") != "none"; if(!m[i].visible) continue; 									//If the element is not visible, continue

			if(type == "mousedown") m[i]._activate.call(m[i], event); //Activate the droppable if used directly from draggables

			m[i].offset = m[i].element.offset();
			m[i].proportions = { width: m[i].element[0].offsetWidth, height: m[i].element[0].offsetHeight };
			m[i].isover = 0;
		}
	},
	drop: function(draggable, event) {
		var dropped = false;
		$.each($.webos.ddmanager.droppables, function() {
			if(!this.options) return;
			
			if (this.options.disabled || !this.visible) {
				return;
			}
			
			if (this.element.is(draggable.currentItem || draggable.element)) {
				return;
			}
			
			var intersects = (event.pageX > this.offset.left && 
				event.pageY > this.offset.top && 
				event.pageX < this.offset.left + this.proportions.width && 
				event.pageY < this.offset.top + this.proportions.height);
			
			if (intersects)
				dropped = this._drop.call(this, event) || dropped;

			if (this.accept.call(this, (draggable.currentItem || draggable.element))) {
				this.isout = 1; this.isover = 0;
				this._deactivate.call(this, event);
			}
		});
		return dropped;
	},
	dragStart: function( draggable, event ) {
		//Listen for scrolling so that if the dragging causes scrolling the position of the droppables can be recalculated (see #5003)
		//draggable.element.parentsUntil( "body" ).bind( "scroll.droppable", function() {
		//	if( !draggable.options.refreshPositions ) $.webos.ddmanager.prepareOffsets( draggable, event );
		//});
		draggable.element.trigger('dragstart', event);
	},
	drag: function(draggable, event) {
		//If you have a highly dynamic page, you might try this option. It renders positions every time you move the mouse.
		if(draggable.options.refreshPositions) $.webos.ddmanager.prepareOffsets(draggable, event);
		
		//Run through all droppables and check their positions based on specific tolerance options
		$.each($.webos.ddmanager.droppables, function() {
			if(this.options.disabled || !this.visible) return;
			
			var intersects = (event.pageX > this.offset.left && 
				event.pageY > this.offset.top && 
				event.pageX < this.offset.left + this.proportions.width && 
				event.pageY < this.offset.top + this.proportions.height);
			
			var c = (!intersects && this.isover == 1) ? 'isout' : ((intersects && this.isover == 0) ? 'isover' : null);
			
			if(!c) return;
			this[c] = 1; this[(c == 'isout') ? 'isover' : 'isout'] = 0;
			this[(c == "isover") ? "_over" : "_out"].call(this, event);
		});
	},
	dragStop: function( draggable, event ) {
		//draggable.element.parentsUntil( "body" ).unbind( "scroll.droppable" );
		//Call prepareOffsets one final time since IE does not fire return scroll events when overflow was caused by drag (see #5003)
		if( !draggable.options.refreshPositions ) $.webos.ddmanager.prepareOffsets( draggable, event );
		draggable.element.trigger('dragstop', event);
	}
};

/**
 * The keyboard manager.
 * @type {Object}
 * @static
 */
$.webos.keyboard = {};
/**
 * The webos system key.
 * @type {String}
 * @private
 */
$.webos.keyboard.systemKey = 'shift';
/**
 * Keycodes.
 * @type {Object}
 * @private
 */
$.webos.keyboard.keycodes = {
	down: 40,
	up: 38,
	left: 37,
	right: 39,
	
	end: 35,
	begin: 36,
	
	backTab: 8,
	tab: 9,
	shift: 16,
	ctrl: 17,
	enter: 13,
	esc: 27,
	space: 32,
	del: 46,
	
	a: 65,
	b: 66,
	c: 67,
	d: 68,
	e: 69,
	f: 70,
	g: 71,
	h: 72,
	i: 73,
	j: 74,
	k: 75,
	l: 76,
	m: 77,
	n: 78,
	o: 79,
	p: 80,
	q: 81,
	r: 82,
	s: 83,
	t: 84,
	u: 85,
	v: 86,
	w: 87,
	x: 88,
	y: 89,
	z: 90,
	
	f1: 112,
	f2: 113,
	f3: 114,
	f4: 115,
	f5: 116,
	f6: 117,
	f7: 118,
	f8: 119
};
/**
 * Currently pressed keys.
 * @type {Array}
 * @private
 */
$.webos.keyboard._keys = [];
$(document)
	.keydown(function(e) {
		if (jQuery.inArray(e.keyCode, $.webos.keyboard._keys) == -1) {
			$.webos.keyboard._keys.push(e.keyCode);
		}
	})
	.keyup(function(e) {
		var position = jQuery.inArray(e.keyCode, $.webos.keyboard._keys);
		if (position != -1) {
			delete $.webos.keyboard._keys[position];
		}
	});

/**
 * Check if some keys are currently pressed.
 * @param  {String|Array} keys Keys. For multiple keys, you can either give an array or separate keys by a plus sign (e.g. `ctrl+alt+del`).
 * @return {Boolean}      True if these keys are pressed, false otherwise.
 */
$.webos.keyboard.pressed = function(keys) {
	if (typeof keys == 'undefined') {
		return $.webos.keyboard._keys;
	}
	
	if (typeof keys == 'string') {
		keys = keys.toLowerCase().split('+');
	}
	if (typeof keys != 'object') {
		keys = [keys];
	}
	
	for (var i = 0; i < keys.length; i++) {
		if (jQuery.inArray($.webos.keyboard.name2Keycode(keys[i]), $.webos.keyboard._keys) == -1) {
			return false;
		}
	}
	return true;
};
/**
 * Check if the system key is pressed.
 * @return {Boolean}      True if this key is pressed, false otherwise.
 */
$.webos.keyboard.systemKeyDown = function() {
	return $.webos.keyboard.pressed($.webos.keyboard.systemKey);
};
/**
 * Translate a key code to a key name.
 * @param  {Number} keycode The key code.
 * @return {String}         The key name.
 */
$.webos.keyboard.keycode2Name = function(keycode) {
	for (var name in $.webos.keyboard.keycodes) {
		if (keycode === $.webos.keyboard.keycodes[name]) {
			return name;
		}
	}
	return keycode;
};
/**
 * Translate a key name to a key code.
 * @param  {String} name The key name.
 * @return {Number}      The key code.
 */
$.webos.keyboard.name2Keycode = function(name) {
	name = name.toLowerCase();
	if (typeof $.webos.keyboard.keycodes[name] != 'undefined') {
		return $.webos.keyboard.keycodes[name];
	}
	return name;
};

/**
 * Listen when a key is pressed.
 * @param  {jQuery}   el       Check if the window containing this element is active.
 * @param  {String}   keycode  The keys sequence. See `$.webos.keyboard.pressed`.
 * @param  {Function} callback The callback function.
 */
$.webos.keyboard.bind = function(el, keycode, callback) {
	el = $(el);
	
	$(document).keydown(function(e) {
		if ($.webos.keyboard.pressed(keycode)) {
			var elToCheck = el, isBindActive = true;
			if (el.is('.webos-window') || el.parents().filter('.webos-window').length > 0) {
				if (!el.is('.webos-window')) {
					elToCheck = el.parents().filter('.webos-window').last();
				}
				isBindActive = elToCheck.window('is', 'foreground');
			} else if (el.is('#desktop') || el.parents().filter('#desktop').length > 0) {
				if (!el.is('#desktop')) {
					elToCheck = el.parents().filter('#desktop').last();
				}
				isBindActive = (typeof $.webos.window.getActive() == 'undefined');
			}
			
			e.isFocused = false;
			if ($(e.target).is('input,textarea,select,*:focus')) {
				e.isFocused = true;
			}
			
			if (isBindActive) {
				if (!e.isFocused) {
					e.preventDefault();
				}
				callback(e);
			}
		}
	});
};

/*!
 * @TODO $.webos.keyboard.unbind()
 */

/*!
 * The system key code.
 * @type {Number}
 */
$.webos.keyboard.keycodes.system = $.webos.keyboard.name2Keycode($.webos.keyboard.systemKey);

/*!
 * Shortcut for $.webos.
 * @type {Object}
 */
$.w = $.webos;

})(jQuery);
