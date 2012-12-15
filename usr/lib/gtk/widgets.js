/**
 * Widgets pour le webos.
 * @author $imon <contact@simonser.fr.nf>
 * @version 2.0
 * @since 1.0alpha1
 */

(function($) {

/**
 * Namespace global pour les widgets du webos.
 * @namespace
 */
$.webos = {};

/**
* Declarer un widget.
* @param string widgetName Le nom du widget.
* @param object|string arg1 Les proprietes du widget. Si est le nom d'un widget, le nouveau widget heritera de celui-ci.
* @param object arg2 Si arg1 est le nom d'un widget, arg2 sera les proprietes du widget.
* @static
*/
$.webos.widget = function(widgetName) {
	widgetName = String(widgetName);

	var properties, parentWidgetName, parentWidget;

	if (typeof arguments[2] != 'undefined') {
		parentWidgetName = arguments[1];
		parentWidget = $[$.webos.widget.namespace()][parentWidgetName];
		properties = arguments[2];
	} else {
		properties = arguments[1];
	}

	if (typeof properties != 'object') {
		return false;
	}

	properties.widgetEventPrefix = widgetName.toLowerCase();
	properties.widgetBaseClass = 'webos-' + widgetName.toLowerCase();

	var fullWidgetName = $.webos.widget.namespace() + '.' + widgetName;
	if (parentWidget) {
		$.widget(fullWidgetName, parentWidget, properties);
	} else {
		$.widget(fullWidgetName, properties);
	}

	if (properties._translationsName) {
		parentWidget = $[$.webos.widget.namespace()][widgetName];
		$.widget(fullWidgetName, parentWidget, {
			_create: function() {
				if (!this._translations) {
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
};

$.webos.widget._namespace = 'gtk';
$.webos.widget.namespace = function() {
	return $.webos.widget._namespace;
};

/**
 * Determiner si est element est un widget.
 * @param {jQuery} element L'element.
 * @param {String} widgetName Le nom du widget.
 * @returns {Boolean} Vrai si l'element est le widget specifie, faux sinon.
 * @static
 */
$.webos.widget.is = function(element, widgetName) {
	return $(element).is(':' + $.webos.widget.namespace() + '-' + widgetName);
};

$.webos.widgets = [];
$.webos.getWidgets = function(widgetName) {
	if (widgetName) {
		return $($.webos.widgets).filter(':' + $.webos.widget.namespace() + '-' + widgetName);
	}
	
	return $($.webos.widgets);
};

//Widget
$.webos.widget('widget', {
	_name: 'widget',
	options: {
		id: 0,
		pid: null
	},
	_create: function() {
		this._super('_create');
		
		var that = this;

		this.options.id = $.webos.widgets.push(this.element) - 1;
		if (typeof Webos.Process.current() != 'undefined') {
			this.options.pid = Webos.Process.current().getPid();
			Webos.Process.current().bind('stop', function() {
				var $el = that.element;

				if ($el.length > 0 && $el.closest('html').length > 0) {
					$el.empty().remove();
				}
			});
		}
		this.element.addClass('webos-'+this._name);
		this.element.attr('id', 'webos-widget-'+this.options.id);
	},
	id: function() {
		return this.options.id;
	},
	pid: function() {
		return this.options.pid;
	},
	destroy: function() {
		this._trigger('destroy', { type: 'destroy' });

		delete $.webos.widgets[this.options.id];

		this._super('destroy');
	},
	_setOption: function(key, value) {
		this.options[key] = value;
		this._update(key, value);
	},
	selector: function() {
		return '#'+this.element.attr('id');
	},
	_update: function() {}
});

//Container
$.webos.widget('container', 'widget', {
	_name: 'container',
	options: {
		_content: undefined,
		_components: {}
	},
	_create: function() {
		this._super('_create');
		
		this.options._content = this.element;
	},
	content: function() {
		return this.options._content;
	},
	add: function(element) {
		this.options._content.append(element);
		element.trigger('insert');
	},
	component: function(component) {
		return this.options._components[component];
	}
});
$.webos.container = function() {
	return $('<div></div>').container();
};


//ScrollPane
$.webos.widget('scrollPane', 'container', {
	_name: 'scrollpane',
	options: {
		autoReload: false,
		horizontalDragMinWidth: 20,
		verticalDragMinHeight: 20,
		animate: false,
		mouseWheelSpeed: 30,
		expand: false,
		keyUpResize: false,
		alsoResize: null
	},
	_create: function() {
		this._super('_create');
		
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
				} else {
					this.element.unbind('scrollpanereload.scrollpane.widget.webos');
				}
				break;
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
			pos = this.content().position();
			return {
				x: - pos.left,
				y: - pos.top
			};
		} else {
			this.scrollTo(pos.x, pos.y);
		}
	},
	scrollToX: function(destX, animate) {
		var data = this.element.data('scrollpane');
		if (data.paneWidth - data.containerWidth == 0) { //Division by 0
			return;
		}
		var percentScrolled = destX / (data.paneWidth - data.containerWidth);
		this.positionDragX(percentScrolled * data.dragMaxX, animate);
	},
	scrollToY: function(destY, animate) {
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
					dragContainerV.height(verticalDragHeight);
					data.verticalDragHeight = verticalDragHeight + data.verticalDragMarginY;
					data.dragMaxY = data.verticalTrackHeight - data.verticalDragHeight;
				}
				var dragContainerH = that.options._components.horizontalBar.find('.drag-container');
				if (data.isScrollableH) {
					that.options._components.horizontalBar.find('.track').width(data.horizontalTrackWidth);
					data.horizontalDragMarginX = parseInt(dragContainerH.css('padding-top'), 10) + parseInt(dragContainerH.css('padding-bottom'), 10);
					var horizontalDragWidth = Math.ceil(1 / data.percentInViewH * data.horizontalTrackWidth);
					if (horizontalDragWidth < that.options.horizontalDragMinWidth) {
						horizontalDragWidth = that.options.horizontalDragMinWidth;
					}
					dragContainerH.width(horizontalDragWidth);
					data.horizontalDragWidth = horizontalDragWidth + data.horizontalDragMarginX;
					data.dragMaxX = data.horizontalTrackWidth - data.horizontalDragWidth;
				}
				
				that._mousewheel(true);
			}
			
			that.element.data('scrollpane', data);
			
			that._trigger('reload', { type: 'reload' }, data);
		}, 0);
	}
});
$.webos.scrollPane = function(options) {
	return $('<div></div>').scrollPane(options);
};


//Label
$.webos.widget('label', 'container', {
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
});
$.webos.label = function(text) {
	return $('<div></div>').label({
		text: text
	});
};


//Image
$.webos.widget('image', 'widget', {
	options: {
		src: '',
		title: 'image',
		loadHidden: true,
		img: null
	},
	_create: function() {
		this._super('_create');
		
		this.option('title', this.options.title);
		this.option('src', this.options.src);
	},
	load: function() {
		if (this.options.img) {
			return;
		}
		
		if (!this.options.loadHidden && this.element.is(':hidden')) {
			return;
		}
		
		var that = this;
		
		this.img = new Image();
		this.img.onload = function() {
			that.element.attr('src', that.options.src);
		};
		this.img.src = this.options.src;
	},
	_update: function(key, value) {
		switch(key) {
			case 'src':
				this.options.src = String(value);
				this.load();
				break;
			case 'title':
				this.element.attr('alt', value).attr('title', value);
				break;
		}
	}
});
$.webos.image = function(src, title) {
	return $('<img />').image({
		src: src,
		title: title
	});
};


//Progressbar
$.webos.widget('progressbar', 'container', {
	_name: 'progressbar',
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
});
$.webos.progressbar = function(value) {
	return $('<div></div>').progressbar({
		value: value
	});
};


//ButtonContainer
$.webos.widget('buttonContainer', 'container', {
	_name: 'button-container'
});
$.webos.buttonContainer = function() {
	return $('<div></div>').buttonContainer();
};


//Button
$.webos.widget('button', 'container', {
	options: {
		label: 'Bouton',
		icon: undefined,
		submit: false,
		disabled: false,
		showIcon: true,
		showLabel: true
	},
	_name: 'button',
	_create: function() {
		this._super('_create');
				
		this._update('submit', this.options.submit);
		this._update('label', this.options.label);
		this._update('disabled', this.options.disabled);
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
				break;
			case 'label':
				this.content().html(value);
				break;
			case 'disabled':
				this.disabled(value);
			case 'icon':
				break;
			case 'showLabel':
				break;
			case 'showIcon':
				break;
		}
	},
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
});
$.webos.button = function(label, submit) {
	return $('<span></span>').button({
		label: label,
		submit: submit
	});
};


