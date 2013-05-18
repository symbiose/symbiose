Webos.require('/usr/lib/xtag/core.min.js', function() {
	var xtag = {};

	xtag.register = function(widgetName, options) {
		window.xtag.register('x-' + widgetName, options);
	};

	xtag.registerFromWidget = function(widgetName, widgetOptions) {
		xtag.register(widgetName, {
			lifecycle: {
				created: function() {
					var options = {};

					for (var i = 0; i < this.attributes.length; i++) {
						var attr = this.attributes[i],
						key = attr.nodeName,
						value = attr.value;

						if (typeof widgetOptions.options[key] == 'boolean') {
							if (value == 'false' || value == '0') {
								value = false;
							} else {
								value = true;
							}
						} else if (typeof widgetOptions.options[key] == 'number') {
							var numericValue = Number(value);

							if (!isNaN(numericValue)) {
								value = numericValue;
							}
						}

						options[key] = value;
					}

					$(this)[widgetName](options);
				}
			}
		});
	};

	xtag.importWidgets = function() {
		var widgets = $.webos.widget.list();

		for (var widgetName in widgets) {
			xtag.registerFromWidget(widgetName, widgets[widgetName].prototype);
		}
	};

	xtag.parse = function(contents) {
		var $container = $('<div></div>').hide().appendTo('body').html(contents);

		return $container.children();
	};

	xtag.loadUI = function(file, callback) {
		file = W.File.get(file);
		callback = W.Callback.toCallback(callback);

		file.readAsText(function(contents) {
			var $elements = xtag.parse(contents);

			setTimeout(function() { //Waiting for the DOM to be ready
				callback.success($elements);
			}, 0);
		});
	};

	Webos.xtag = xtag;

	xtag.importWidgets();
});