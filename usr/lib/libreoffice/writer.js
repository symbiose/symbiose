new W.ScriptFile('usr/lib/webos/file.js');

if (typeof window.LibreOffice == 'undefined') {
	window.LibreOffice = {};
}

LibreOffice.Writer = function LibreOfficeWriter(file, options) {
	var that = this;
	
	this._window = $.w.window({
		title: 'LibreOffice Writer',
		icon: new SIcon('applications/libreoffice-writer'),
		width: 550,
		height: 400
	});
	
	this._container = $('<div></div>', { style: 'width: 100%; height: 100%;' }).appendTo(this._window.window('content'));
	this._editable = $('<div></div>', { contenteditable: 'true', style: 'min-width: 100%; min-height: 100%;' }).appendTo(this._container.scrollPane('content'));
	
	this.supportedExtensions = ['html', 'htm'];
	this._file = null;
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
		
		that._window.window('loading', true);
		file.getContents(new W.Callback(function(contents) {
			that._file = file;
			that._refreshTitle();
			that._editable.html(contents);
			that._window.window('loading', false);
			that._container.scrollPane('reload');
		}, function(response) {
			that._window.window('loading', false);
			response.triggerError('Impossible d\'ouvrir "'+file.getAttribute('path')+'"');
		}));
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
				that._refreshTitle();
				that._window.window('loading', false);
				callback.success(file);
			}, function(response) {
				that._window.window('loading', false);
				response.triggerError('Impossible d\'enregistrer le fichier "'+file.getAttribute('path')+'"');
			}));
		};
		
		if (typeof this._file != 'undefined' && this._file != null) {
			saveFn(this._file);
		} else {
			new NautilusFileSelectorWindow({
				parentWindow: that._window,
				exists: false
			}, function(path) {
				if (typeof path != 'undefined') {
					W.File.get(path, new W.Callback(function(file) {
						saveFn(file);
					}, function(response) {
						if (!(new RegExp('\.('+that.supportedExtensions.join('|')+')$')).test(path)) {
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
		}, function(path) {
			if (typeof path != 'undefined') {
				W.File.get(path, new W.Callback(function(file) {
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
	
	this._buttons.newDoc = $.w.toolbarWindowHeaderItem('', new SIcon('actions/document-new', 'button'))
		.click(function() {
			new LibreOffice.Writer();
		})
		.appendTo(toolbar);
	
	this._buttons.open = $.w.toolbarWindowHeaderItem('', new SIcon('actions/document-open', 'button'))
		.click(function() {
			new NautilusFileSelectorWindow({
				parentWindow: that._window
			}, function(file) {
				if (typeof file != 'undefined') {
					that.open(file);
				}
			});
		})
		.appendTo(toolbar);
	
	this._buttons.save = $.w.toolbarWindowHeaderItem('', new SIcon('actions/document-save', 'button'))
		.click(function() {
			that.save();
		})
		.appendTo(toolbar);
	
	this._buttons.undo = $.w.toolbarWindowHeaderItem('', new SIcon('actions/edit-undo', 'button'))
		.click(function() {
			that.command('undo');
		})
		.appendTo(toolbar);

	this._buttons.redo = $.w.toolbarWindowHeaderItem('', new SIcon('actions/edit-redo', 'button'))
		.click(function() {
			that.command('redo');
		})
		.appendTo(toolbar);
	
	var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
	
	this._buttons.bold = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-text-bold', 'button'))
		.click(function() {
			that.command('bold');
		})
		.appendTo(toolbar);
	
	this._buttons.italic = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-text-italic', 'button'))
		.click(function() {
			that.command('italic');
		})
		.appendTo(toolbar);
	
	this._buttons.underline = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-text-underline', 'button'))
		.click(function() {
			that.command('underline');
		})
		.appendTo(toolbar);
	
	this._buttons.underline = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-text-strikethrough', 'button'))
		.click(function() {
			that.command('strikethrough');
		})
		.appendTo(toolbar);
	
	this._buttons.justifyLeft = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-justify-left', 'button'))
		.click(function() {
			that.command('justifyleft');
		})
		.appendTo(toolbar);
	
	this._buttons.justifyCenter = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-justify-center', 'button'))
		.click(function() {
			that.command('justifycenter');
		})
		.appendTo(toolbar);
	
	this._buttons.justifyRight = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-justify-right', 'button'))
		.click(function() {
			that.command('justifyright');
		})
		.appendTo(toolbar);
	
	this._buttons.justifyFill = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-justify-fill', 'button'))
		.click(function() {
			that.command('justifyfull');
		})
		.appendTo(toolbar);
	
	this._buttons.indent = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-indent-more', 'button'))
		.click(function() {
			that.command('indent');
		})
		.appendTo(toolbar);
	
	this._buttons.outdent = $.w.toolbarWindowHeaderItem('', new SIcon('actions/format-outdent-more', 'button'))
		.click(function() {
			that.command('outdent');
		})
		.appendTo(toolbar);
	
	this._window.window('open');
	this._container.scrollPane({
		autoResize: true
	});
	if (typeof file != 'undefined') {
		this.open(file);
	} else {
		this._refreshTitle();
	}
	
	if (!this.supported()) {
		W.Error.trigger('Votre navigateur n\'est pas support&eacute;.', 'Le support de la propri&eacute;t&eacute; HTML5 "contenteditable" est requis.');
	}
};