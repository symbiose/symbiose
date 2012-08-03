new W.Stylesheet('/usr/share/css/nautilus/main.css');
W.ScriptFile.load(
	'/usr/lib/nautilus/widgets.js',
	'/usr/lib/jquery.filedrop.js',
	'/usr/lib/fileuploader.js',
	'/usr/lib/webos/applications.js'
);


function NautilusFileSelectorWindow(options, userCallback) {
	this._window = $.w.window.dialog({
		title: (typeof options.title != 'undefined') ? options.title : 'S&eacute;lection de fichiers',
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
			that._window.window('close');
			that._callbackCalled = true;
			userCallback(data.selection);
		},
		cancel: function() {
			that._window.window('close');
			that._callbackCalled = true;
			userCallback();
		},
		selectDirs: options.selectDirs,
		selectMultiple: options.selectMultiple,
		exists: options.exists,
		extensions: options.extensions
	});
	
	var nautilus = this._nautilus.nautilusFileSelector('nautilus');
	
	this._shortcuts = $.webos.nautilusShortcuts(function(path) {
		nautilus.nautilus('readDir', path);
	}).appendTo(this._window.window('content'));
	
	this._nautilus.appendTo(this._window.window('content'));
	
	this._window.bind('windowclose', function() {
		if (!that._callbackCalled) {
			userCallback();
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
				if (userDir == '') {
					userDir = '/';
				}
				if (userDir == '~') {
					userDir = 'Dossier personnel';
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
}

function NautilusDeviceMounterWindow(driver) {
	this._window = $.w.window.dialog({
		title: 'Monteur de volumes',
		width: 400,
		icon: new W.Icon('devices/harddisk')
	});
	
	this._drivers = {
		'DropboxFile': {
			'title': 'Dropbox',
			'icon': '/usr/share/images/dropbox/icon_48.png',
			'lib': '/usr/lib/dropbox/webos.js'
		},
		'FTPFile': {
			'title': 'FTP',
			'icon': 'places/folder-remote',
			'lib': '/usr/lib/webos/ftp.js'
		}
	};
	
	this.showDrivers = function(driver) {
		var that = this;
		var form = $.w.entryContainer().submit(function() {
			that._window.window('loading', true);
			W.ScriptFile(that._drivers[selectedDriver].lib);
			var local = localEntry.nautilusFileEntry('value'), remote = remoteEntry.textEntry('value'), permanent = permanentEntry.switchButton('value');
			var point = new Webos.File.MountPoint({
				remote: remote,
				driver: selectedDriver
			}, local);
			Webos.File.mount(point, [function(point) {
				if (permanent) {
					Webos.File.fstab.add(point, [function() {
						that._window.window('close');
					}, function(response) {
						that._window.window('loading', false);
						response.triggerError('Impossible d\'effectuer le montage permanent');
					}]);
				} else {
					that._window.window('close');
				}
			}, function() {
				that._window.window('loading', false);
				Webos.Error.trigger('Impossible d\'effectuer le montage du volume');
			}]);
		}).appendTo(this._window.window('content'));
		
		form.append($.w.label('Choisissez le service &agrave; utiliser :'));
		
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
		
		var spoiler = $.w.spoiler('Configuration avanc&eacute;e').hide().appendTo(form);
		var spoilerContents = spoiler.spoiler('content');
		var localEntry = $.w.nautilusFileEntry('Dossier local :', {
			fileSelector: {
				selectDirs: true,
				exists: false,
				title: 'Choisir le dossier local',
				parentWindow: this._window
			}
		}).appendTo(spoilerContents);
		var remoteEntry = $.w.textEntry('Dossier distant :', '/').appendTo(spoilerContents);
		
		var thisProcess = W.Process.current(), canWriteUserFiles = true;
		if (thisProcess) {
			canWriteUserFiles = thisProcess.getAuthorizations().can('file.user.write');
		}
		var permanentEntry = $.w.switchButton('Montage permanent :', canWriteUserFiles).appendTo(spoilerContents);
		
		var buttons = $.w.buttonContainer().appendTo(form);
		$.w.button('Annuler').click(function() {
			that._window.window('close');
		}).appendTo(buttons);
		var submitButton = $.w.button('Valider', true).button('option', 'disabled', true).appendTo(buttons);
		
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
}

function NautilusWindow(dir, userCallback) {
	this.window = $.w.window({
		title: 'Gestionnaire de fichiers',
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
		that.window.window('loading', true);
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
		if (lastDir == '') {
			lastDir = '/';
		}
		this.window.window('option', 'title', lastDir+' - Gestionnaire de fichiers');
		
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
				if (userDir == '') {
					userDir = '/';
				}
				if (userDir == '~') {
					userDir = 'Dossier personnel';
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
			description: 'Nautilus permet d\'organiser vos fichiers et vos dossiers.',
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
	
	var fileItem = $.w.menuItem('Fichier').appendTo(this._menu);
	fileItemContent = fileItem.menuItem('content');
	
	$.w.menuItem('Nouvelle fen&ecirc;tre')
		.click(function() {
			W.Cmd.execute('nautilus "'+that.nautilus.nautilus('location')+'"');
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Envoyer des fichiers', true)
		.click(function() {
			that.nautilus.nautilus('openUploadWindow');
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Cr&eacute;er un dossier')
		.click(function() {
			that.nautilus.nautilus('createFile', 'Nouveau dossier', true);
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Cr&eacute;er un fichier')
		.click(function() {
			that.nautilus.nautilus('createFile', 'Nouveau fichier');
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Monter un volume')
		.click(function() {
			new NautilusDeviceMounterWindow();
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Fermer', true)
		.click(function() {
			that.window.window('close');
		})
		.appendTo(fileItemContent);
	
	var editItem = $.w.menuItem('&Eacute;dition').appendTo(this._menu);
	editItemContent = editItem.menuItem('content');
	
	$.w.menuItem('Tout s&eacute;lectionner')
		.click(function() {
			that.nautilus.nautilus('items').addClass('active');
		})
		.appendTo(editItemContent);
	
	$.w.menuItem('S&eacute;lectionner...')
		.click(function() {
			var selectWindow = $.w.window({
				parentWindow: that.window,
				title: 'S&eacute;lectionner les &eacute;l&eacute;ments correspondants &agrave;...',
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
			var textEntry = $.w.textEntry('Motif (<em>regex</em>) :').appendTo(form);
			$.w.label('<strong>Exemples</strong> : <em>\.png$</em>, <em>fich</em>, <em>^\.</em>...').appendTo(form);
			var buttons = $.w.buttonContainer().appendTo(form);
			$.w.button('Valider', true).appendTo(buttons);
			
			selectWindow.window('open');
			
			textEntry.textEntry('content').focus();
		})
		.appendTo(editItemContent);
	
	$.w.menuItem('Inverser')
		.click(function() {
			that.nautilus.nautilus('items').toggleClass('active');
		})
		.appendTo(editItemContent);
	
	var viewItem = $.w.menuItem('Affichage').appendTo(this._menu);
	viewItemContent = viewItem.menuItem('content');
	
	$.w.menuItem('Actualiser', true)
		.click(function() {
			that.refresh();
		})
		.appendTo(viewItemContent);
	$.w.menuItem('Afficher les fichiers cach&eacute;s', true)
		.click(function() {
			var value = !(that.nautilus.nautilus('option', 'showHiddenFiles'));
			
			if (value) {
				$(this).menuItem('option', 'label', 'Ne pas afficher les fichiers cach&eacute;s');
			} else {
				$(this).menuItem('option', 'label', 'Afficher les fichiers cach&eacute;s');
			}
			
			that.nautilus.nautilus('option', 'showHiddenFiles', value);
			that.nautilus.nautilus('refresh');
		})
		.appendTo(viewItemContent);
	
	var goToItem = $.w.menuItem('Aller &agrave;...').appendTo(this._menu);
	goToItemContent = goToItem.menuItem('content');
	
	$.w.menuItem('Dossier parent')
		.click(function() {
			that._toolbar.toolbarWindowHeader('content').find('li:not(.active)').last().trigger('click');
		})
		.appendTo(goToItemContent);
	
	var helpItem = $.w.menuItem('Aide').appendTo(this._menu);
	helpItemContent = helpItem.menuItem('content');
	
	$.w.menuItem('&Agrave; propos')
		.click(function() {
			that.openAboutWindow();
		})
		.appendTo(helpItemContent);
	
	this.window.window('open');
	
	this._refreshHeader(dir);
}