if (typeof window.LibreOffice == 'undefined') {
	window.LibreOffice = {};
}

LibreOffice.Writer = function LibreOfficeWriter(file, options) {
	var that = this;
	
	this._window = $.w.window({
		title: 'LibreOffice Writer',
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
			filename = 'Nouveau document';
		}
		this._window.window('option', 'title', filename+' - LibreOffice Writer');
	};
	this.open = function(file) {
		if (jQuery.inArray(file.get('extension'), that.supportedExtensions) == -1) {
			W.Error.trigger('Type de fichier incorrect');
			return;
		}

		file = W.File.get(file);
		
		that._window.window('loading', true, {
			message: 'Ouverture de « '+file.get('path')+' »...'
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
					Webos.Error.trigger('Impossible d\'ouvrir "'+file.get('path')+'" : le fichier est corrompu', e.getMessage());
				}
			} finally {
				that._window.window('loading', false);
				that._container.scrollPane('reload');
			}
		}, function(response) {
			that._window.window('loading', false);
			response.triggerError('Impossible d\'ouvrir "'+file.get('path')+'"');
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
		
		var filename = (this._file) ? this._file.get('basename') : 'Nouveau fichier';
		var confirm = $.w.window.confirm({
			title: 'Enregistrer les modifications',
			label: 'Voulez-vous enregistrer les modifications du document « '+filename+' » avant de le fermer ?',
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
			cancelLabel: 'Fermer sans enregistrer',
			confirmLabel: 'Enregistrer'
		});
		confirm.window('open');
	};
	this.save = function(callback) {
		callback = W.Callback.toCallback(callback);
		
		var contents = this._editable.html();
		var saveFn = function(file) {
			if (jQuery.inArray(file.get('extension'), that.supportedExtensions) == -1) {
				W.Error.trigger('Type de fichier incorrect');
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
				response.triggerError('Impossible d\'enregistrer le fichier "'+file.getAttribute('path')+'"');
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
							response.triggerError('Impossible d\'enregistrer le fichier "'+path+'"');
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
				W.Error.trigger('Type de fichier incorrect');
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
				response.triggerError('Impossible d\'enregistrer le fichier "'+file.getAttribute('path')+'"');
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
						response.triggerError('Impossible d\'enregistrer le fichier "'+path+'"');
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
		W.Error.trigger('Votre navigateur n\'est pas support&eacute;, vous &ecirc;tes en mode "lecture seule"', 'Le support de la propri&eacute;t&eacute; HTML5 "contenteditable" est requis pour &eacute;diter les documents.');
	}
};
