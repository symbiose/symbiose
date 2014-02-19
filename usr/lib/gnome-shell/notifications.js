function SNotification(opts) {
	return $.webos.notification(opts);
}
SNotification.element = $('<div></div>', { 'class': 'notifications-area' }).css('display', 'none').appendTo(W.UserInterface.Booter.current().element());
SNotification.container = $('<div></div>', { 'class': 'notification-container' }).appendTo(SNotification.element);
SNotification.indicators = $('<ul></ul>').appendTo(SNotification.element);
SNotification.showContainer = function() {
	SNotification.showedStack++;
	if (SNotification.isContainerVisible()) {
		return;
	}
	SNotification.showed = true;
	SNotification.element.stop().fadeIn('fast');
};
SNotification.autoShowContainer = function() {
	if (SNotification.isContainerVisible()) {
		return;
	}
	SNotification.showed = true;
	SNotification.element.stop().fadeIn('fast');
};
SNotification.hideContainer = function() {
	SNotification.showedStack = (SNotification.showedStack > 0) ? SNotification.showedStack - 1 : 0;
	if (SNotification.showedStack > 0 || !SNotification.isContainerVisible()) {
		return;
	}
	SNotification.showed = false;
	SNotification.element.stop().fadeOut('fast');
};
SNotification.autoHideContainer = function() {
	if (SNotification.showedStack > 0 || !SNotification.isContainerVisible()) {
		return;
	}
	SNotification.showed = false;
	SNotification.element.stop().fadeOut('fast');
};
SNotification.isContainerVisible = function() {
	return SNotification.element.is(':visible');
};
SNotification.showedStack = 0;

$(window).mousemove(function(e) {
	if (e.pageX <= $(document).width() - 3 || e.pageY <= $(document).height() - 3) {
		return;
	}
	
	if (SNotification.isContainerVisible()) {
		return;
	}
	
	if (SNotification.showed) {
		return;
	}
	
	SNotification.autoShowContainer();
});
SNotification.element.mouseleave(function() {
	if (SNotification.showed) {
		var timer = setTimeout(function() {
			SNotification.autoHideContainer();
		}, 700);
		SNotification.element.one('mouseenter', function() {
			clearTimeout(timer);
		});
	}
});

//Notification
$.webos.widget('notification', 'container', {
	options: {
		title: 'Message',
		message: '',
		shortMessage: '',
		icon: new W.Icon('/usr/share/images/gnome/light.png'),
		life: 7,
		widgets: []
	},
	_name: 'notification',
	_create: function() {
		this._super('_create');

		var that = this;
		
		this.options._components.header = $('<div></div>', { 'class': 'header' }).appendTo(this.element);
		$('<img />', { src: W.Icon.toIcon(this.options.icon).realpath(24), alt: '', 'class': 'icon' }).appendTo(this.options._components.header);
		$('<strong></strong>').html(this.options.title+' : ').appendTo(this.options._components.header);
		this.options._components.details = $('<span></span>', { 'class': 'details' }).appendTo(this.options._components.header);
		this.options._components.content = $('<div></div>', { 'class': 'content' }).hide().appendTo(this.element);
		this.options._components.message = $('<div></div>', { 'class': 'message' }).appendTo(this.options._components.content);
		
		this.option('shortMessage', this.options.shortMessage);
		this.option('message', this.options.message);
		
		if (this.options.widgets.length > 0) {
			var buttonContainer = $();
			for (var i = 0; i < this.options.widgets.length; i++) {
				if ($.webos.widget.is(this.options.widgets[i], 'button')) {
					if (buttonContainer.length == 0) {
						buttonContainer = $.w.buttonContainer().appendTo(this.options._components.content);
					}
					this.options.widgets[i].appendTo(buttonContainer);
				} else {
					this.options.widgets[i].appendTo(this.options._components.content);
				}
			}
		}
		
		var focus = false;
		this.element.hover(function() {
			clearTimeout(that.options._timer);
			that.options._components.details.stop().fadeOut('fast');
			that.options._components.content.stop().slideDown('fast');
		}, function() {
			if (focus) {
				return;
			}
			that.options._components.details.stop().fadeIn('fast');
			that.options._components.content.stop().slideUp('fast');
			that._startTimer();
		}).focusin(function() {
			that.options._components.details.stop().fadeOut('fast');
			that.options._components.content.stop().slideDown('fast');
			focus = true;
		}).focusout(function() {
			that.options._components.details.stop().fadeIn('fast');
			that.options._components.content.stop().slideUp('fast');
			focus = false;
		}).click(function(e) {
			if ($(e.target).is('input')) {
				return;
			}
			that.dismiss();
		});
		
		if (SNotification.container.children().length > 0) {
			var waitForDismissFn = function(e) {
				if (!e) {
					SNotification.container.bind('notificationdismiss', waitForDismissFn);
				} else if (SNotification.container.children().not(e.target).length == 0) {
					SNotification.container.unbind('notificationdismiss', waitForDismissFn);
					that._show();
				}
			};
			waitForDismissFn();
		} else {
			that._show();
		}
	},
	_update: function(key, value) {
		switch (key) {
			case 'message':
				this.options._components.message.html(value);
				if (!this.options.shortMessage) {
					this.options._components.details.html(value);
				}
				break;
			case 'shortMessage':
				this.options._components.details.html(value);
				break;
		}
	},
	_show: function() {
		SNotification.showContainer();
		
		this.element.appendTo(SNotification.container);
		
		var height = this.element.outerHeight();
		this.element.css('top', height).animate({
			top: '-='+height
		}, 'fast');
		
		this._startTimer();
	},
	_startTimer: function() {
		var that = this;
		this.options._timer = setTimeout(function() {
			that.dismiss();
		}, this.options.life * 1000);
	},
	dismiss: function() {
		var that = this;
		
		this.element.animate({
			top: '+='+this.element.outerHeight()
		}, 'fast', function() {
			that._trigger('dismiss');
			that.element.remove();
			SNotification.hideContainer();
		});
	}
});
$.webos.notification = function(options) {
	return $('<div></div>').notification(options);
};