//List
$.webos.widget('list', 'container', {
	options: {
		columns: [],
		buttons: []
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
	addColumn: function(value) {
		if (this.options._components.head.children('tr').length == 0) {
			this.options._components.head.append($('<tr></tr>'));
		}
		
		return $('<td></td>').html(value).appendTo(this.options._components.head.children('tr'));
	},
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
	addButton: function(button) {
		if (typeof this.options._components.buttonContainer == 'undefined') {
			this.options._components.buttonContainer = $.w.buttonContainer().appendTo(this.element);
		}
		
		this.options._components.buttonContainer.append(button);
	},
	items: function() {
		return this.content().children();
	},
	selection: function() {
		return this.items().filter('.active');
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
});
$.webos.list = function(columns, buttons) {
	return $('<div></div>').list({
		columns: columns,
		buttons: buttons
	});
};


//ListItem
$.webos.widget('listItem', 'container', {
	options: {
		columns: [],
		active: false
	},
	_name: 'list-item',
	_create: function() {
		this._super('_create');
		
		for (var i = 0; i < this.options.columns.length; i++) {
			this.addColumn(this.options.columns[i]);
		}
		
		var that = this;
		
		this.options._content.mousedown(function() {
			that.active(true);
		});
		
		this.active(this.options.active);
	},
	addColumn: function(value) {
		var column = $('<td></td>');
		if (typeof value != 'undefined') {
			column.html(value);
		}
		this.content().append(column);
		return column;
	},
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
	active: function(value) {
		if (typeof value == 'undefined') {
			return (this.options.active) ? true : false;
		} else {
			if (value) {
				this.options._content.parent('tbody').first().children('tr.active').listItem('active', false);
				this.options._content.addClass('active').trigger('select');
				
				this._trigger('select');
			} else {
				this.options._content.removeClass('active').trigger('unselect');
				
				this._trigger('unselect');
			}
		}
	},
	_update: function(key, value) {
		switch(key) {
			case 'active':
				this.active(value);
				break;
		}
	}
});
$.webos.listItem = function(columns) {
	return $('<tr></tr>').listItem({
		columns: columns
	});
};


//IconsList
$.webos.widget('iconsList', 'container', {
	_name: 'iconslist'
});
$.webos.iconsList = function() {
	return $('<ul></ul>').iconsList();
};



//IconsListItem
$.webos.widget('iconsListItem', 'container', {
	options: {
		icon: '',
		title: '',
		active: false
	},
	_name: 'iconslistitem',
	_create: function() {
		this._super('_create');
		
		this.options._components.icon = $('<img />').appendTo(this.element);
		this.options._components.title = $('<span></span>').appendTo(this.element);
		
		var that = this;
		
		this.element.mousedown(function() {
			that.active(true);
		});
		
		this._setIcon(this.options.icon);
		this._setTitle(this.options.title);
		this.active(this.options.active);
	},
	_setIcon: function(icon) {
		if (typeof icon == 'undefined') {
			return this.options.icon;
		} else {
			this.options._components.icon.attr('src', icon);
		}
	},
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
});
$.webos.iconsListItem = function(icon, title) {
	return $('<li></li>').iconsListItem({
		icon: icon,
		title: title
	});
};


//IconsListHeader
$.webos.widget('iconsListHeader', 'container', {
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
});
$.webos.iconsListHeader = function(title) {
	return $('<li></li>').iconsListHeader({
		title: title
	});
};


//Spoiler
$.webos.widget('spoiler', 'container', {
	_name: 'spoiler',
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
	show: function() {
		this.content().slideDown();
		this.element.addClass('shown');
		this.options.shown = true;
		this._trigger('show');
	},
	hide: function() {
		this.content().slideUp();
		this.element.removeClass('shown');
		this.options.shown = false;
		this._trigger('hide');
	},
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
});
$.webos.spoiler = function(label) {
	return $('<div></div>').spoiler({
		label: label
	});
};


//EntryContainer
$.webos.widget('entryContainer', 'container', {
	_name: 'entry-container',
	_create: function() {
		this._super('_create');
		
		this.element.submit(function(event) {
			event.preventDefault();
		});
		$('<input />', { type: 'submit', 'class': 'fake-submit' }).appendTo(this.content());
	}
});
$.webos.entryContainer = function() {
	return $('<form></form>').entryContainer();
};


//Entry
$.webos.widget('entry', 'container', {
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
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.content().val();
		} else if (this.value() != value) {
			this.content().val(value);
		}
	},
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
	label: function() {
		return this.options._components.label;
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
	},
	input: function() {
		return this.content();
	}
});


