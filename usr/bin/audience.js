var proc = this, args = proc.getArguments();

(function () {
	var Audience = function () {
		Webos.Observable.call(this);

		this.initialize();
	};
	Audience.prototype = {
		_$win: $(),
		_$video: $(),
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/audience/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');

				var $win = that._$win;
				that._$video = $win.find('video');

				$win.window('open');

				that._initUi();

				that.trigger('ready');
			});
		},
		_initUi: function () {
			var that = this;
			var $win = this._$win;

			var handlers = {
				'action-file-open': function () {
					that.openFile();
				}
			};

			for (var handlerName in handlers) {
				(function (handlerName, handler) {
					$win.find('.'+handlerName).click(function () {
						handler();
					});
				})(handlerName, handlers[handlerName]);
			}
		},
		_switchToView: function (newView) {
			var $win = this._$win,
				$ctn = $win.find('.player-ctn');

			$ctn.children().hide();
			$ctn.children('.'+newView+'-ctn').show();
		},
		_openFile: function (file) {
			var that = this;

			if (!file) {
				W.Error.trigger('Cannot open file: no file specified');
				return;
			}
			file = W.File.get(file);

			this._$video.attr('src', file.get('realpath'));

			this._switchToView('video');
		},
		openFile: function (file) {
			var that = this;

			if (file) {
				that._openFile(file);
				return;
			}

			new NautilusFileSelectorWindow({
				parentWindow: this._$win,
				mime_type: 'video/*'
			}, function(files) {
				if (files.length) {
					that._openFile(files[0]);
				}
			});
		},
	};
	Webos.inherit(Audience, Webos.Observable);

	Audience.open = function (options) {
		var audience = new Audience();

		options = $.extend({
			file: ''
		}, options);

		if (options.file) {
			audience.one('ready', function () {
				audience.openFile(options.file);
			});
		}

		return audience;
	};

	var options = {};
	if (args.isParam(0)) {
		options.file = args.getParam(0);
	}
	Audience.open(options);
})();