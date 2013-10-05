/**
 * Widgets for windows management in Stunning UI.
 * @author Simon Ser
 * @since 1.0beta3
 */

(function($) {

//Window
$.webos.widget('window', 'window', {
	open: function() {
		var that = this;
		
		if (this.is('opened')) {
			return;
		}
		
		if (this._trigger('beforeopen', { type: 'beforeopen' }, { window: this.element }) === false) {
			return;
		}
		
		this.element.appendTo(Stunning.requestClientFrame());
		
		this._trigger('open', { type: 'open' }, { window: this.element });

		if (!$.w.window.workspace || this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
			this.element.fadeIn('fast', function() {
				that._trigger('afteropen', { type: 'afteropen' }, { window: that.element });
			});
		}

		this.options.states.opened = true;

		if (!$.w.window.workspace || this.options.workspace.id() == $.w.window.workspace.getCurrent().id()) {
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
		return;
	},
	minimize: function(animate) {
		return;
	},
	hide: function() {
		return;
	},
	show: function() {
		return;
	},
	_saveDimentions: function() {
		return;
	},
	center: function() {
		return;
	},
	setWidth: function(width) {
		return;
	},
	setHeight: function(height) {
		return;
	},
	resizable: function(value) {
		return;
	},
	draggable: function() {
		return;
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
			var that = this;

			Webos.require(stylesheet, function() {
				that._trigger('stylesheetload', { type: 'stylesheetload' }, { window: that.element });
			}, {
				styleContainer: this.selector()
			});
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

})(jQuery);