$.webos.widget('checkableEntry', 'entry', {
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
	isValid: function() {
		if (typeof this.options.check == 'function') {
			return (this.options.check(this.value())) ? true : false;
		}
		
		return true;
	},
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
});


//TextEntry
$.webos.widget('textEntry', 'checkableEntry', {
	_name: 'text-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'text' }).val(this.options.defaultValue);
		this.element.append(this.options._content);
		
		this.value(this.options.value);
	}
});
$.webos.textEntry = function(label, value) {
	return $('<div></div>').textEntry({
		label: label,
		value: value
	});
};



//CaptchaEntry
$.webos.widget('captchaEntry', 'container', {
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
	captchaId: function() {
		return this.options._captchaId;
	},
	isValid: function() {
		return (this.options._components.input.textEntry('value').length > 0);
	},
	check: function() {
		return this.options._components.input.textEntry('check');
	},
	value: function() {
		return this.options._components.input.textEntry('value');
	}
});
$.webos.captchaEntry = function() {
	return $('<div></div>').captchaEntry();
};


//SearchEntry
$.webos.widget('searchEntry', 'entry', {
	_name: 'search-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'text' });
		this.element.append(this.options._content);
	}
});
$.webos.searchEntry = function(label) {
	return $('<div></div>').searchEntry({
		label: label
	});
};


