//Load dependencies
var dependencies = [
	'/usr/lib/jszip/jszip.js',
	'/usr/lib/jszip/jszip-load.js',
	'/usr/lib/jszip/jszip-inflate.js',
	'/usr/lib/jszip/jszip-deflate.js'
];

Webos.require(dependencies, function() {
	if (window.FileRoller) { //If library is already loaded
		return;
	}

	var FileRoller = function FileRoller(inputFile) {
		Webos.Observable.call(this);

		this.bind('translationsloaded', function() {
			var that = this, t = this._translations;

			//Define the window
			this._window = $.w.window.main({
				title: t.get('Archive manager'),
				icon: new W.Icon('applications/file-roller'),
				width: 400,
				height: 250
			});

			this.bind('beforeopenfile openfile', function(data) {
				var title = t.get('Archive manager');

				if (data.file) {
					title = data.file.get('basename') + ' - ' + title;
				} else if (data.type) {
					title = t.get('New file') + ' - ' + title;
				}

				that._window.window('option', 'title', title);
			});

			var headers = this._window.window('header');
			this._controls = {};

			var menu = $.w.menuWindowHeader().appendTo(headers);
			this._controls.menu = {};

			var fileItem = $.w.menuItem(t.get('Archive')).appendTo(menu);
			fileItemContent = fileItem.menuItem('content');
			
			this._controls.menu.createNewFile = $.w.menuItem(t.get('New...'))
				.click(function() {
					W.Cmd.execute('file-roller');
				})
				.appendTo(fileItemContent);
			
			this._controls.menu.openFile = $.w.menuItem(t.get('Open...'))
				.click(function() {
					that.openFile();
				})
				.appendTo(fileItemContent);
			
			this._controls.menu.saveAs = $.w.menuItem(t.get('Save as...'), true)
				.click(function() {
					
				})
				.hide()
				.appendTo(fileItemContent);
			
			this._controls.menu.extract = $.w.menuItem(t.get('Extract'))
				.click(function() {
					that.extractArchive();
				})
				.appendTo(fileItemContent);
			
			this._controls.menu.quit = $.w.menuItem(t.get('Quit'), true)
				.click(function() {
					that._window.window('close');
				})
				.appendTo(fileItemContent);

			var helpItem = $.w.menuItem('Help').appendTo(menu);
			helpItemContent = helpItem.menuItem('content');

			this._controls.menu.about = $.w.menuItem('About')
				.click(function() {
					that.openAboutWindow();
				})
				.appendTo(helpItemContent);

			var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
			this._controls.toolbar = {};
			
			this._controls.toolbar.createFile = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-new', 'button'))
				.click(function() {
					W.Cmd.execute('file-roller');
				})
				.appendTo(toolbar);

			this._controls.toolbar.openFile = $.w.toolbarWindowHeaderItem(t.get('Open'), new W.Icon('actions/document-open', 'button'))
				.click(function() {
					that.openFile();
				})
				.appendTo(toolbar);

			this._controls.toolbar.addFiles = $.w.toolbarWindowHeaderItem(t.get('Add files'), new W.Icon('actions/archive-insert', 'button'))
				.click(function() {
					
				})
				.hide()
				.appendTo(toolbar);

			this._controls.toolbar.extract = $.w.toolbarWindowHeaderItem(t.get('Extract'), new W.Icon('actions/archive-extract', 'button'))
				.click(function() {
					that.extractArchive();
				})
				.appendTo(toolbar);

			var toolbar = $.w.toolbarWindowHeader().appendTo(headers);

			this._controls.toolbar.previous = $.w.toolbarWindowHeaderItem(t.get('Previous'), new W.Icon('actions/go-previous', 'button'))
				.click(function() {
					that._openArchivePreviousDir();
				})
				.appendTo(toolbar);

			this._controls.toolbar.next = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-next', 'button'))
				.click(function() {
					that._openArchiveNextDir();
				})
				.appendTo(toolbar);

			this._controls.toolbar.goUp = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-up', 'button'))
				.click(function() {
					that._openArchiveParentDir();
				})
				.appendTo(toolbar);

			this._controls.toolbar.goHome = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-home', 'button'))
				.click(function() {
					that._openArchive('');
				})
				.appendTo(toolbar);

			this._controls.filesList = $.w.list().appendTo(this._window.window('content'));

			this._window.window('open');

			if (inputFile) {
				this._openFile(inputFile);
			}
		});

		Webos.TranslatedLibrary.call(this);
	};
	FileRoller.prototype = {
		_translationsName: 'file-roller',
		_archiveFile: null,
		_history: [],
		_historyCursor: null,
		_archive: {
			obj: null,
			type: null,
			path: ''
		},
		_openArchive: function(path) {
			path = (typeof path == 'string') ? path : this._archive.path;

			if (this._historyCursor === null || (this._historyCursor + 1 == this._history.length && this._history[this._historyCursor] != path)) {
				this._history.push(path);
				this._historyCursor = (this._historyCursor === null) ? 0 : this._historyCursor + 1;
			}

			this._openZip(path);
		},
		_openArchiveParentDir: function() {
			var dirname = ('/'+this._archive.path).replace(/\/[^\/]*\/?$/, '').replace(/^\//, '');

			this._openArchive(dirname);
		},
		_openArchivePreviousDir: function() {
			this._historyCursor = (this._historyCursor > 0) ? this._historyCursor - 1 : 0;
			this._openArchive(this._history[this._historyCursor]);
		},
		_openArchiveNextDir: function() {
			this._historyCursor = (this._historyCursor + 1 < this._history.length) ? this._historyCursor + 1 : this._history.length - 1;
			this._openArchive(this._history[this._historyCursor]);
		},
		_extractArchive: function(dest, callback, files) {
			files = files || [this._archive.path];

			this._extractZip(dest, callback, files);
		},
		extractArchive: function(callback) {
			var that = this;
			callback = Webos.Callback.toCallback(callback);

			new NautilusFileSelectorWindow({
				parentWindow: this._window,
				selectDirs: true
			}, function(files) {
				if (files.length) {
					var dest = files[0];

					var filesToExtract, $fileSelection = that._controls.filesList.list('selection');
					if ($fileSelection.length) {
						filesToExtract = [];
						$fileSelection.each(function() {
							filesToExtract.push($(this).data('archivePath'));
						});
					}

					that._extractArchive(dest, [function() {
						callback.success();
					}, callback.error], filesToExtract);
				}
			});
		},
		_generateZipListItem: function(file) {
			var that = this;
			var item = $.w.listItem([file.name.substr(this._archive.path.length)]);

			item.dblclick(function() {
				if (file.options.dir) {
					that._openArchive(file.name);
				}
			});

			item.data('archivePath', file.name);

			return item;
		},
		_openZip: function(path) {
			this._controls.filesList.list('content').empty();

			var zip = this._archive.obj;

			this._archive.path = path;

			for (var filepath in zip.files) {
				if (!((!path && !/\/.+/.test(filepath)) || (path && filepath.indexOf(path) == 0 && path != filepath))) {
					continue;
				}

				var item = this._generateZipListItem(zip.files[filepath]);
				item.appendTo(this._controls.filesList.list('content'));
			}
		},
		_extractZipFile: function(dest, fileData, callback) {
			callback = Webos.Callback.toCallback(callback);

			var contents = '', fnName;
			if (fileData.options.binary) {
				contents = JSZipBase64.encode(fileData.asBinary());
				fnName = 'writeAsBinary';
			} else {
				contents = fileData.asText();
				fnName = 'writeAsText';
			}

			dest[fnName](contents, [function() {
				callback.success();
			}, callback.error]);
		},
		_extractZipDir: function(dest, fileData, callback) {
			var that = this, zip = this._archive.obj;
			callback = Webos.Callback.toCallback(callback);

			W.File.createFolder(dest.get('path'), [function(dest) {
				var files = [], extractedFiles = [];
				var onExtractedFn = function(file) {
					extractedFiles.push(file);

					if (extractedFiles.length == files.length) {
						callback.success(extractedFiles);
					}
				};

				for (var filepath in zip.files) {
					if (!((!fileData.name && !/\/.+/.test(filepath)) || (fileData.name && filepath.indexOf(fileData.name) == 0 && fileData.name != filepath))) {
						continue;
					}

					(function(path) {
						var fileData;
						if (!zip.file(path)) {
							fileData = {
								name: path,
								data: null,
								options: {
									dir: true
								}
							};
						} else {
							fileData = zip.file(path);
						}

						files.push(path);

						var extractFn;
						if (fileData && fileData.options.dir) {
							extractFn = '_extractZipDir';
						} else {
							extractFn = '_extractZipFile';
						}

						var fileDest = W.File.get(dest.get('path') + '/' + fileData.name.replace(/^.*\/(.+)/g, '$1'));
						
						that[extractFn](fileDest, fileData, [function() {
							onExtractedFn(path);
						}, callback.error]);
					})(filepath);
				}
			}, callback.error]);
		},
		_extractZip: function(dest, callback, files) {
			var that = this, t = this._translations;
			callback = Webos.Callback.toCallback(callback);
			dest = W.File.get(dest);

			if (files.length == 0) {
				callback.success();
				return;
			}

			var extractedFiles = [];
			var onExtractedFn = function(file) {
				extractedFiles.push(file);

				if (extractedFiles.length == files.length) {
					callback.success(extractedFiles);
				}
			};

			var zip = this._archive.obj;

			for (var i = 0; i < files.length; i++) {
				(function(path) {
					var fileData;
					if (path === '' || zip.folder(path)) {
						fileData = {
							name: '',
							data: null,
							options: {
								dir: true
							}
						};
					} else {
						fileData = zip.file(path);
					}

					if (!fileData) {
						callback.error(Webos.Callback.Result.error(t.get('File not found in archive : "${path}"', { path: path })));
						return;
					}

					var extractFn;
					if (fileData && fileData.options.dir) {
						extractFn = '_extractZipDir';
					} else {
						extractFn = '_extractZipFile';
					}

					var fileDest = W.File.get(dest.get('path') + '/' + fileData.name.replace(/^.*\/(.+)/g, '$1'));

					that[extractFn](fileDest, fileData, [function() {
						onExtractedFn(path);
					}, callback.error]);
				})(files[i]);
			}
		},
		_openFile: function(file, callback) {
			var that = this, t = this._translations;
			callback = Webos.Callback.toCallback(callback);
			file = W.File.get(file);

			if (jQuery.inArray(file.get('extension'), FileRoller._supportedTypes) == -1) {
				callback.error(Webos.Callback.Result.error(t.get('Unsupported file type "${type}"', { type: file.get('extension') })));
				return;
			}

			this._archiveFile = file;
			this.notify('beforeopenfile', { file: file });

			this._window.window('loading', true, {
				message: t.get('Opening « ${filename} »...', { filename: file.get('basename') })
			});

			file.readAsBinary([function(contents) {
				that._window.window('loading', true, {
					message: t.get('Extracting...')
				});

				var type = file.get('extension'), archive = null;
				switch (type) {
					case 'zip':
						archive = new JSZip(contents, { base64: true });
						break;
				}

				that._archiveFile = file;
				that._history = [];
				that._historyCursor = null;
				that._archive.obj = archive;
				that._archive.type = type;
				that._archive.path = '';

				that._openArchive();

				that._window.window('loading', false);

				that.notify('openfile afteropenfile', { file: file, archive: archive, type: type });

				callback.success();
			}, callback.error]);
		},
		openFile: function(callback) {
			var that = this;
			callback = Webos.Callback.toCallback(callback);

			new NautilusFileSelectorWindow({
				parentWindow: this._window
			}, function(files) {
				if (files.length) {
					that._openFile(files[0]);
				}
			});
		},
		_createFile: function(type) {
			var archive = null;
			switch (type) {
				case 'zip':
					archive = new JSZip();
					break;
				default:
					return false;
			}

			this._archiveFile = file;
			this._archive.obj = null;
			this._archive.type = type;
			this._archive.path = '';

			this._openArchive();

			this.notify('openfile', { file: file, archive: archive, type: type });
		},
		createFile: function() {},
		openAboutWindow: function() {
			var that = this, t = this._translations;

			$.w.window.about({
				name: t.get('Archive manager'),
				version: '0.2',
				description: t.get('An archive manager for GNOME.'),
				author: '$imon',
				icon: 'applications/file-roller'
			}).window('open');
		}
	};
	Webos.inherit(FileRoller, Webos.Observable);
	Webos.inherit(FileRoller, Webos.TranslatedLibrary);

	FileRoller._supportedTypes = ['zip'];

	window.FileRoller = FileRoller; //Export library
});