$.webos.widget('appIndicator', 'container', {
	_name: 'app-indicator',
	options: {
		title: 'Application',
		icon: undefined
	},
	_create: function() {
		this._super('_create');

		var indicator = this.options._components.indicator = $('<div></div>', { 'class': 'indicator' }).appendTo(this.element);
		this.options._components.icon = $('<img />', { 'class': 'icon' }).appendTo(indicator);
		this.options._components.title = $('<span></span>', { 'class': 'title' }).appendTo(indicator);
		this.options._content = $('<ul></ul>').appendTo(this.element);
		
		var that = this;
		
		indicator.css('width', '22px').mouseenter(function() {
			if (indicator.is('.expanded')) {
				return;
			}
			SNotification.indicators.children('li').children('.indicator.expanded').removeClass('expanded').stop().animate({
				width: '22px'
			}, 'fast');
			indicator.addClass('expanded').css('width', 'auto');
			var width = indicator.width();
			indicator.css('width', '22px').stop().animate({
				width: width
			}, 'fast');
		}).click(function(e) {
			var menu = that.options._content;
			
			if (that.element.children('ul').children().length > 0) {
				var hideMenuFn = function() {
					if (!$.fx.off) {
						menu.animate({
							bottom: '+=20',
							opacity: 0
						}, 'fast', function() {
							$(this).hide();
						});
					} else {
						menu.hide();
					}
					that.element.removeClass('active');
					
					SNotification.hideContainer();
				};
				
				that.element.toggleClass('active');
				if (that.element.is('.active')) {
					var position = that.element.offset();
					var subMenuPosition = {
						bottom: (position.top - $(document).height()) + that.element.outerHeight() + 23,
						left: position.left
					};
					menu.css(subMenuPosition).show();
					
					var subMenuOffset = menu.offset();
					var maxX = subMenuOffset.left + (menu.outerWidth() + menu.outerWidth(true)) / 2;
					
					if(maxX > $(document).width()) { // Si le menu est trop a droite, on le decale a gauche
						subMenuPosition.left = subMenuPosition.left - (maxX - $(document).width());
						menu.css('left', subMenuPosition.left);
					}
					
					//Effets
					if (!$.fx.off) {
						menu.css({ top: subMenuPosition.top + 20, opacity: 0 }).animate({
							bottom: '+=20',
							opacity: 1
						}, 'fast');
					} else {
						menu.css('opacity', 1);
					}
					
					$(document).one('click', function() {
						$(document).one('click', function() {
							hideMenuFn();
						});
					});
					
					SNotification.showContainer();
				} else {
					hideMenuFn();
				}
			}
		});
		
		this.option('title', this.options.title);
		this.option('icon', this.options.icon);
	},
	_update: function(key, value) {
		switch (key) {
			case 'title':
				this.options._components.title.html(value);
				break;
			case 'icon':
				this.options._components.icon.attr('src', W.Icon.toIcon(value).realpath(22));
				break;
		}
	},
	show: function() {
		this.element.appendTo(SNotification.indicators);

		if (!SNotification.isContainerVisible()) {
			SNotification.autoShowContainer();
		}
	},
	hide: function() {
		this.element.detach();
	}
});
$.webos.appIndicator = function(options) {
	return $('<li></li>').appIndicator(options);
};