//PasswordEntry
$.webos.widget('passwordEntry', 'checkableEntry', {
	_name: 'password-entry',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'password' });
		this.element.append(this.options._content);
	}
});
$.webos.passwordEntry = function(label) {
	return $('<div></div>').passwordEntry({
		label: label
	});
};


//NumberEntry
$.webos.widget('numberEntry', 'checkableEntry', {
	_name: 'password-entry',
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
	},
	_update: function(key, value) {
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
});
$.webos.numberEntry = function(label, value, min, max) {
	return $('<div></div>').numberEntry({
		label: label,
		value: value,
		min: min,
		max: max
	});
};


//TextAreaEntry
$.webos.widget('textAreaEntry', 'checkableEntry', {
	_name: 'textarea-entry',
	_create: function() {
		this._super('_create');
		
		this.options._components.br = $('<br />').appendTo(this.element);
		this.options._content = $('<textarea></textarea>').appendTo(this.element);
		
		this.value(this.options.value);
		this.option('label', this.options.label);
	},
	_update: function(key, value) {
		switch (key) {
			case 'label':
				this.options._components.br.toggle((value) ? true : false);
		}
	}
});
$.webos.textAreaEntry = function(label) {
	return $('<div></div>').textAreaEntry({
		label: label
	});
};


//CheckButton
$.webos.widget('checkButton', 'entry', {
	options: {
		value: false
	},
	_name: 'checkbutton',
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._content = $('<input />', { type: 'checkbox' }).change(function() {
			that.options.value = that.value();
		});
		this.element.prepend(this.content());
		
		this.value(this.options.value);
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
});
$.webos.checkButton = function(label, value) {
	return $('<div></div>').checkButton({
		label: label,
		value: value
	});
};


//RadioButtonContainer
$.webos.widget('radioButtonContainer', 'container', {
	_name: 'radiobutton-container'
});
$.webos.radioButtonContainer = function() {
	return $('<div></div>').radioButtonContainer();
};


//RadioButton
$.webos.widget('radioButton', 'entry', {
	_name: 'radiobutton',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<input />', { type: 'radio' }).change(function() {
			$(this).parents('.webos-radiobutton-container').first().find(':checked').not(this).prop('checked', false);
		});
		
		this.element.prepend(this.options._content);
		this.value(this.options.value);
	},
	value: function(value) {
		if (typeof value == 'undefined') {
			return this.content().prop('checked');
		} else {
			this.options.value = (value) ? true : false;
			this.content().prop('checked', this.options.value);
		}
	}
});
$.webos.radioButton = function(label, value) {
	return $('<div></div>').radioButton({
		label: label,
		value: value
	});
};


//SelectButton
$.webos.widget('selectButton', 'entry', {
	options: {
		choices: {}
	},
	_name: 'selectbutton',
	_create: function() {
		this._super('_create');
		
		this.options._content = $('<select></select>').appendTo(this.element);
		this._setChoices(this.options.choices);
		this.value(this.options.value);
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
		switch(key) {
			case 'choices':
				this._setChoices(value);
				break;
		}
	}
});
$.webos.selectButton = function(label, choices) {
	return $('<div></div>').selectButton({
		label: label,
		choices: choices
	});
};


//SwitchButton
$.webos.widget('switchButton', 'entry', {
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
		}).appendTo(this.element);
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
	toggle: function() {
		this.value(!this.value());
	},
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
});
$.webos.switchButton = function(label, value) {
	return $('<div></div>').switchButton({
		label: label,
		value: value
	});
};


//Menu
$.webos.widget('menu', 'container', {
	_name: 'menu'
});


