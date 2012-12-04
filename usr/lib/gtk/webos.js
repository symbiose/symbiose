(function() {
	var Gtk = {};

	Gtk.Builder = function() {
		this._objects = $();
		this._translations = null;
	};
	Gtk.Builder.prototype = {
		addFromFile: function(file, callback) {
			var that = this;
			file = W.File.get(file);
			callback = W.Callback.toCallback(callback);

			file.readAsText([function(contents) {
				if (that.addFromString(contents) !== false) {
					callback.success();
				} else {
					callback.error();
				}
			}, callback.error]);
		},
		addFromString: function(contents) {
			var xmlDoc, $xml;
			try {
				xmlDoc = $.parseXML(contents);
				$xml = $(xmlDoc);
			} catch (err) {
				return false;
			}

			var $interface = $xml.find('interface');
			this._objects = this._objects.add($interface.children('object'));
		},
		object: function(name) {
			var $obj = this._objects.filter('#' + name);

			if ($obj.length == 0) {
				return $();
			}

			return this._parseObject($obj);
		},
		translate: function(translations) {
			this._translations = translations;
		},
		_parseObject: function($obj) {
			var that = this, t = this._translations;

			var objClass = String($obj.attr('class')).toLowerCase();

			var properties = {};
			$obj.children('property').each(function() {
				var value = $(this).text();

				if (/^(False|True)$/i.test(value)) {
					value = (/^(True)$/i.test(value)) ? true : false;
				} else if (/^[0-9.]+$/i.test(value)) {
					value = parseFloat(value);
				}

				if (t && String($(this).attr('translatable')).toLowerCase() == 'yes') {
					value = t.get(value);
				}

				properties[$(this).attr('name')] = value;
			});

			var $childs = $();
			$obj.children('child').each(function() {
				//$(this).attr('type')
				var $child = $(this).children('object');
				var $childWidget = that._parseObject($child);
				$childs = $childs.add($childWidget);
			});

			var $widget = $();
			if (Gtk.Builder._widgets[objClass]) {
				$widget = Gtk.Builder._widgets[objClass](properties, $childs);
			} else {
				$widget = Gtk.Builder._widgets[Gtk.Builder._defaultWidget](properties, $childs);
			}

			if (!properties.visible) {
				$widget.hide();
			}

			if (properties.tooltip_markup) {
				$widget.attr('title', properties.tooltip_markup);
			}
			if (properties.tooltip_text) {
				$widget.attr('title', properties.tooltip_markup);
			}

			if (properties.width_request) {
				$widget.css('width', properties.width_request);
			}
			if (properties.height_request) {
				$widget.css('height', properties.height_request);
			}

			return $widget;
		}
	};
	Gtk.Builder._defaultWidget = 'gtkcontainer';
	Gtk.Builder._widgets = {
		gtkcontainer: function(properties, $childs) {
			var $widget = $.w.container();
			$widget.append($childs);
			return $widget;
		},
		gtkhbox: function(properties, $childs) {
			var $widget = $.w.container();

			$childs.each(function() {
				var $container = $.w.container();
				$container.append(this);
				$container.css('display','inline-block');
				$widget.append($container);
			});

			return $widget;
		},
		gtkvbox: function(properties, $childs) {
			var $widget = $.w.container();
			$widget.append($childs);
			return $widget;
		},
		gtklabel: function(properties) {
			var label = properties.label;

			if (properties.mnemonic_widget) {
				var mnemonic = /_(.)/.exec(label);
				label = label.replace('_', '');
			}

			var $widget = $.w.label(label);
			//mnemonic

			return $widget;
		},
		gtkexpander: function(properties, $childs) {
			var $widget = $.w.spoiler();

			var $label = $childs.filter('.webos-label').first();
			if ($label.length) {
				$widget.spoiler('option', 'label', $label);
			}

			$widget.spoiler('content').append($childs.not($label));

			if (properties.expanded) {
				$widget.spoiler('option', 'shown', true);
			}

			return $widget;
		},
		gtkbutton: function(properties) {
			var $widget = $.w.button(properties.label);
			return $widget;
		},
		gtkhbuttonbox: function(properties, $childs) {
			var $widget = $.w.buttonContainer();
			$widget.append($childs);
			//properties.layout_style
			return $widget;
		},
		gtkimage: function(properties) {
			var $widget = $.w.image(properties.file || new W.Icon(properties.icon_name));
			return $widget;
		},
		gtkentry: function(properties) {
			var $widget = $.w.textEntry('', properties.text);
			return $widget;
		},
		gtkspinbutton: function(properties) {
			var $widget = $.w.numberEntry('');

			if (properties.climb_rate) {
				$widget.numberEntry('option', 'step', properties.climb_rate);
			}

			return $widget;
		},
		gtkprogressbar: function(properties) {
			var $widget = $.w.progressbar((typeof properties.fraction == 'number') ? properties.fraction * 100 : undefined);
			return $widget;
		},
		gtkcheckbutton: function(properties) {
			var $widget = $.w.checkButton(properties.label, properties.receives_default);
			return $widget;
		},
		gtkswitch: function(properties) {
			var $widget = $.w.switchButton('', properties.active);
			return $widget;
		},
		gtkwindow: function(properties, $childs) {
			var $widget = $.w.window({
				height: properties.default_height,
				width: properties.default_width,
				resizable: properties.resizable,
				icon: properties.icon_name,
				title: properties.title
			});

			$widget.window('content').append($childs);

			return $widget;
		},
		gtkdialog: function(properties, $childs) {
			var $widget = $.w.window.dialog({
				height: properties.default_height,
				width: properties.default_width,
				resizable: properties.resizable,
				icon: properties.icon_name,
				title: properties.title
			});

			$widget.window('content').append($childs);

			return $widget;
		}
	};

	window.Gtk = Gtk;
})();