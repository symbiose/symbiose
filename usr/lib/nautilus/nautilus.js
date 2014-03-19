Webos.require([
	{
		path: '/usr/share/css/nautilus/main.css',
		styleContainer: Webos.UserInterface.Booter.current().element()
	},
	{
		path: '/usr/share/css/nautilus/window.css',
		process: false //Preload without processing this file
	},

	'/usr/lib/nautilus/widgets.js',
	'/usr/lib/jquery.filedrop.js',
	'/usr/lib/fileuploader.js',
	'/usr/lib/webos/applications.js'
], function() {
	var NautilusFileSelectorWindow = function NautilusFileSelectorWindow(options, userCallback) {
		Webos.Observable.call(this);
		
		this._translationsName = 'nautilus';
		
		this.bind('translationsloaded', function(data) {
			var t = data.translations;
			
			this._window = $.w.window.dialog({
				title: (typeof options.title != 'undefined') ? options.title : t.get('File selection'),
				width: 550,
				icon: new W.Icon('apps/filemanager'),
				resizable: false,
				hideable: false,
				parentWindow: options.parentWindow
			});
			
			var that = this;
			
			this._callbackCalled = false;
			
			this._nautilus = $.w.nautilusFileSelector({
				select: function(event, data) {
					that._callbackCalled = true;
					that._window.window('close');
					
					var selection = data.selection;
					if (!selection) {
						selection = [];
					}
					if (!selection instanceof Array) {
						selection = [selection];
					}
					
					userCallback(selection);
				},
				cancel: function() {
					that._callbackCalled = true;
					that._window.window('close');
					userCallback([]);
				},
				selectDirs: options.selectDirs,
				selectMultiple: options.selectMultiple,
				exists: options.exists,
				extensions: options.extensions,
				mime_type: options.mime_type
			});
			
			var nautilus = this._nautilus.nautilusFileSelector('nautilus');
			
			this._shortcuts = $.webos.nautilusFileSelectorShortcuts({
				open: function(path) {
					nautilus.nautilus('readDir', path);
				},
				select: function(files) {
					that._callbackCalled = true;
					that._window.window('close');
					userCallback(files);
				},
				selectDirs: options.selectDirs,
				selectMultiple: options.selectMultiple,
				exists: options.exists,
				extensions: options.extensions,
				mime_type: options.mime_type
			}).appendTo(this._window.window('content'));
			
			this._nautilus.appendTo(this._window.window('content'));
			
			this._window.on('windowclose', function() {
				if (!that._callbackCalled) {
					userCallback([]);
				}
			});
			
			this._refreshHeader = function(dir) {
				var headers = this._window.window('header');
				if (typeof this._toolbar != 'undefined') {
					this._toolbar.remove();
				}
				this._toolbar = $.w.toolbarWindowHeader().appendTo(headers);
				
				var location = dir.split('/');
				
				var createButtonFn = function createButtonFn(userDir, path) {
					var button = $.w.toolbarWindowHeaderItem(userDir);
					button.click(function() {
						nautilus.nautilus('readDir', path);
					});
					return button;
				};
				
				if (dir == '/') {
					createButtonFn('/', '/').appendTo(this._toolbar);
				} else {
					var stack = '';
					for(var i = 0; i < location.length; i++) {
						stack += location[i]+'/';
						var userDir = location[i];
						if (userDir === '') {
							userDir = '/';
						}
						if (userDir == '~') {
							userDir = t.get('Private folder');
						}
						var button = createButtonFn(userDir, stack);
						this._toolbar.append(button);
					}
				}
				
				this._toolbar.find('li').last().addClass('active');
			};
			
			nautilus.on('nautilusreadstart', function(e, data) {
				that._refreshHeader(data.location);
				that._window.window('loading', true);
			}).on('nautilusreadcomplete', function() {
				that._window.window('loading', false);
			}).on('nautilusreaderror', function(e, data) {
				that._refreshHeader(data.location);
			});
			
			if ($.webos.widget.is(nautilus, 'nautilus')) { //See issue #229
				this._refreshHeader(nautilus.nautilus('location'));
			}
			
			this._window.window('open');
			
			this.trigger('ready');
		});
		
		Webos.TranslatedLibrary.call(this);
	};
	Webos.inherit(NautilusFileSelectorWindow, Webos.Observable); //Heritage de Webos.Observable
	Webos.inherit(NautilusFileSelectorWindow, Webos.TranslatedLibrary); //Heritage de Webos.TranslatedLibrary

	window.NautilusFileSelectorWindow = NautilusFileSelectorWindow; //Export API

	var NautilusDeviceMounterWindow = function NautilusDeviceMounterWindow(driver) {
		Webos.Observable.call(this);
		
		this._translationsName = 'nautilus';
		
		this.bind('translationsloaded', function(data) {
			var t = data.translations;

			var thisProcess = W.Process.current(), canWriteUserFiles = true;
			if (thisProcess) {
				canWriteUserFiles = thisProcess.getAuthorizations().can('file.user.write');
			}
			
			this._window = $.w.window.dialog({
				title: t.get('Volume mounting'),
				width: 400,
				icon: new W.Icon('devices/harddisk')
			});
			
			this._drivers = {
				'FTPFile': {
					'title': 'FTP',
					'icon': 'places/folder-remote',
					'lib': '/usr/lib/webos/ftp.js'
				},
				'DropboxFile': {
					'title': 'Dropbox',
					'icon': 'applications/dropbox',
					'lib': '/usr/lib/dropbox/webos.js'
				},
				'GoogleDriveFile': {
					'title': 'Google Drive',
					'icon': 'applications/google-drive',
					'lib': '/usr/lib/google-api/webos.js'
				},
				'WebosFile': {
					'title': 'Webos',
					'icon': 'places/folder-remote'
				}
			};

			for (var name in this._drivers) {
				this._drivers[name] = $.extend({
					title: 'Unknown driver',
					icon: 'places/folder-remote',
					lib: null
				}, this._drivers[name]);
			}
			
			this.showDrivers = function(driver) {
				var that = this;

				var form = $.w.entryContainer().submit(function() {
					if (that._drivers[selectedDriver].lib) {
						that._window.window('loading', true, {
							message: t.get('Loading of ${driver} library in progress...', { driver: that._drivers[selectedDriver].title })
						});

						W.ScriptFile(that._drivers[selectedDriver].lib);
					}

					var local = localEntry.nautilusFileEntry('value'), remote = remoteEntry.textEntry('value'), permanent = permanentEntry.switchButton('value');
					var point = new Webos.File.MountPoint({
						remote: remote,
						driver: selectedDriver
					}, local);

					var mountFn = function() {
						that._window.window('loading', true, {
							message: t.get('Mounting of ${driver} volume in progress...', { driver: that._drivers[selectedDriver].title })
						});
						
						var displaySuccessFn = function() {
							$.w.notification({
								title: t.get('${driver} has been mounted', { driver: that._drivers[selectedDriver].title }),
								message: t.get('${driver} has been mounted on « ${local} ».', { driver: that._drivers[selectedDriver].title, local: local }),
								icon: that._drivers[selectedDriver].icon,
								widgets: [$.w.button(t.get('Unmount')).click(function() { Webos.File.umount(local); }),
								          $.w.button(t.get('Open')).click(function() { new NautilusWindow(local); })]
							});
						};
						
						Webos.File.mount(point, [function(point) {
							if (permanent) {
								that._window.window('loading', true, {
									message: t.get('Adding persistant mounting...')
								});
								Webos.File.fstab.add(point, [function() {
									that._window.window('close');
									displaySuccessFn();
								}, function(resp) {
									that._window.window('loading', false);
									resp.triggerError(t.get('Can\'t perform the persistant mounting'));
								}]);
							} else {
								that._window.window('close');
								displaySuccessFn();
							}
						}, function(resp) {
							that._window.window('loading', false);
							resp.triggerError(t.get('Can\'t mount the volume'));
						}]);
					};
					
					that._window.window('loading', true, {
						message: t.get('Checking local folder "${local}"...', { local: local })
					});

					if (canWriteUserFiles) {
						W.File.load(local, [function(file) {
							if (!file.get('is_dir')) {
								that._window.window('loading', false);
								Webos.Error.trigger(t.get('Can\'t mount the volume on "${local}" : the specified file is not a folder', { local: local }));
								return;
							}
							
							if (!Webos.isInstanceOf(file, Webos.WebosFile)) {
								that._window.window('loading', false);
								Webos.Error.trigger(t.get('Can\'t mount the volume on "${local}" : the specified folder is in a mounted volume', { local: local }));
								return;
							}
							
							mountFn();
						}, function(resp) {
							that._window.window('loading', true, {
								message: t.get('Creating the local folder "${local}"...', { local: local })
							});
							W.File.createFolder(local, [function(file) {
								mountFn();
							}, function(resp) {
								that._window.window('loading', false);
								resp.triggerError(t.get('Can\'t create the local folder "${local}"', { local: local }));
							}]);
						}]);
					} else {
						mountFn();
					}
				}).appendTo(this._window.window('content'));
				
				form.append($.w.label(t.get('Select the service to use :')));
				
				var list = $.w.iconsList();
				
				var selectedDriver = null;
				var selectDriverFn = function(name) {
					if (!that._drivers[name]) {
						return;
					}
					submitButton.button('option', 'disabled', false);
					spoiler.show();
					localEntry.nautilusFileEntry('value', '~/' + that._drivers[name].title);
					selectedDriver = name;
				};
				
				for (var name in this._drivers) {
					(function(name, driverData) {
						var item = $.w.iconsListItem(driverData.icon, driverData.title)
							.click(function() {
								selectDriverFn(name);
							})
							.appendTo(list);

						if (driver == name) {
							item.iconsListItem('active', true);
						}
					})(name, this._drivers[name]);
				}
				
				list.appendTo(form);
				
				var spoiler = $.w.spoiler(t.get('Advanced settings')).hide().appendTo(form);
				var spoilerContents = spoiler.spoiler('content');
				var localEntry = $.w.nautilusFileEntry(t.get('Local folder :'), {
					fileSelector: {
						selectDirs: true,
						exists: false,
						title: t.get('Select the local folder'),
						parentWindow: this._window
					}
				}).appendTo(spoilerContents);
				var remoteEntry = $.w.textEntry(t.get('Remote folder :'), '/').appendTo(spoilerContents);
				
				var permanentEntry = $.w.switchButton(t.get('Persistant mounting'), canWriteUserFiles).appendTo(spoilerContents);
				
				var buttons = $.w.buttonContainer().appendTo(form);
				$.w.button(t.get('Cancel')).click(function() {
					that._window.window('close');
				}).appendTo(buttons);
				var submitButton = $.w.button(t.get('Confirm'), true).button('option', 'disabled', true).appendTo(buttons);
				
				if (driver) {
					selectDriverFn(driver);
				}
			};
			
			if (driver) {
				this.showDrivers(driver);
			} else {
				this.showDrivers();
			}
			
			this._window.window('open');
			
			this.notify('ready');
		});
		
		Webos.TranslatedLibrary.call(this);
	};
	Webos.inherit(NautilusDeviceMounterWindow, Webos.Observable); //Heritage de Webos.Observable
	Webos.inherit(NautilusDeviceMounterWindow, Webos.TranslatedLibrary); //Heritage de Webos.TranslatedLibrary

	window.NautilusDeviceMounterWindow = NautilusDeviceMounterWindow; //Export API

	var NautilusWindow = function (dir, userCallback) {
		Webos.Observable.call(this);

		this.options = {
			location: dir
		};

		this.on('translationsloaded', function(data) {
			this.initialize();
			return;

			var t = data.translations;

			var that = this;

			if (typeof dir == 'undefined') {
				dir = '~';
			}

			this.nautilus.bind('nautilusreadstart', function(e, data) {
				that._refreshHeader(data.location);
				that.window.window('loading', true, {
					message: t.get('Opening folder « ${name} »...', { name: data.location.replace(/\/$/, '').split('/').pop() })
				});
			}).bind('nautilusreadcomplete', function() {
				that.window.window('loading', false);
			}).bind('nautilusreaderror', function(e, data) {
				that._refreshHeader(data.location);
			});
			
			/*
			$.w.menuItem(t.get('Refresh'), true)
				.click(function() {
					that.refresh();
				})
				.appendTo(viewItemContent);
			$.w.menuItem(t.get('Show hidden files'), true)
				.click(function() {
					var value = !(that.nautilus.nautilus('option', 'showHiddenFiles'));

					if (value) {
						$(this).menuItem('option', 'label', t.get('Don\'t show hidden files'));
					} else {
						$(this).menuItem('option', 'label', t.get('Show hidden files'));
					}

					that.nautilus.nautilus('option', 'showHiddenFiles', value);
					that.nautilus.nautilus('refresh');
				})
				.appendTo(viewItemContent);
*/
			
			this.window.window('open');
			
			this._refreshHeader(dir);
			
			this.notify('ready');
		});
		
		Webos.TranslatedLibrary.call(this);
	};
	NautilusWindow.prototype = {
		_$win: $(),
		_$nautilus: $(),
		_$shortcuts: $(),
		_translationsName: 'nautilus',
		_version: '0.4',
		initialize: function () {
			var that = this;
			
			W.xtag.loadUI('/usr/share/templates/nautilus/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');

				var $win = that._$win;

				$win.window('open');

				that._initUi();
			});
		},
		_initUi: function () {
			var that = this, $win = this._$win, t = this.translations();

			//Translations
			$win.window('option', 'title', t.get('File manager'));
			$win.find('[data-l10n-prop]').each(function () {});
			$win.find('x-menuWindowHeader').find('x-menuItem').each(function () {
				var toTranslate = $(this).attr('label');
				$(this).attr('label', t.get(toTranslate));
			});

			//Shortcuts
			this._$shortcuts = $.webos.nautilusShortcuts(function(path) {
				that._$nautilus.nautilus('readDir', path);
			}).replaceAll($win.find('.nautilus-shortcuts-ctn'));

			//Nautilus
			this._$nautilus = $.w.nautilus({
				directory: this.options.location,
				readstart: function(e, data) {
					that._refreshHeader(data.location);
					that.toggleSearch(false);
					that._$win.window('loading', true, {
						message: t.get('Opening folder « ${name} »...', { name: data.location.replace(/\/$/, '').split('/').pop() })
					});
				},
				readcomplete: function(e, data) {
					that._refreshHeader(data.location);
					that._$win.window('loading', false);
				},
				readerror: function(e, data) {
					that._refreshHeader(data.location);
				}
			}).replaceAll($win.find('.nautilus-ctn'));

			//Handlers
			var handlers = {
				'btn-file-new-window': function () {
					W.Cmd.execute('nautilus "'+that._$nautilus.nautilus('location')+'"');
				},
				'btn-file-upload': function () {
					that._$nautilus.nautilus('openUploadWindow');
				},
				'btn-file-new-folder': function () {
					that._$nautilus.nautilus('createFile', t.get('New folder'), true);
				},
				'btn-file-new-file': function () {
					that._$nautilus.nautilus('createFile', t.get('New file'));
				},
				'btn-file-mount': function () {
					W.Cmd.execute('nautilus-mounter');
				},
				'btn-file-quit': function () {
					that._$win.window('close');
				},

				'btn-edit-select-all': function () {
					that._$nautilus.nautilus('items').addClass('active');
				},
				'btn-edit-select-filter': function () {
					var selectWindow = $.w.window.dialog({
						parentWindow: that._$win,
						title: t.get('Select elements corresponding to...'),
						width: 400,
						resizable: false,
						hideable: false
					});
					var form = $.w.entryContainer()
						.appendTo(selectWindow.window('content'))
						.submit(function() {
							var filter = textEntry.textEntry('content').val();
							var exp = new RegExp(filter);
							selectWindow.window('close');
							that._$nautilus.nautilus('items').each(function() {
								if (exp.test($(this).data('file')().getAttribute('basename'))) {
									$(this).addClass('active');
								}
							});
						});
					var textEntry = $.w.textEntry(t.get('Pattern (regex) :')).appendTo(form);
					$.w.label('<strong>'+t.get('Samples')+'</strong> : <em>.png$</em>, <em>fich</em>, <em>^.</em>...').appendTo(form);
					var buttons = $.w.buttonContainer().appendTo(form);
					$.w.button('Valider', true).appendTo(buttons);
					
					selectWindow.window('open');
					
					textEntry.textEntry('content').focus();
				},
				'btn-edit-select-invert': function () {
					that._$nautilus.nautilus('items').toggleClass('active');
				},
				'btn-edit-search': function () {
					that.toggleSearch();
				},

				'btn-view-order-name': function () {
					that._$nautilus.nautilus('option', 'sort', 'basename');
				},
				'btn-view-order-size': function () {
					that._$nautilus.nautilus('option', 'sort', 'size');
				},
				'btn-view-order-type': function () {
					that._$nautilus.nautilus('option', 'sort', 'mime_type');
				},
				'btn-view-order-mtime': function () {
					that._$nautilus.nautilus('option', 'sort', 'mtime');
				},
				'btn-view-order-atime': function () {
					that._$nautilus.nautilus('option', 'sort', 'atime');
				},
				'btn-view-grid': function () {
					that._$nautilus.nautilus('option', 'display', 'icons');
				},
				'btn-view-list': function () {
					that._$nautilus.nautilus('option', 'display', 'list');
				},
				'btn-view-refresh': function () {
					that.refresh();
				},
				'btn-view-hiddenfiles': function () {
					var value = !(that._$nautilus.nautilus('option', 'showHiddenFiles'));

					if (value) {
						$(this).menuItem('option', 'label', t.get('Don\'t show hidden files'));
					} else {
						$(this).menuItem('option', 'label', t.get('Show hidden files'));
					}

					that._$nautilus.nautilus('option', 'showHiddenFiles', value);
					that._$nautilus.nautilus('refresh');
				},

				'btn-help-about': function () {
					that.openAboutWindow();
				},

				'btn-go-previous': function () {
					that._$nautilus.nautilus('previous');
				},
				'btn-go-next': function () {
					that._$nautilus.nautilus('next');
				}
			};

			for (var handlerName in handlers) {
				(function (handlerName) {
					$win.find('.'+handlerName).click(function () {
						handlers[handlerName].call(this);
					});
				})(handlerName);
			}

			//Search entry
			var searchInFiles = function(query) {
				if (query.trim()) {
					that._$win.window('loading', true, {
						lock: false
					});
					that._$nautilus.nautilus('search', query, function() {
						that._$win.window('loading', false);
					});
				}
			};

			var keypressTimer = -1;
			$win.find('.entry-search-query').keydown(function (e) {
				if (e.keyCode == 27) { //Esc
					that.toggleSearch(false);
				}
			}).keyup(function() {
				var that = this;

				if (keypressTimer !== -1) {
					clearTimeout(keypressTimer);
				}
				keypressTimer = setTimeout(function() {
					keypressTimer = -1;
					searchInFiles($(that).val());
				}, 500);
			});
		},
		refresh: function() {
			this._$nautilus.nautilus('refresh');
		},
		version: function () {
			return this._version;
		},
		openAboutWindow: function() {
			var t = this.translations();

			$.w.window.about({
				name: 'Nautilus',
				version: this.version(),
				description: t.get('${app} allows you to manage your files and folders.', { app: 'Nautilus' }),
				icon: 'applications/nautilus',
				author: 'Emersion',
				parent: this._$win
			}).window('open');
		},
		readDir: function(dir, callback) {
			var that = this;

			this._$win.window('loading', true);

			this._$nautilus.nautilus('readDir', dir, callback).on({
				complete: function () {
					that._$win.window('loading', false);
				}
			});
		},
		toggleSearch: function (value) {
			var $header = this._$win.find('.nautilus-header'),
				$searchBtn = $header.find('.btn-edit-search'),
				$searchEntry = $header.find('.entry-search-query'),
				$locationBtnCtn = $header.find('.btn-ctn-location');

			if (typeof value == 'undefined') {
				value = $searchEntry.is(':hidden');
			}

			var searchDisplayed = $searchEntry.is(':visible');

			if (value && !searchDisplayed) {
				$searchBtn.button('option', 'activated', true);
				$searchEntry.show().val('').focus();
				$locationBtnCtn.hide();
			} else if (value) {
				$searchEntry.focus();
			} else if (!value && searchDisplayed) {
				$searchBtn.button('option', 'activated', false);
				$searchEntry.hide();
				$locationBtnCtn.show();

				this.refresh();
			}
		},
		_refreshHeader: function(dir) {
			var t = this.translations();

			var $header = this._$win.find('.nautilus-header'),
				$btnCtn = $header.find('.btn-ctn-location');

			var location = String(dir).split('/');

			var lastDir = location[location.length - 1];
			if (lastDir === '') {
				lastDir = '/';
			}
			this._$win.window('option', 'title', lastDir+' - '+t.get('File manager'));

			var that = this;

			var createButtonFn = function createButtonFn(userDir, path) {
				var $btn = $.w.button(userDir).click(function() {
					that.readDir(path);
				}).droppable({
					drop: function(event, ui) {
						if (!ui.draggable.draggable('option', 'sourceFile')) {
							return;
						}

						var sourceFile = ui.draggable.draggable('option', 'sourceFile'),
							destFile = Webos.File.get(path);

						ui.draggable.trigger('nautilusdrop', [{
							source: sourceFile,
							dest: destFile,
							droppable: $btn
						}]);
					}
				});

				return $btn;
			};

			$btnCtn.empty();

			if (dir == '/') {
				createButtonFn('<x-icon src="devices/drive-harddisk-symbolic" size="16" variant="dark"></x-icon>', '/').appendTo($btnCtn);
			} else {
				var stack = '';
				for(var i = 0; i < location.length; i++) {
					stack += location[i]+'/';
					var userDir = location[i];
					if (userDir === '') {
						userDir = '<x-icon src="devices/drive-harddisk-symbolic" size="16" variant="dark"></x-icon>';
					}
					if (userDir == '~') {
						userDir = '<x-icon src="places/user-home-symbolic" size="16" variant="dark"></x-icon>';
					}
					var button = createButtonFn(userDir, stack);
					$btnCtn.append(button);
				}
			}

			$btnCtn.children().last().button('option', 'activated', true);

			//Refresh display mode indicator
			var displayMode = this._$nautilus.nautilus('option', 'display');
			$header.find('.btn-view-grid').button('option', 'activated', (displayMode == 'icons'));
			$header.find('.btn-view-list').button('option', 'activated', (displayMode == 'list'));
		}
	};

	Webos.inherit(NautilusWindow, Webos.Observable); //Heritage de Webos.Observable
	Webos.inherit(NautilusWindow, Webos.TranslatedLibrary); //Heritage de Webos.TranslatedLibrary

	window.NautilusWindow = NautilusWindow; //Export API
});