//MenuItem
$.webos.widget('menuItem', 'container', {
	_name: 'menuitem',
	options: {
		label: '',
		disabled: false,
		separator: false
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._components.label = $('<a></a>', { href: '#' }).html(this.options.label).appendTo(this.element);
		this.options._content = $('<ul></ul>').appendTo(this.element);
		this.element.bind('click mouseenter', function(e) {
			if (that.options.disabled && e.type == 'click') {
				return false;
			}
			
			var $menu = that.element, $menuContents = that.content();
			
			if ($menu.is('.hover')) {
				return;
			}
			
			if (e.type == 'mouseenter' && $menu.parents('li.webos-menuitem').length == 0) {
				return;
			}
			
			if ($menuContents.children().length > 0) {
				$menuContents.show();
			} else if (e.type == 'click') {
				$menu.removeClass('hover');
				$menu.parents('li.webos-menuitem ul li').hide();
				return;
			}
			
			$menu.addClass('hover');
			
			var onDocClickFn = function(e) {
				//Si on clique sur le menu
				if ($(e.target).parents().filter($menu).length > 0) {
					if ($(e.target).parents().filter('li.webos-menuitem').first().children('ul').children().length > 0) {
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
			
			if ($menu.parents('li.webos-menuitem').length == 0) {
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
});
$.webos.menuItem = function(label, separator) {
	return $('<li></li>').menuItem({
		label: label,
		separator: separator
	});
};


//Tabs
$.webos.widget('tabs', 'container', {
	_name: 'tabs',
	options: {
		selectedTab: null
	},
	_create: function() {
		this._super('_create');
		
		var that = this;
		
		this.options._components.tabs = $('<ul></ul>', { 'class': 'tabs' }).appendTo(this.element);
		this.options._components.content = $('<div></div>', { 'class': 'contents' }).appendTo(this.element);
		
		this.options._components.tabs.click(function(e) {
			if ($(e.target).is('li')) {
				that.option('selectedTab', $(e.target).index());
			}
		});
	},
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
		
		var tabTitle = $(), tabContents = $();
		if (typeof index == 'undefined') {
			tabTitle = $('<li></li>').appendTo(this.options._components.tabs);
			tabContents = $('<div></div>').appendTo(this.options._components.content);
			
			if (this.options.selectedTab === null) {
				this.options.selectedTab = 0;
				tabTitle.addClass('active');
				tabContents.addClass('active');
			}
		} else {
			tabTitle = $(this.options._components.tabs.children('li')[index]);
			tabContents = $(this.options._components.content.children('div')[index]);
		}
		
		if (typeof title != 'undefined') {
			tabTitle.html(title);
		}
		
		if (typeof contents != 'undefined') {
			tabContents.html(contents);
		}
		
		return tabContents;
	},
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
				var index = parseInt(value);
				if (isNaN(index)) {
					index = 0;
				}
				
				this.options._components.tabs.children('li.active').removeClass('active');
				this.options._components.content.children('div.active').removeClass('active');
				
				$(this.options._components.tabs.children('li')[index]).addClass('active');
				this.tab(index).addClass('active');

				this._trigger('select', { type: 'select' }, { tab: index });
				break;
		}
	}
});
$.webos.tabs = function(tabs) {
	return $('<div></div>').tabs().tabs('setTabs', tabs);
};


//Draggable
$.webos.widget('draggable', 'widget', {
	_name: 'draggable',
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
});
$.widget.bridge('ui_draggable', $.ui.draggable);


//Droppable
$.webos.widget('droppable', 'widget', {
	_name: 'droppable',
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
	accept: function(el) {
		if (!this.options.accept) {
			return true;
		}
		if (!el.draggable('option', 'dataType')) {
			return true;
		}
		
		return (el.draggable('option', 'dataType') == this.options.accept);
	}
});


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
	}
};

//Keyboard
$.webos.keyboard = {};
$.webos.keyboard.systemKey = 'shift';
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
$.webos.keyboard.systemKeyDown = function() {
	return $.webos.keyboard.pressed($.webos.keyboard.systemKey);
};
$.webos.keyboard.keycode2Name = function(keycode) {
	for (var name in $.webos.keyboard.keycodes) {
		if (keycode === $.webos.keyboard.keycodes[name]) {
			return name;
		}
	}
	return keycode;
};
$.webos.keyboard.name2Keycode = function(name) {
	name = name.toLowerCase();
	if (typeof $.webos.keyboard.keycodes[name] != 'undefined') {
		return $.webos.keyboard.keycodes[name];
	}
	return name;
};
$.webos.keyboard.keycodes.system = $.webos.keyboard.name2Keycode($.webos.keyboard.systemKey);
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


//Raccourci
$.w = $.webos;

})(jQuery);