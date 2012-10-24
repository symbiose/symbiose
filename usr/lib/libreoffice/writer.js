if (typeof window.LibreOffice == 'undefined') {
	window.LibreOffice = {};
}

LibreOffice.Writer = function LibreOfficeWriter(file, options) {
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;
		
		this._window = $.w.window({
			title: t.get('LibreOffice Writer'),
			icon: new W.Icon('applications/libreoffice-writer'),
			width: 550,
			height: 400,
			stylesheet: 'usr/share/css/libreoffice/writer.css',
			maximized: true
		});
		
		this._container = $('<div></div>').scrollPane({
			autoReload: true,
			expand: true,
			keyUpResize: true
		}).appendTo(this._window.window('content'));
		
		this.supportedExtensions = ['html', 'htm'];
		this._file = null;
		this._saved = false;
		this._refreshTitle = function() {
			var filename;
			if (this._file) {
				filename = this._file.get('basename');
			} else {
				filename = t.get('New document');
			}
			this._window.window('option', 'title', filename+' - '+t.get('LibreOffice Writer'));
		};
		this._open = function(file) {
			if (jQuery.inArray(file.get('extension'), that.supportedExtensions) == -1) {
				W.Error.trigger(t.get('Incorrect file type'));
				return;
			}

			file = W.File.get(file);
			
			that._window.window('loading', true, {
				message: t.get('Opening « ${path} »...', { path: file.get('path') })
			});
			file.readAsText([function(contents) {
				that._file = file;
				that._saved = true;
				that._refreshTitle();
				
				var pageContents = '';
				try {
					var xmlDoc = $.parseXML(contents), $xml = $(xmlDoc), $body = $xml.find('body');

					if ($body.length == 1) {
						pageContents = $body.html();
					} else {
						pageContents = $xml;
					}
				} catch (e1) {
					try {
						$xml = $(contents);
						pageContents = $xml;
					} catch (e2) {
						Webos.Error.trigger(t.get('Can\'t open "{path}"', { path: file.get('path') })+' : '+t.get('the file is corrupted'), e2.getMessage());
					}
				} finally {
					that._window.window('loading', false);
					that._setContents(pageContents);
				}
			}, function(response) {
				that._window.window('loading', false);
				response.triggerError(t.get('Can\'t open "{path}"', { path: file.get('path') }));
			}]);
		};
		this.open = function() {
			new NautilusFileSelectorWindow({
				parentWindow: that._window,
				title: 'Open...'
			}, function(files) {
				if (files.length) {
					that._open(files[0]);
				}
			});
		};
		this.newFile = function(contents) {
			if (typeof contents == 'undefined') {
				contents = '';
			}
			
			this.closeFile(new W.Callback(function() {
				that._file = null;
				that._saved = false;
				that._refreshTitle();
				that._setContents(contents);
			}, function() {}));
		};
		this.closeFile = function(callback) {
			callback = W.Callback.toCallback(callback);
			
			if (this._saved || this._editable.is(':empty')) {
				callback.success();
				return;
			}
			
			var filename = (this._file) ? this._file.get('basename') : t.get('New document');
			var confirm = $.w.window.confirm({
				title: t.get('Save changes'),
				label: t.get('Do you want to save changes of the file « ${filename} » before closing it ?', { filename: filename }),
				cancel: function() {
					callback.success();
				},
				confirm: function() {
					that.save(callback);
				},
				cancelLabel: t.get('Close without saving'),
				confirmLabel: t.get('Save')
			});
			confirm.window('open');
		};
		this.save = function(callback) {
			callback = W.Callback.toCallback(callback);
			
			var contents = this.contents();
			var saveFn = function(file) {
				if (jQuery.inArray(file.get('extension'), that.supportedExtensions) == -1) {
					W.Error.trigger(t.get('Incorrect file type'));
					return;
				}
				
				that._window.window('loading', true);
				file.setContents(contents, new W.Callback(function() {
					that._file = file;
					that._saved = true;
					that._refreshTitle();
					that._window.window('loading', false);
					callback.success(file);
				}, function(response) {
					that._window.window('loading', false);
					response.triggerError(t.get('Can\'t save the file "${path}"', { path: file.get('path') }));
					callback.error(file);
				}));
			};
			
			if (this._file) {
				saveFn(this._file);
			} else {
				new NautilusFileSelectorWindow({
					parentWindow: that._window,
					title: t.get('Save'),
					exists: false
				}, function(paths) {
					if (paths.length) {
						W.File.load(paths[0], new W.Callback(function(file) {
							saveFn(file);
						}, function(response) {
							if (!(new RegExp('\.('+that.supportedExtensions.join('|')+')$')).test(path)) {
								path += '.html';
							}
							W.File.createFile(path, new W.Callback(function(file) {
								saveFn(file);
							}, function(response) {
								response.triggerError(t.get('Can\'t save the file "${path}"', { path: path }));
								callback.error();
							}));
						}));
					} else {
						callback.error();
					}
				});
			}
		};
		this.saveAs = function(callback) {
			callback = W.Callback.toCallback(callback);
			
			var contents = this.contents();
			var saveFn = function(file) {
				if (jQuery.inArray(file.get('extension'), that.supportedExtensions) == -1) {
					W.Error.trigger(t.get('Incorrect file type'));
					return;
				}
				
				that._window.window('loading', true);
				file.setContents(contents, new W.Callback(function() {
					that._file = file;
					that._saved = true;
					that._refreshTitle();
					that._window.window('loading', false);
					callback.success(file);
				}, function(response) {
					that._window.window('loading', false);
					response.triggerError(t.get('Can\'t save the file "${path}"', { path: file.get('path') }));
				}));
			};
			
			new NautilusFileSelectorWindow({
				parentWindow: that._window,
				title: t.get('Save as...'),
				exists: false
			}, function(paths) {
				if (paths.length) {
					W.File.load(paths[0], new W.Callback(function(file) {
						saveFn(file);
					}, function(response) {
						if (!(new RegExp('\.('+that.supported.join('|')+')$')).test(path)) {
							path += '.html';
						}
						W.File.createFile(path, new W.Callback(function(file) {
							saveFn(file);
						}, function(response) {
							response.triggerError(t.get('Can\'t save the file "${path}"', { path: path }));
						}));
					}));
				}
			});
		};
		this.supported = function() {
			return (typeof $('body')[0].contentEditable != 'undefined');
		};
		this.command = function(command, param) {
			document.execCommand(command, null, param);
			that._currentPage.focus();
		};
		
		var headers = this._window.window('header');

		this._menu = $.w.menuWindowHeader().appendTo(headers);

		var fileItem = $.w.menuItem(t.get('File')).appendTo(this._menu);
		fileItemContent = fileItem.menuItem('content');
		
		$.w.menuItem(t.get('New document'))
			.click(function() {
				new LibreOffice.Writer();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Open...'))
			.click(function() {
				that.open();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Save'), true)
			.click(function() {
				that.save();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Save as...'))
			.click(function() {
				that.saveAs();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Export to PDF'))
			.click(function() {
				that.exportTo('pdf');
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Quit'), true)
			.click(function() {
				that._window.window('close');
			})
			.appendTo(fileItemContent);

		var editItem = $.w.menuItem(t.get('Edit')).appendTo(this._menu);
		editItemContent = editItem.menuItem('content');

		$.w.menuItem(t.get('Undo'), true)
			.click(function() {
				that.command('undo');
			})
			.appendTo(editItemContent);

		$.w.menuItem(t.get('Redo'), true)
			.click(function() {
				that.command('redo');
			})
			.appendTo(editItemContent);

		var helpItem = $.w.menuItem(t.get('Help')).appendTo(this._menu);
		helpItemContent = helpItem.menuItem('content');
		
		$.w.menuItem(t.get('About'))
			.click(function() {
				that.openAboutWindow();
			})
			.appendTo(helpItemContent);

		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons = {};
		
		this._buttons.newDoc = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-new', 'button'))
			.click(function() {
				new LibreOffice.Writer();
			})
			.appendTo(toolbar);
		
		this._buttons.open = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-open', 'button'))
			.click(function() {
				that.open();
			})
			.appendTo(toolbar);
		
		this._buttons.save = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-save', 'button'))
			.click(function() {
				that.save();
			})
			.appendTo(toolbar);
		
		this._buttons.undo = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/edit-undo', 'button'))
			.click(function() {
				that.command('undo');
			})
			.appendTo(toolbar);

		this._buttons.redo = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/edit-redo', 'button'))
			.click(function() {
				that.command('redo');
			})
			.appendTo(toolbar);
		
		toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons.bold = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-text-bold', 'button'))
			.click(function() {
				that.command('bold');
			})
			.appendTo(toolbar);
		
		this._buttons.italic = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-text-italic', 'button'))
			.click(function() {
				that.command('italic');
			})
			.appendTo(toolbar);
		
		this._buttons.underline = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-text-underline', 'button'))
			.click(function() {
				that.command('underline');
			})
			.appendTo(toolbar);
		
		this._buttons.underline = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-text-strikethrough', 'button'))
			.click(function() {
				that.command('strikethrough');
			})
			.appendTo(toolbar);
		
		this._buttons.justifyLeft = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-justify-left', 'button'))
			.click(function() {
				that.command('justifyleft');
			})
			.appendTo(toolbar);
		
		this._buttons.justifyCenter = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-justify-center', 'button'))
			.click(function() {
				that.command('justifycenter');
			})
			.appendTo(toolbar);
		
		this._buttons.justifyRight = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-justify-right', 'button'))
			.click(function() {
				that.command('justifyright');
			})
			.appendTo(toolbar);
		
		this._buttons.justifyFill = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-justify-fill', 'button'))
			.click(function() {
				that.command('justifyfull');
			})
			.appendTo(toolbar);
		
		this._buttons.indent = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-indent-more', 'button'))
			.click(function() {
				that.command('indent');
			})
			.appendTo(toolbar);
		
		this._buttons.outdent = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/format-outdent-more', 'button'))
			.click(function() {
				that.command('outdent');
			})
			.appendTo(toolbar);
		
		var windowBeforeCloseFn = function(e) {
			that.closeFile([function() {
				that._window.window('close');
			}, function() {
				that._window.one('windowbeforeclose', windowBeforeCloseFn);
			}]);
			e.preventDefault();
		};
		this._window.one('windowbeforeclose', windowBeforeCloseFn);

		this._window.window('open');

		this.setPaperFormat('A4');

		if (typeof file != 'undefined') {
			this._open(file);
		} else {
			this._refreshTitle();
		}

		if (!this.supported()) {
			W.Error.trigger(t.get('Your browser is not supported, falling back to "read only" mode.'), t.get('The support of the "contenteditable" HTML5 property is required to edit the documents.'));
		}

		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
};
LibreOffice.Writer.prototype = {
	_translationsName: 'libreoffice.writer',
	_pages: $(),
	_currentPage: $(),
	openAboutWindow: function() {
		var t = this._translations;
		return $.w.window.about({
			name: 'LibreOffice Writer',
			version: '0.2',
			description: t.get('${app} allows you to write letters, reports, documents and web pages.', { app: 'LibreOffice Writer' }),
			author: '$imon',
			icon: new W.Icon('applications/libreoffice-writer')
		}).window('open');
	},
	exportTo: function(type) {
		switch (type.toLowerCase()) {
			case 'pdf':
				return this.exportToPDF();
			case 'odt':
				return;
			case 'doc':
				return;
		}
	},
	_loadLibPDF: function() {
		Webos.ScriptFile.load(
			'/usr/lib/jspdf/jspdf.js',
			'/usr/lib/jspdf/jspdf.standard_fonts_metrics.js',
			'/usr/lib/jspdf/jspdf.split_text_to_size.js',
			'/usr/lib/jspdf/jspdf.from_html.js'
		);
	},
	_exportToPDF: function() {
		this._loadLibPDF();
		var editable = this._editable[0];
		var pdf = new jsPDF('p','in','letter');
		pdf.fromHTML(editable, 0.5, 0.5, {
			width: 7.5,
			elementHandlers: {}
		});
		var uriString = pdf.output('datauristring');
		return uriString.replace(/data:application\/pdf;base64,/, '');
	},
	exportToPDF: function(callback) {
		var that = this, t = this._translations;
		callback = W.Callback.toCallback(callback);
		
		new NautilusFileSelectorWindow({
			parentWindow: this._window,
			title: t.get('Export to PDF'),
			exists: false
		}, function(paths) {
			if (paths.length) {
				var path = paths[0];

				if (!/\.pdf$/.test(path)) {
					path += '.pdf';
				}

				var file = Webos.File.get(path);
				
				that._window.window('loading', true, {
					message: t.get('Converting to PDF...')
				});

				var pdfContents = that._exportToPDF();

				that._window.window('loading', true, {
					message: t.get('Saving file...')
				});

				file.writeAsBinary(pdfContents, new W.Callback(function() {
					that._saved = true;
					that._window.window('loading', false);
					callback.success(file);
				}, function(response) {
					that._window.window('loading', false);
					response.triggerError(t.get('Can\'t save the file "${path}"', { path: file.get('path') }));
					callback.error(file);
				}));
			} else {
				callback.error();
			}
		});
	},
	contents: function(contents) {
		if (typeof contents != 'undefined') {
			this._setContents(contents);
		} else {
			contents = '';
			this._pages.each(function() {
				contents += $(this).html();
			});
			return contents;
		}
	},
	_setContents: function(contents) {
		this._pages.empty().remove();
		this._pages = $();

		var page = this._addPage();
		page.html(contents);
	},
	goToPage: function(page) {
		if (typeof page == 'undefined') {
			page = this._currentPage;
		} else if (typeof page == 'number') {
			page = this._pages[page];
		}

		$(page).focus();
	},
	_getPageDimentions: function() {
		var format = LibreOffice.Writer.paperFormat(this._paperFormat);

		if (!format) {
			return {};
		}

		var docWidth = 800;
		var docHeight = (format.height * docWidth) / format.width;

		return {
			width: docWidth,
			height: docHeight
		};
	},
	setPaperFormat: function(name) {
		var format = LibreOffice.Writer.paperFormat(name);
		
		if (!format) {
			return;
		}

		this._paperFormat = format;

		this._pages.css(this._getPageDimentions());

		this._container.scrollPane('reload');
	},
	_addPage: function() {
		var that = this;

		var page = $('<div></div>', { 'class': 'page cursor-text', contenteditable: 'true' });
		page
			.css(this._getPageDimentions())
			.keyup(function(e) {
				if (page[0].scrollHeight > page[0].clientHeight) {
					if (page.index() == that._pages.last().index()) { //Last page, add one more
						var newPage = that._addPage();
						newPage.focus();
					} else {
						that.goToPage(page.index() + 1);
					}
				}
			})
			.focus(function() {
				that._currentPage = $(this);
			})
			.appendTo(this._container.scrollPane('content'));

		this._pages = this._pages.add(page);

		this._container.scrollPane('reload');

		return page;
	},
	_removePage: function(page) {
		if (typeof page == 'undefined') {
			page = this._currentPage;
		} else if (typeof page == 'number') {
			page = this._pages[page];
		}
		$page = $(page);

		this._currentPage = this._pages[$page.index() - 1];
		this._pages = this._pages.not($page);

		$page.empty().remove();

		this._container.scrollPane('reload');

		this.goToPage();
	}
};
Webos.inherit(LibreOffice.Writer, Webos.Observable);
Webos.inherit(LibreOffice.Writer, Webos.TranslatedLibrary);

LibreOffice.Writer._paperFormats = {
	'A4': {
		width: 2480,
		height: 3508,
		resolution: 300
	}
};
LibreOffice.Writer.paperFormat = function(name) {
	return LibreOffice.Writer._paperFormats[name] || null;
};