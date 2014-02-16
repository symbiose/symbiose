(function () {
	if (Webos.xtag) { //Library already loaded
		return;
	}

	Webos.require('/usr/lib/xtag/core.min.js', function() {
		var xtag = {};

		xtag.register = function(widgetName, options) {
			window.xtag.register('x-' + widgetName, options);
		};

		xtag.registerFromWidget = function(widgetName, widgetOptions) {
			xtag.register(widgetName.replace('.', '-'), {
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
			var $container = $('<div></div>').html(contents);
			window.xtag.innerHTML($container[0], contents);

			var $els = $container.children();

			return $els;
		};

		xtag.loadUI = function(file, callback) {
			file = W.File.get(file);
			callback = W.Callback.toCallback(callback);

			file.readAsText(function(contents) {
				var $elements = xtag.parse(contents);

				$elements.detach();
				$elements.parent().empty().remove();
				callback.success($elements);
			});
		};

		Webos.xtag = xtag;

		xtag.importWidgets();
	});
})();