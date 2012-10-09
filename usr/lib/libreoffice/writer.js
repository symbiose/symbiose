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
			stylesheet: 'usr/share/css/libreoffice/writer.css'
		});
		
		this._container = $('<div></div>').scrollPane({
			autoReload: true,
			expand: true,
			keyUpResize: true
		}).appendTo(this._window.window('content'));
		this._editable = $('<div></div>', { 'class': 'editor', contenteditable: 'true' })
			.keyup(function() {
				that._container.scrollPane('reload');
			})
			.appendTo(this._container.scrollPane('content'));
		
		this.supportedExtensions = ['html', 'htm'];
		this._file = null;
		this._saved = false;
		this._refreshTitle = function() {
			var filename;
			if (this._file != null) {
				filename = this._file.get('basename');
			} else {
				filename = t.get('New document');
			}
			this._window.window('option', 'title', filename+' - '+t.get('LibreOffice Writer'));
		};
		this.open = function(file) {
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
				
				try {
					var xmlDoc = $.parseXML(contents), $xml = $(xmlDoc), $body = $xml.find('body');

					if ($body.length == 1) {
						that._editable.html($body.html());
					} else {
						that._editable.html($xml);
					}
				} catch (e) {
					try {
						$xml = $(contents);
						that._editable.html($xml);
					} catch (e) {
						Webos.Error.trigger(t.get('Can\'t open "{path}"', { path: file.get('path') })+' : '+t.get('the file is corrupted'), e.getMessage());
					}
				} finally {
					that._window.window('loading', false);
					that._container.scrollPane('reload');
				}
			}, function(response) {
				that._window.window('loading', false);
				response.triggerError(t.get('Can\'t open "{path}"', { path: file.get('path') }));
			}]);
		};
		this.newFile = function(contents) {
			if (typeof contents == 'undefined') {
				contents = '';
			}
			
			this.closeFile(new W.Callback(function() {
				that._file = null;
				that._saved = false;
				that._refreshTitle();
				that._editable.html(contents);
				that._container.scrollPane('reload');
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
					closeStackLength = 0;
					that.save(new W.Callback(function() {
						callback.success();
					}, function() {
						callback.error();
					}));
				},
				cancelLabel: t.get('Close without saving'),
				confirmLabel: t.get('Save')
			});
			confirm.window('open');
		};
		this.save = function(callback) {
			callback = W.Callback.toCallback(callback);
			
			var contents = this._editable.html();
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
			
			var contents = this._editable.html();
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
		};
		
		var headers = this._window.window('header');
		
		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons = {};
		
		this._buttons.newDoc = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-new', 'button'))
			.click(function() {
				new LibreOffice.Writer();
			})
			.appendTo(toolbar);
		
		this._buttons.open = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-open', 'button'))
			.click(function() {
				new NautilusFileSelectorWindow({
					parentWindow: that._window
				}, function(files) {
					if (files.length) {
						that.open(files[0]);
					}
				});
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
		
		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
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
		if (typeof file != 'undefined') {
			this.open(file);
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
	_translationsName: 'libreoffice.writer'
};
Webos.inherit(LibreOffice.Writer, Webos.Observable);
Webos.inherit(LibreOffice.Writer, Webos.TranslatedLibrary);