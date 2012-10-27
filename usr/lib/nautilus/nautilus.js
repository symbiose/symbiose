new W.Stylesheet('/usr/share/css/nautilus/main.css');
W.ScriptFile.load(
	'/usr/lib/nautilus/widgets.js',
	'/usr/lib/jquery.filedrop.js',
	'/usr/lib/fileuploader.js',
	'/usr/lib/webos/applications.js'
);


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
			extensions: options.extensions
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
			exists: options.exists,
			selectMultiple: options.selectMultiple
		}).appendTo(this._window.window('content'));
		
		this._nautilus.appendTo(this._window.window('content'));
		
		this._window.bind('windowclose', function() {
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
		
		nautilus.bind('nautilusreadstart', function(e, data) {
			that._refreshHeader(data.location);
			that._window.window('loading', true);
		}).bind('nautilusreadcomplete', function() {
			that._window.window('loading', false);
		}).bind('nautilusreaderror', function(e, data) {
			that._refreshHeader(data.location);
		});
		
		this._refreshHeader(nautilus.nautilus('location'));
		
		this._window.window('open');
		
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
};
Webos.inherit(NautilusFileSelectorWindow, Webos.Observable); //Heritage de Webos.Observable
Webos.inherit(NautilusFileSelectorWindow, Webos.TranslatedLibrary); //Heritage de Webos.TranslatedLibrary

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
			}
		};
		
		this.showDrivers = function(driver) {
			var that = this;

			var form = $.w.entryContainer().submit(function() {
				that._window.window('loading', true, {
					message: t.get('Loading of ${driver} library in progress...', { driver: that._drivers[selectedDriver].title })
				});
				W.ScriptFile(that._drivers[selectedDriver].lib);
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
							}, function(response) {
								that._window.window('loading', false);
								response.triggerError(t.get('Can\'t perform the persistant mounting'));
							}]);
						} else {
							that._window.window('close');
							displaySuccessFn();
						}
					}, function() {
						that._window.window('loading', false);
						Webos.Error.trigger(t.get('Can\'t mount the volume'));
					}]);
				};
				
				that._window.window('loading', true, {
					message: t.get('Checking the local folder "${local}"...', { local: local })
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
					}, function(response) {
						that._window.window('loading', true, {
							message: t.get('Creating the local folder "${local}"...', { local: local })
						});
						W.File.createFolder(local, [function(file) {
							mountFn();
						}, function(response) {
							that._window.window('loading', false);
							response.triggerError(t.get('Can\'t create the local folder "${local}"', { local: local }));
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
					var item = $.w.iconsListItem(Webos.Icon.toIcon(driverData.icon), driverData.title)
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
			
			var permanentEntry = $.w.switchButton(t.get('Persistant mounting :'), canWriteUserFiles).appendTo(spoilerContents);
			
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

var NautilusWindow = function NautilusWindow(dir, userCallback) {
	Webos.Observable.call(this);

	this._translationsName = 'nautilus';

	this.bind('translationsloaded', function(data) {
		var t = data.translations;

		this.window = $.w.window.main({
			title: t.get('File manager'),
			width: 600,
			height: 400,
			icon: new W.Icon('apps/filemanager'),
			stylesheet: 'usr/share/css/nautilus/window.css'
		});

		var that = this;

		if (typeof dir == 'undefined') {
			dir = '~';
		}

		this.nautilus = $.w.nautilus({
			directory: dir
		});

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
		
		this._refreshHeader = function(dir) {
			var headers = this.window.window('header');
			if (typeof this._toolbar != 'undefined') {
				this._toolbar.remove();
			}
			this._toolbar = $.w.toolbarWindowHeader().appendTo(headers);
			
			var location = dir.split('/');
			
			var lastDir = location[location.length - 1];
			if (lastDir === '') {
				lastDir = '/';
			}
			this.window.window('option', 'title', lastDir+' - '+t.get('File manager'));
			
			var that = this;
			
			var createButtonFn = function createButtonFn(userDir, path) {
				var button = $.w.toolbarWindowHeaderItem(userDir);
				button.click(function() {
					that.readDir(path);
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
		
		this.readDir = function(dir, userCallback) {
			if (typeof userCallback == 'undefined') {
				userCallback = new W.Callback();
			}
			
			dir = W.File.cleanPath(dir);
			
			this._refreshHeader(dir);
			
			this.window.window('loading', true);
			
			var callback = new W.Callback(function(nautilus) {
				that.window.window('loading', false);
				userCallback.success(nautilus);
			}, function(response) {
				that.window.window('loading', false);
				userCallback.error(response);
			});
			
			this.nautilus.nautilus('readDir', dir, callback);
		};
		
		this.openAboutWindow = function() {
			var aboutWindow = $.w.window.about({
				name: 'Nautilus',
				version: '0.3',
				description: t.get('${app} allows you to manage your files and folders.', { app: 'Nautilus' }),
				author: '$imon',
				icon: new W.Icon('applications/nautilus')
			});
			aboutWindow.window('open');
		};
		
		this.refresh = function() {
			this.nautilus.nautilus('refresh');
		};
		
		this._shortcuts = $.webos.nautilusShortcuts(function(path) {
			that.nautilus.nautilus('readDir', path);
		}).appendTo(this.window.window('content'));
		
		this.window.window('content').append(this.nautilus);
		
		var headers = this.window.window('header');
		
		this._menu = $.w.menuWindowHeader().appendTo(headers);
		
		var fileItem = $.w.menuItem(t.get('File')).appendTo(this._menu);
		fileItemContent = fileItem.menuItem('content');
		
		$.w.menuItem(t.get('New window'))
			.click(function() {
				W.Cmd.execute('nautilus "'+that.nautilus.nautilus('location')+'"');
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Upload files'), true)
			.click(function() {
				that.nautilus.nautilus('openUploadWindow');
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Create a new folder'))
			.click(function() {
				that.nautilus.nautilus('createFile', t.get('New folder'), true);
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Create a new file'))
			.click(function() {
				that.nautilus.nautilus('createFile', t.get('New file'));
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Mount a volume'))
			.click(function() {
				W.Cmd.execute('nautilus-mounter');
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Close'), true)
			.click(function() {
				that.window.window('close');
			})
			.appendTo(fileItemContent);
		
		var editItem = $.w.menuItem(t.get('Edit')).appendTo(this._menu);
		editItemContent = editItem.menuItem('content');
		
		$.w.menuItem(t.get('Select all'))
			.click(function() {
				that.nautilus.nautilus('items').addClass('active');
			})
			.appendTo(editItemContent);
		
		$.w.menuItem(t.get('Select...'))
			.click(function() {
				var selectWindow = $.w.window.dialog({
					parentWindow: that.window,
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
						that.nautilus.nautilus('items').each(function() {
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
			})
			.appendTo(editItemContent);
		
		$.w.menuItem(t.get('Invert'))
			.click(function() {
				that.nautilus.nautilus('items').toggleClass('active');
			})
			.appendTo(editItemContent);
		
		var viewItem = $.w.menuItem(t.get('View')).appendTo(this._menu);
		viewItemContent = viewItem.menuItem('content');
		
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
		
		var goToItem = $.w.menuItem(t.get('Go to...')).appendTo(this._menu);
		goToItemContent = goToItem.menuItem('content');
		
		$.w.menuItem(t.get('Parent folder'))
			.click(function() {
				that._toolbar.toolbarWindowHeader('content').find('li:not(.active)').last().trigger('click');
			})
			.appendTo(goToItemContent);
		
		var helpItem = $.w.menuItem(t.get('Help')).appendTo(this._menu);
		helpItemContent = helpItem.menuItem('content');
		
		$.w.menuItem(t.get('About'))
			.click(function() {
				that.openAboutWindow();
			})
			.appendTo(helpItemContent);
		
		this.window.window('open');
		
		this._refreshHeader(dir);
		
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
};
Webos.inherit(NautilusWindow, Webos.Observable); //Heritage de Webos.Observable
Webos.inherit(NautilusWindow, Webos.TranslatedLibrary); //Heritage de Webos.TranslatedLibrary