Webos.AppIndicator = function WAppIndicator(options) {
	this.options = options;

	var that = this;
	
	this.element = $('<li></li>').appendTo(SNotification.indicators);
	var indicator = $('<div></div>', { 'class': 'indicator' }).appendTo(this.element);
	$('<img />', { src: W.Icon.toIcon(options.icon).realpath(22), 'class': 'icon' }).appendTo(indicator);
	$('<span></span>', { 'class': 'title' }).html(options.title).appendTo(indicator);
	var menu;
	if (typeof options.menu != 'undefined') {
		menu = $(options.menu).appendTo(this.element);
	} else {
		menu = $('<ul></ul>').appendTo(this.element);
	}
	
	this.remove = function() {
		this.element.remove();
	};
	
	if (typeof options.click != 'undefined') {
		indicator.click(options.click);
	}
	
	if (!SNotification.isContainerVisible()) {
		SNotification.autoShowContainer();
	}
	
	indicator.css('width', '22px').mouseenter(function() {
		if (indicator.is('.expanded')) {
			return;
		}
		SNotification.container.children('li').children('.indicator.expanded').removeClass('expanded').stop().animate({
			width: '22px'
		}, 'fast');
		indicator.addClass('expanded').css('width', 'auto');
		var width = indicator.width();
		indicator.css('width', '22px').stop().animate({
			width: width
		}, 'fast');
	});
	
	indicator.click(function(e) {
		if (that.element.children('ul').children().length > 0) {
			var hideMenuFn = function() {
				if (!$.fx.off) {
					menu.animate({
						bottom: '+=20',
						opacity: 0
					}, 'fast', function() {
						$(this).hide();
					});
				} else {
					menu.hide();
				}
				that.element.removeClass('active');
				
				SNotification.hideContainer();
			};
			
			that.element.toggleClass('active');
			if (that.element.is('.active')) {
				var position = that.element.offset();
				var subMenuPosition = {
					bottom: (position.top - $(document).height()) + that.element.outerHeight() + 23,
					left: position.left
				};
				menu.css(subMenuPosition).show();
				
				var subMenuOffset = menu.offset();
				var maxX = subMenuOffset.left + (menu.outerWidth() + menu.outerWidth(true)) / 2;
				
				if(maxX > $(document).width()) { // Si le menu est trop a droite, on le decale a gauche
					subMenuPosition.left = subMenuPosition.left - (maxX - $(document).width());
					menu.css('left', subMenuPosition.left);
				}
				
				//Effets
				if (!$.fx.off) {
					menu.css({ top: subMenuPosition.top + 20, opacity: 0 }).animate({
						bottom: '+=20',
						opacity: 1
					}, 'fast');
				} else {
					menu.css('opacity', 1);
				}
				
				$(document).one('click', function() {
					$(document).one('click', function() {
						hideMenuFn();
					});
				});
				
				SNotification.showContainer();
			} else {
				hideMenuFn();
			}
		}
	});
};

function SIndicator(item) {
	item.appendTo(SIndicator.container);
	
	this.remove = function() {
		item.remove();
	};
}

SIndicator.container = $('<ul></ul>', { 'class': 'menu' });