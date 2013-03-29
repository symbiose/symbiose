(function() {
	var GoogleDocsWindow = function GoogleDocsWindow(file) {
		Webos.Observable.call(this);

		this.bind('translationsloaded', function() {
			var that = this, t = this._translations;

			this._window = $.w.window({
				title: t.get('Google documents'),
				icon: new W.Icon('applications/google-docs'),
				width: 600,
				stylesheet: '/usr/share/css/google-docs/main.css',
				maximized: true
			});

			var windowContent = this._window.window('content');

			this._iframe = $('<iframe></iframe>').hide().appendTo(windowContent);
			this._openFileBtnContainer = $.w.container().addClass('container-select-file').appendTo(windowContent);
			this._openFileBtn = $.w.button('Ouvrir un fichier').click(function() {
				that.selectFile();
			}).addClass('btn-select-file').appendTo(this._openFileBtnContainer);

			this._window.window('open');

			this.notify('ready');

			if (file) {
				that.openFile(file);
			}
		});

		Webos.TranslatedLibrary.call(this);
	};

	GoogleDocsWindow.prototype = {
		_translationsName: 'google-docs',
		_getEditUrl: function(file) {
			if (!Webos.isInstanceOf(file, Webos.GoogleDriveFile)) {
				return false;
			}

			return file.get('alternateLink');
		},
		_getViewUrl: function() {
			if (!Webos.isInstanceOf(file, Webos.GoogleDriveFile)) {
				return false;
			}

			return file.get('embedLink');
		},
		openFile: function(path, callback) {
			file = W.File.get(path);
			callback = W.Callback.toCallback(callback);

			var that = this, t = this._translations;

			that._window.window('loading', true);

			file.load([function(file) {
				var url = that._getEditUrl(file);

				if (url === false) {
					callback.error(W.Callback.Result.error(t.get('Specified file is not in Google Docs')));
					return;
				}

				that._window.window('loading', true, {
					lock: false
				});

				that._iframe.load(function() {
					that._window.window('loading', false);
				});

				that._openFileBtnContainer.hide();
				that._iframe.show().attr('src', url);
			}, callback.error]);
		},
		selectFile: function(callback) {
			var that = this;
			callback = Webos.Callback.toCallback(callback);

			new NautilusFileSelectorWindow({
				parentWindow: this._window
			}, function(files) {
				if (files.length) {
					that.openFile(files[0]);
				}
			});
		}
	};

	Webos.inherit(GoogleDocsWindow, Webos.Observable);
	Webos.inherit(GoogleDocsWindow, Webos.TranslatedLibrary);

	window.GoogleDocsWindow = GoogleDocsWindow; //Export API
})();