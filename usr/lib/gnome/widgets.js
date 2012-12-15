/**
 * Widgets pour l'interface GNOME.
 * @author Simon Ser <contact@simonser.fr.nf>
 * @version 1.0
 * @since 1.0alpha2
 */

//ContextMenu
$.webos.widget('contextMenu', 'container', {
	options: {
		target: undefined,
		disabled: false
	},
	_name: 'contextmenu',
	_create: function() {
		this._super('_create');

		if (typeof this.options.target != 'undefined') {
			this._setTarget(this.options.target);
		}
	},
	_setTarget: function(target) {
		var that = this;
		
		this.element.appendTo(W.UserInterface.Booter.current().element());
		
		this.element.hide();
		
		target.bind('contextmenu', function(e) {
			if (that.options.disabled) {
				return false;
			}
			
			var clickFn = function() {
				that.element.fadeOut('fast');
			};
			
			var childContextmenuOpened = false;
			$('ul.webos-contextmenu').each(function() {
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

			var y = e.pageY;
			var x = e.pageX;
			
			that.element.show();

			var maxY = y + that.element.height();
			var maxX = x + that.element.width();
			
			if(maxY > $(document).height()) { // Si le curseur est en bas de page, on remonte le menu contextuel
				y = y - that.element.height();
			}

			if(maxX > $(document).width()) { // Si le curseur est trop a droite, on le decale a gauche
				x = x - that.element.width();
			}
			
			// Afficher le menu
			$(document).unbind('click', clickFn);
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
			that.element.find('a').unbind('click', itemSelect);
			that.element.find('li:not(.disabled) a').click(itemSelect);
			
			// Hide bindings
			setTimeout(function() { // Delay for Mozilla
				$(document).one('click', clickFn);
			}, 0);
			
			that._trigger('open');
		});
		
		// Disable text selection
		if( $.browser.mozilla ) {
			this.element.each( function() { $(this).css({ 'MozUserSelect' : 'none' }); });
		} else if( $.browser.msie ) {
			this.element.each( function() { $(this).bind('selectstart.disableTextSelect', function() { return false; }); });
		} else {
			this.element.each(function() { $(this).bind('mousedown.disableTextSelect', function() { return false; }); });
		}
		
		target.add('ul.webos-contextmenu').bind('contextmenu', function(event) {
			event.preventDefault();
		});
		
		this.options.target = target;
	},
	destroy: function() {
		if (typeof this.options.target != 'undefined') {
			this.options.target.unbind('contextmenu');
		}
	}
});
$.webos.contextMenu = function(target) {
	return $('<ul></ul>').contextMenu({
		target: target
	});
};

//ContextMenuItem
$.webos.contextMenuItem = function(label, separator) {
	return $('<li></li>').menuItem({
		label: label,
		separator: separator
	});
};