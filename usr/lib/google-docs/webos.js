(function() {
	var GoogleDocsWindow = function (file) {
		Webos.Observable.call(this);

		this.on('translationsloaded', function() {
			var that = this, t = this._translations;

			this._window = $.w.window.main({
				title: t.get('Google documents'),
				icon: new W.Icon('applications/google-docs'),
				width: 600,
				stylesheet: '/usr/share/css/google-docs/main.css',
				maximized: true
			});

			var windowContent = this._window.window('content');

			this._iframe = $('<iframe></iframe>').hide().appendTo(windowContent);
			this._openFileBtnContainer = $.w.container().addClass('container-select-file').appendTo(windowContent);
			this._openFileBtn = $.w.button(t.get('Open a file')).click(function() {
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
		_isGoogleDriveFile: function(file) {
			return Webos.isInstanceOf(file, Webos.GoogleDriveFile);
		},
		_getEditUrl: function(file) {
			if (!this._isGoogleDriveFile(file)) {
				return false;
			}

			return file.get('alternateLink');
		},
		_getViewUrl: function(file) {
			if (!this._isGoogleDriveFile(file)) {
				//Relative path to absolute one
				var fileLink = document.createElement("a");
				fileLink.href = file.get('realpath');
				var fileUrl = fileLink.href;

				return this._getViewUrlFromUrl(fileUrl);
			}

			return file.get('embedLink');
		},
		_getViewUrlFromUrl: function(fileUrl) {
			return 'http://docs.google.com/viewer?url='+encodeURIComponent(fileUrl)+'&embedded=true';
		},
		openFile: function(path, callback) {
			file = W.File.get(path);
			callback = W.Callback.toCallback(callback);

			var that = this, t = this._translations;

			that._window.window('loading', true);

			file.load([function(file) {
				var url = that._getEditUrl(file);

				var doOpenFile = function (url) {
					that._window.window('loading', true, {
						lock: false
					});

					that._iframe.load(function() {
						that._window.window('loading', false);
						callback.success();
					});

					that._openFileBtnContainer.hide();
					that._iframe.show().attr('src', url);

					callback.success();
				};

				if (url === false) {
					that._window.window('loading', false);

					var askToShareFile = function () {
						$.webos.window.confirm({
							title: t.get('Opening a file outside Google Drive'),
							label: t.get('The specified file is not in Google Drive. Do you want to share it to allow Google Drive to read it ?'),
							cancel: function() {
								askToCopyFile();
							},
							confirm: function() {
								shareFile();
							},
							cancelLabel: t.get('No'),
							confirmLabel: t.get('Share this file with Google Drive')
						}).window('open');
					};

					var shareFile = function () {
						that._window.window('loading', true, {
							message: t.get('Sharing file with Google Drive...')
						});

						file.share([function(shareData) {
							that._window.window('loading', false);

							var shareLink = document.createElement("a");
							shareLink.href = shareData.url;
							var shareUrl = shareLink.href,
								viewUrl = that._getViewUrlFromUrl(shareUrl);

							doOpenFile(viewUrl);
						}, function(res) {
							that._window.window('loading', false);
							res.triggerError();
							askToCopyFile();
						}]);
					};

					var askToCopyFile = function () {
						var mountedDevices = Webos.File.mountedDevices(), isGoogleDriveDevice = false;
						for (var localPath in mountedDevices) {
							var point = mountedDevices[localPath];

							if (point.get('driver') == 'GoogleDriveFile') {
								isGoogleDriveDevice = true;
								break;
							}
						}

						if (isGoogleDriveDevice) {
							$.webos.window.confirm({
								title: t.get('Opening a file outside Google Drive'),
								label: t.get('The specified file is not in Google Drive. Do you want to copy it to Google Drive ?'),
								cancel: function() {
									callback.success();
								},
								confirm: function() {
									copyFile();
								},
								cancelLabel: t.get('No'),
								confirmLabel: t.get('Copy this file to Google Drive')
							}).window('open');
						} else {
							callback.error(W.Callback.Result.error(t.get('Specified file is not in Google Drive')));
						}
					};

					var copyFile = function () {
						new NautilusFileSelectorWindow({
							title: t.get('Choose a destination folder'),
							parentWindow: that._window,
							selectDirs: true,
							filter: {
								mime_type: 'application/vnd.google-apps.folder'
							}
						}, function(files) {
							if (files.length) {
								var destDir = files[0];
								
								if (!that._isGoogleDriveFile(destDir)) {
									callback.error(W.Callback.Result.error(t.get('Specified directory is not in Google Drive')));
									return;
								}

								that._window.window('loading', true, {
									message: t.get('Copying file to Google Drive...')
								});

								var destFile = Webos.File.get(destDir.get('path') + '/' + file.get('basename'));
								console.log('original', file.get('mime_type'));
								destFile.hydrate({
									'mime_type': file.get('mime_type')
								});
								console.log('dest', destFile.get('mime_type'), destFile);

								Webos.File.copy(file, destFile, [function(destFile) {
									that._window.window('loading', false);
									that.openFile(destFile, callback);
								}, callback.error]);
							} else {
								callback.success();
							}
						});
					};

					askToShareFile();
				} else {
					doOpenFile(url);
				}
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