/**
 * Widgets pour le webos.
* @author $imon <contact@simonser.fr.nf>
* @version 1.0
* @since 1.0
*/

/*
* Objet servant a gerer les widgets sur le webos.
*/
$.webos = {};
/*
* Proprietes des widgets.
*/
$.webos.properties = {};
/*
* Liste des proprietes des widgets.
*/
$.webos.properties.list = {};
/**
* Recuperer les proprietes d'un widget.
* @param string widget Le nom du widget.
* @return object
*/
$.webos.properties.get = function(widget) {
	if (typeof $.webos.properties.list[widget] == 'undefined') {
		return {};
	}
	
	return $.webos.properties.list[widget];
};
/**
* Declarer un widget.
* @param string widget Le nom du widget.
* @param object|string arg1 Les proprietes du widget. Si est le nom d'un widget, le nouveau widget heritera de celui-ci.
* @param object arg2 Si arg1 est le nom d'un widget, arg2 sera les proprietes du widget.
*/
$.webos.widget = function(widget, arg1, arg2) {
	var properties;
	if (typeof arg2 != 'undefined') {
		properties = $.webos.extend($.webos.properties.get(arg1), arg2);
	} else {
		properties = arg1;
	}
	$.webos.properties.list[widget] = properties;
	
	$.widget('weboswidgets.'+widget, properties);
};
$.webos.widget.is = function(widget, name) {
	return $(widget).is(':weboswidgets-' + name);
};
var widgetProperties = {
	_name: 'widget',
	options: {
		id: 0,
		pid: null
	},
	_create: function() {
		this.options.id = $.webos.widgets.push(this.element) - 1;
		if (typeof Webos.Process.current() != 'undefined') {
			this.options.pid = Webos.Process.current().getPid();
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
		this._destroy();
		delete $.webos.widgets[this.options.id];
		$.Widget.prototype.destroy.call(this);
	},
	_destroy: function() {},
	_setOption: function(key, value) {
		this.options[key] = value;
		this._update(key, value);
	},
	selector: function() {
		return '#'+this.element.attr('id');
	},
	_update: function() {}
};
$.webos.widget('widget', widgetProperties);
$.webos.widgets = [];
$.webos.getWidgets = function() {
	return $.webos.widgets;
};
$.webos.extend = function(parent, child) {
	child = $.extend(true, {}, parent, child);
	child._parent = function() {
		return parent;
	};
	var reportMethods = function(parentMethod, childMethod) {
		return function() {
			var args = new Array();
			for (var i = 0; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			parentMethod.apply(this, args);
			return childMethod.apply(this, args);
		};
	};
	for (var attr in child) {
		if (typeof child[attr] == 'function' && typeof parent[attr] == 'function') {
			child[attr] = reportMethods(parent[attr], child[attr]);
		}
		if (child[attr] instanceof Array && parent[attr] instanceof Array) {
			child[attr] = parent[attr].concat(child[attr]);
		}
	}
	return child;
};
/*
* TODO: Enlever les widgets crees par le processus.
*/
$.webos.stopProcess = function(proc) {
	var widgets = $.webos.getWidgets();
	for (var i = 0; i < widgets.length; i++) {
		//On enleve les widgets crees par le processus correspondant.
		// ...
		// Not yet implemented
	}
};

//Container
var containerProperties = $.webos.extend($.webos.properties.get('widget'), {
	_name: 'container',
	options: {
		_content: undefined,
		_components: {}
	},
	_create: function() {
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
$.webos.widget('container', containerProperties);

$.webos.container = function() {
	return $('<div></div>').container();
};

//ScrollPane
var scrollPaneProperties = $.webos.extend($.webos.properties.get('container'), {
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
		var originalScrollTop = this.element.scrollTop(), originalScrollLeft = this.element.scrollLeft();
		
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

			$('html').bind('mousemove.scrollpane.widget.webos', function(e) {
				that.positionDragY(e.pageY - startY, false);
			}).bind('mouseup.scrollpane.widget.webos mouseleave.scrollpane.widget.webos', cancelDrag);
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

			$('html').bind('mousemove.scrollpane.widget.webos', function(e) {
				that.positionDragX(e.pageX - startX, false);
			}).bind('mouseup.scrollpane.widget.webos mouseleave.scrollpane.widget.webos', cancelDrag);
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
			this.scrollToX(pos.x);
			this.scrollToY(pos.y);
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
		
		var data = {};var that = this;
		this.element.data('scrollpane', data);
		
		this.element.css({
			overflow: 'hidden',
			padding: 0
		});
		
		data.containerWidth = this.element.outerWidth();
		data.containerHeight = this.element.outerHeight();
		
		this.element.css('overflow', 'auto');
		data.paneWidth = this.content()[0].scrollWidth;
		data.paneHeight = this.content()[0].scrollHeight;
		
		setTimeout(function() { //Delay for Mozilla
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
				
				data.horizontalTrackHeight = that.options._components.horizontalBar.children('.track').outerHeight();
				data.verticalTrackWidth = that.options._components.verticalBar.outerWidth();
				
				data.horizontalTrackWidth = data.containerWidth;
				data.verticalTrackHeight = data.containerHeight;
				that.element.find('>.vertical-bar>.cap:visible,>.vertical-bar>.arrow').each(function() {
					data.verticalTrackHeight -= $(that).outerHeight();
				});
				that.element.find('>.horizontal-bar>.cap:visible,>.horizontal-bar>.arrow').each(function() {
					data.horizontalTrackWidth -= $(that).outerWidth();
				});
				
				that.options._components.container.width(data.containerWidth - data.verticalTrackWidth).height(data.containerHeight - data.horizontalTrackHeight);

				that.content().css({
					'min-width': data.containerWidth - data.verticalTrackWidth,
					'min-height': data.containerHeight - data.horizontalTrackHeight
				});
				
				if (data.isScrollableH && data.isScrollableV) {
					data.verticalTrackHeight -= data.horizontalTrackHeight;
					that.options._components.horizontalBar.find('>.cap:visible,>.arrow').each(function() {
						data.horizontalTrackWidth += $(that).outerWidth();
					});
					data.horizontalTrackWidth -= data.verticalTrackWidth;
					data.paneHeight -= data.verticalTrackWidth;
					data.containerHeight -= 2 * data.verticalTrackWidth;
					data.paneWidth -= data.horizontalTrackHeight;
					data.containerWidth -= 2 * data.horizontalTrackHeight;
					that.options._components.horizontalBar.find('.corner').height(data.horizontalTrackHeight).width(data.verticalTrackWidth);
				}
				
				if (data.isScrollableV) {
					that.options._components.verticalBar.find('.track').height(data.verticalTrackHeight);
					data.verticalDragHeight = Math.ceil(1 / data.percentInViewV * data.verticalTrackHeight);
					if (data.verticalDragHeight < that.options.verticalDragMinHeight) {
						data.verticalDragHeight = that.options.verticalDragMinHeight;
					}
					that.options._components.verticalBar.find('.drag-container').height(data.verticalDragHeight);
					data.dragMaxY = data.verticalTrackHeight - data.verticalDragHeight;
				}
				if (data.isScrollableH) {
					that.options._components.horizontalBar.find('.track').width(data.horizontalTrackWidth);
					data.horizontalDragWidth = Math.ceil(1 / data.percentInViewH * data.horizontalTrackWidth);
					if (data.horizontalDragWidth < that.options.horizontalDragMinWidth) {
						data.horizontalDragWidth = that.options.horizontalDragMinWidth;
					}
					that.options._components.horizontalBar.find('.drag-container').width(data.horizontalDragWidth);
					data.dragMaxX = data.horizontalTrackWidth - data.horizontalDragWidth;
				}
				
				that._mousewheel(true);
			}
			
			that.element.data('scrollpane', data);
			
			that._trigger('reload', { type: 'reload' }, data);
		}, 0);
		that.element.css('overflow', 'hidden');
	}
});
$.webos.widget('scrollPane', scrollPaneProperties);

$.webos.scrollPane = function() {
	return $('<div></div>').scrollPane();
};

//Label
var labelProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		text: ''
	},
	_name: 'label',
	_create: function() {
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
$.webos.widget('label', labelProperties);

$.webos.label = function(text) {
	return $('<div></div>').label({
		text: text
	});
};

//Image
var imageProperties = $.webos.extend($.webos.properties.get('widget'), {
	options: {
		src: '',
		title: 'image'
	},
	_create: function() {
		this.option('title', this.options.title);
		this.option('src', this.options.src);
	},
	_update: function(key, value) {
		switch(key) {
			case 'src':
				this.element.attr('src', value);
				break;
			case 'title':
				this.element.attr('alt', value).attr('title', value);
				break;
		}
	}
});
$.webos.widget('image', imageProperties);

$.webos.image = function(src, title) {
	return $('<img />').image({
		src: src,
		title: title
	});
};

//Progressbar
var progressbarProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'progressbar',
	options: {
		value: 0
	},
	_create: function() {
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
$.webos.widget('progressbar', progressbarProperties);

$.webos.progressbar = function(value) {
	return $('<div></div>').progressbar({
		value: value
	});
};

//ButtonContainer
var buttonContainerProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'button-container'
});
$.webos.widget('buttonContainer', buttonContainerProperties);

$.webos.buttonContainer = function() {
	return $('<div></div>').buttonContainer();
};

//Button
var buttonProperties = $.webos.extend($.webos.properties.get('container'), {
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
$.webos.widget('button', buttonProperties);

$.webos.button = function(label, submit) {
	return $('<span></span>').button({
		label: label,
		submit: submit
	});
};

//List
var listProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		columns: [],
		buttons: []
	},
	_name: 'list',
	_create: function() {
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
		
		this.options._components.head.children('tr').append($('<td></td>').html(value));
	},
	column: function(id, content) {
		var column;
		if (typeof id == 'undefined') {
			column = this.addColumn();
		} else {
			column = $(this.options._components.head.children('td')[id]);
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
				this.options._components.head.children('tr').remove();
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
$.webos.widget('list', listProperties);

$.webos.list = function(columns, buttons) {
	return $('<div></div>').list({
		columns: columns,
		buttons: buttons
	});
};

//ListItem
var listItemProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		columns: [],
		active: false
	},
	_name: 'list-item',
	_create: function() {
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
$.webos.widget('listItem', listItemProperties);

$.webos.listItem = function(columns) {
	return $('<tr></tr>').listItem({
		columns: columns
	});
};

//IconsList
var iconsListProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'iconslist'
});
$.webos.widget('iconsList', iconsListProperties);

$.webos.iconsList = function() {
	return $('<ul></ul>').iconsList();
};

//IconsListItem
var iconsListItemProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		icon: '',
		title: '',
		active: false
	},
	_name: 'iconslistitem',
	_create: function() {
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
$.webos.widget('iconsListItem', iconsListItemProperties);

$.webos.iconsListItem = function(icon, title) {
	return $('<li></li>').iconsListItem({
		icon: icon,
		title: title
	});
};

//Spoiler
var spoilerProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'spoiler',
	options: {
		label: 'Plus',
		shown: false
	},
	_create: function() {
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
$.webos.widget('spoiler', spoilerProperties);

$.webos.spoiler = function(label) {
	return $('<div></div>').spoiler({
		label: label
	});
};

//EntryContainer
var entryContainerProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'entry-container',
	_create: function() {
		this.element.submit(function(event) {
			event.preventDefault();
		});
		$('<input />', { type: 'submit', 'class': 'fake-submit' }).appendTo(this.content());
	}
});
$.webos.widget('entryContainer', entryContainerProperties);

$.webos.entryContainer = function() {
	return $('<form></form>').entryContainer();
};

//Entry
var entryProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		label: '',
		value: '',
		disabled: false
	},
	_name: 'entry',
	_create: function() {
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
$.webos.widget('entry', entryProperties);

var checkableEntryProperties = $.webos.extend($.webos.properties.get('entry'), {
	options: {
		autoCheck: true,
		check: null
	},
	_name: 'checkable-entry',
	_create: function() {
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
$.webos.widget('checkableEntry', checkableEntryProperties);

//TextEntry
var textEntryProperties = $.webos.extend($.webos.properties.get('checkableEntry'), {
	_name: 'text-entry',
	_create: function() {
		this.options._content = $('<input />', { type: 'text' }).val(this.options.defaultValue);
		this.element.append(this.options._content);
		
		this.value(this.options.value);
	}
});
$.webos.widget('textEntry', textEntryProperties);

$.webos.textEntry = function(label, value) {
	return $('<div></div>').textEntry({
		label: label,
		value: value
	});
};

//CaptchaEntry
var captchaEntryProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'captcha-entry',
	_create: function() {
		var that = this;
		
		this.options._components.label = $.webos.label('Chargement...').appendTo(this.element);
		this.options._components.input = $.webos.textEntry().textEntry('option', 'check', function(value) {
			return that.isValid();
		}).hide().appendTo(this.element);
		
		this._loadCaptcha();
	},
	_loadCaptcha: function() {
		var that = this;
		new W.ServerCall({
			'class': 'CaptchaController',
			method: 'get'
		}).load([function(response) {
			var data = response.getData();
			that.options._captchaId = data.id;
			switch (data.type) {
				case 1:
					that.options._components.input.textEntry('option', 'label', data.captcha);
				case 2:
					that.options._content = $('<img />', { src: 'data:image/png;base64,'+data.captcha, alt: 'captcha' }).insertAfter(that.options._components.label);
					that.options._components.input.textEntry('option', 'label', 'Veuillez recopier le texte de l\'image ci-dessus : ');
					break;
			}
			that.options._components.label.hide();
			that.options._components.input.show();
		}, function(response) {
			that.options._components.label.html('Une erreur est survenue.');
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
$.webos.widget('captchaEntry', captchaEntryProperties);

$.webos.captchaEntry = function() {
	return $('<div></div>').captchaEntry();
};

//SearchEntry
var searchEntryProperties = $.webos.extend($.webos.properties.get('entry'), {
	_name: 'search-entry',
	_create: function() {
		this.options._content = $('<input />', { type: 'text' });
		this.element.append(this.options._content);
	}
});
$.webos.widget('searchEntry', searchEntryProperties);

$.webos.searchEntry = function(label) {
	return $('<div></div>').searchEntry({
		label: label
	});
};

//PasswordEntry
var passwordEntryProperties = $.webos.extend($.webos.properties.get('checkableEntry'), {
	_name: 'password-entry',
	_create: function() {
		this.options._content = $('<input />', { type: 'password' });
		this.element.append(this.options._content);
	}
});
$.webos.widget('passwordEntry', passwordEntryProperties);

$.webos.passwordEntry = function(label) {
	return $('<div></div>').passwordEntry({
		label: label
	});
};

//NumberEntry
var numberEntryProperties = $.webos.extend($.webos.properties.get('checkableEntry'), {
	_name: 'password-entry',
	options: {
		min: null,
		max: null,
		step: null
	},
	_create: function() {
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
$.webos.widget('numberEntry', numberEntryProperties);

$.webos.numberEntry = function(label, value, min, max) {
	return $('<div></div>').numberEntry({
		label: label,
		value: value,
		min: min,
		max: max
	});
};

//TextAreaEntry
var textAreaEntryProperties = $.webos.extend($.webos.properties.get('checkableEntry'), {
	_name: 'textarea-entry',
	_create: function() {
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
$.webos.widget('textAreaEntry', textAreaEntryProperties);

$.webos.textAreaEntry = function(label) {
	return $('<div></div>').textAreaEntry({
		label: label
	});
};

//CheckButton
var checkButtonProperties = $.webos.extend($.webos.properties.get('entry'), {
	options: {
		value: false
	},
	_name: 'checkbutton',
	_create: function() {
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
$.webos.widget('checkButton', checkButtonProperties);

$.webos.checkButton = function(label, value) {
	return $('<div></div>').checkButton({
		label: label,
		value: value
	});
};

//RadioButtonContainer
var radioButtonContainerProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'radiobutton-container'
});
$.webos.widget('radioButtonContainer', radioButtonContainerProperties);

$.webos.radioButtonContainer = function() {
	return $('<div></div>').radioButtonContainer();
};

//RadioButton
var radioButtonProperties = $.webos.extend($.webos.properties.get('entry'), {
	_name: 'radiobutton',
	_create: function() {
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
$.webos.widget('radioButton', radioButtonProperties);

$.webos.radioButton = function(label, value) {
	return $('<div></div>').radioButton({
		label: label,
		value: value
	});
};

//SelectButton
var selectButtonProperties = $.webos.extend($.webos.properties.get('entry'), {
	options: {
		choices: {}
	},
	_name: 'selectbutton',
	_create: function() {
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
$.webos.widget('selectButton', selectButtonProperties);

$.webos.selectButton = function(label, choices) {
	return $('<div></div>').selectButton({
		label: label,
		choices: choices
	});
};

//SwitchButton
var switchButtonProperties = $.webos.extend($.webos.properties.get('entry'), {
	options: {
		value: false
	},
	_name: 'switchbutton',
	_create: function() {
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
		this.options._components.slider.draggable({
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
				this.options._components.slider.draggable('disable');
			} else {
				this.options._components.slider.draggable('enable');
			}
		}
	}
});
$.webos.widget('switchButton', switchButtonProperties);

$.webos.switchButton = function(label, value) {
	return $('<div></div>').switchButton({
		label: label,
		value: value
	});
};

//Menu
var menuProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'menu'
});
$.webos.widget('menu', menuProperties);

//MenuItem
var menuItemProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'menuitem',
	options: {
		label: '',
		disabled: false,
		separator: false
	},
	_create: function() {
		var that = this;
		
		this.options._components.label = $('<a></a>', { href: '#' }).html(this.options.label).appendTo(this.element);
		this.options._content = $('<ul></ul>').appendTo(this.element);
		this.element.bind('click mouseenter', function(e) {
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
$.webos.widget('menuItem', menuItemProperties);

$.webos.menuItem = function(label) {
	return $('<li></li>').menuItem({
		label: label
	});
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
			var isBindActive = true;
			if (el.is('.webos-window') || el.parents().filter('.webos-window').length > 0) {
				if (!el.is('.webos-window')) {
					el = el.parents().filter('.webos-window').last();
				}
				isBindActive = el.is('foreground');
			} else if (el.is('#desktop') || el.parents().filter('#desktop').length > 0) {
				if (!el.is('#desktop')) {
					el = el.parents().filter('#desktop').last();
				}
				isBindActive = (typeof $.webos.window.getActive() == 'undefined');
			}
			
			if (isBindActive) {
				e.preventDefault();
				callback(e);
			}
		}
	});
};


//Raccourci
$.w = $.webos;