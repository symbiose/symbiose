/**
 * Widgets pour l'interface GNOME.
 * @author Simon Ser <contact@simonser.fr.nf>
 * @version 1.1
 * @since 1.0alpha2
 */

/**
 * A context menu.
 * @param  {jQuery} target The context menu target.
 * @param  {String} selector An additional selector.
 * @constructor
 * @augments $.webos.container
 */
$.webos.contextMenu = function(target, selector) {
	return $('<ul></ul>').contextMenu({
		target: target,
		selector: selector
	});
};

$.webos.btnContextMenu = function(target, selector) {
	return $('<ul></ul>').contextMenu({
		target: target,
		selector: selector,
		event: 'click'
	});
};

$.webos.contextMenu.prototype = {
	options: {
		event: 'contextmenu',
		target: undefined,
		selector: undefined,
		disabled: false
	},
	_name: 'contextmenu',
	_create: function () {
		var that = this;

		this._super('_create');

		if (typeof this.options.target != 'undefined') {
			this._setTarget(this.options.target);
		}
	},
	_eventName: function () {
		return this.options.event+'.'+this.id()+'.contextmenu.gnome';
	},
	_setTarget: function (target) {
		var that = this;
		
		this.element.hide();
		//console.trace(); //TODO
		target.on(this._eventName(), this.options.selector, function (e) {
			e.preventDefault();

			if (that.options.disabled) {
				return false;
			}
			
			// Hide the menu
			var clickFn = function() {
				that.element.fadeOut('fast', function () {
					$(this).detach();
					// TODO: elements detached from the DOM will survive forever (no cleanup)
					// It's a good idea to destroy widgets when the running process is stopped
				});
			};
			
			var childContextmenuOpened = false;
			$('ul.webos-contextmenu').each(function () {
				if ($(this).is(':visible')) {
					var childTarget = $(this).contextMenu('option', 'target');
					if (target.is(childTarget)) {
						$(this).hide();
					} else if (target.find(childTarget).length > 0) {
						childContextmenuOpened = true;
					} else {
						$(this).hide();
					}
				}
			});
			
			if (childContextmenuOpened) {
				return false;
			}

			var eventData = { target: e.currentTarget };
			if (that._trigger('beforeopen', e, eventData) === false) {
				return false;
			}

			// Now you're sure the contextmenu will be opened
			e.stopPropagation();

			var y = e.pageY;
			var x = e.pageX;

			that.element
				.appendTo(W.UserInterface.Booter.current().element())
				.show();

			var maxY = y + that.element.height();
			var maxX = x + that.element.width();

			if(maxY > $(window).height()) { // Si le curseur est en bas de page, on remonte le menu contextuel
				y -= that.element.height();
			}

			if(maxX > $(window).width()) { // Si le curseur est trop a droite, on le decale a gauche
				x -= that.element.width();
			}
			
			// Afficher le menu
			$(document).off('mousedown', clickFn);
			that.element.hide().css({ top: y, left: x }).fadeIn('fast');
			
			// Hover events
			that.element.find('a').hover(function() {
				that.element.find('li.hover').removeClass('hover');
				$(this).parent().addClass('hover');
			}, function() {
				that.element.find('li.hover').removeClass('hover');
			});
			
			// When items are selected
			var itemSelect = function(event) {
				clickFn();
				event.preventDefault();
			};
			that.element.find('a').off('click', itemSelect);
			that.element.find('li:not(.disabled) a').click(itemSelect);
			
			// Hide bindings
			setTimeout(function() { // Delay for Mozilla
				$(document).one('mousedown', clickFn);
			}, 0);
			
			that._trigger('open', e, eventData);
		});
		
		// Disable text selection
		this.element.each( function() {
			$(this).css({
				'-moz-user-select' : 'none',
				'-webkit-user-select' : 'none',
				'-ms-user-select' : 'none',
				'-o-user-select' : 'none',
				'user-select' : 'none'
			});
		});

		this.element.on('contextmenu', function(event) {
			event.preventDefault();
		});

		this.options.target = target;
	},
	destroy: function() {
		if (typeof this.options.target != 'undefined') {
			this.options.target.off(this._eventName());
		}
		this.element.remove();
	}
};

$.webos.widget('contextMenu', 'container');


$.webos.contextMenuItem = function(label, separator) {
	return $('<li></li>').menuItem({
		label: label,
		separator: separator
	});
};