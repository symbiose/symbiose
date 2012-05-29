function SNotification(opts) {
	return $.webos.notification(opts);
}
SNotification.element = $('<div></div>', { 'class': 'notifications-area' }).css('display', 'none').appendTo(W.UserInterface.current.element);
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
var notificationProperties = $.webos.extend($.webos.properties.get('container'), {
	options: {
		title: 'Message',
		message: '',
		icon: new SIcon('/usr/share/images/gnome/light.png'),
		life: 7,
		buttons: []
	},
	_name: 'notification',
	_create: function() {
		var that = this;
		
		this.options._components.header = $('<div></div>', { 'class': 'header' }).appendTo(this.element);
		$('<img />', { src: SIcon.toIcon(this.options.icon).realpath(24), alt: '', 'class': 'icon' }).appendTo(this.options._components.header);
		$('<strong></strong>').html(this.options.title+' : ').appendTo(this.options._components.header);
		this.options._components.details = $('<span></span>', { 'class': 'details' }).html(this.options.message).appendTo(this.options._components.header);
		this.options._components.content = $('<div></div>', { 'class': 'content' }).hide().appendTo(this.element);
		this.options._components.message = $('<div></div>', { 'class': 'message' }).html(this.options.message).appendTo(this.options._components.content);
		
		if (this.options.buttons.length > 0) {
			var buttonContainer = $.w.buttonContainer().appendTo(this.options._components.content);
			for (var i = 0; i < this.options.buttons.length; i++) {
				this.options.buttons[i].appendTo(buttonContainer);
			}
		}
		
		this.element.hover(function() {
			clearTimeout(that.options._timer);
			that.options._components.details.stop().fadeOut('fast');
			that.options._components.content.stop().slideDown('fast');
		}, function() {
			that.options._components.details.stop().fadeIn('fast');
			that.options._components.content.stop().slideUp('fast');
			that._startTimer();
		}).click(function(e) {
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
$.webos.widget('notification', notificationProperties);

$.webos.notification = function(options) {
	return $('<div></div>').notification(options);
};

function SAppIndicator(options) {
	this.options = options;

	var that = this;
	
	this.element = $('<li></li>').appendTo(SNotification.indicators);
	var indicator = $('<div></div>', { 'class': 'indicator' }).appendTo(this.element);
	$('<img />', { src: SIcon.toIcon(options.icon).realpath(22), 'class': 'icon' }).appendTo(indicator);
	$('<span></span>', { 'class': 'title' }).html(options.title).appendTo(indicator);
	var menu;
	if (typeof options.menu != 'undefined') {
		menu = options.menu.appendTo(this.element);
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
		SNotification.showContainer();
		var timer = setTimeout(function() {
			if (SNotification.showed) {
				SNotification.hideContainer();
			}
		}, 2000);
		SNotification.element.one('mouseenter', function() {
			clearTimeout(timer);
			SNotification.showed++;
		});
		SNotification.showed--;
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
				
				SNotification.showed++;
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
				
				SNotification.showed--;
			} else {
				hideMenuFn();
			}
		}
	});
}

function SIndicator(item) {
	item.appendTo(SIndicator.container);
	
	this.remove = function() {
		item.remove();
	};
}

SIndicator.container = $('<ul></ul>', { 'class': 'menu' });