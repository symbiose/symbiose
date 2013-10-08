/**
 * Editeur de texte gedit.
 * @version 1.3
 * @author $imon
 */

new W.ScriptFile('usr/lib/codemirror/codemirror.js');
new W.Stylesheet('/usr/share/css/codemirror/main.css');

$.webos.widget('gedit', 'container', {
	_name: 'gedit',
	options: {
		language: null
	},
	_create: function() {
		this._super('_create');

		var that = this;
		
		this.options._components.codemirror = CodeMirror(this.element[0], {
			value: '',
			mode: 'null',
			lineNumbers: true,
			onChange: function(editor, change) {
				that._trigger('change', { type: 'change' }, { editor: that.element, change: change });
			}
		});
		
		this.element.addClass('cursor-text');
		
		this.option('language', this.options.language);
	},
	undo: function() {
		this.options._components.codemirror.undo();
	},
	redo: function() {
		this.options._components.codemirror.redo();
	},
	selectAll: function() {
		var codemirror = this.options._components.codemirror;

		codemirror.setSelection({
			line: 0,
			ch: 0
		}, {
			line: Number.POSITIVE_INFINITY,
			ch: Number.POSITIVE_INFINITY
		});
		codemirror.focus();
	},
	contents: function(value) {
		if (typeof value == 'undefined') {
			return this.options._components.codemirror.getValue();
		} else {
			this.options._components.codemirror.setValue(value);
		}
	},
	codemirror: function(method) {
		var args = [];
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
		
		if (this.options._components.codemirror[method]) {
			return this.options._components.codemirror[method].apply(this.options._components.codemirror, args);
		}
	},
	_update: function(key, value) {
		switch (key) {
			case 'language':
				if (value && jQuery.inArray(value, $.webos.gedit.modes()) == -1) {
					return;
				}
				
				$.webos.gedit.loadMode(value);

				this.options._components.codemirror.setOption('mode', String(value));
				break;
		}
	}
});
$.webos.gedit = function(options) {
	return $('<div></div>').gedit(options);
};
$.webos.gedit.modes = function() {
	return ['clike',
            'clojure',
            'coffeescript',
            'css',
            'diff',
            'gfm',
            'groovy',
            'haskell',
            'htmlembedded',
            'htmlmixed',
            'javascript',
            'jinja2',
            'lua',
            'markdown',
            'ntriples',
            'pascal',
            'perl',
            'php',
            'plsql',
            'python',
            'r',
            'rst',
            'ruby',
            'rust',
            'scheme',
            'smalltalk',
            'sparql',
            'stex',
            'text',
            'tiddlywiki',
            'velocity',
            'xml',
            'xmlpure',
            'yaml'];
};
$.webos.gedit.depends = function(mode) {
	var depends = {
		htmlmixed: ['xml', 'javascript', 'css'],
		php: ['xml', 'javascript', 'css', 'clike']
	};
	
	if (typeof depends[mode] == 'undefined') {
		return [];
	}
	
	return depends[mode];
};

$.webos.gedit.modesLoaded = ['text'];

$.webos.gedit.modeFromExt = function(ext) {
	var languages = {
		'c': 'clike',
		'c++': 'clike',
		'java': 'clike',
		'clj': 'clojure',
		'coffee': 'coffeescript',
		'aspx': 'htmlembedded',
		'ejs': 'htmlembedded',
		'jsp': 'htmlembedded',
		'html': 'htmlmixed',
		'js': 'javascript',
		'pl': 'perl',
		'pm': 'perl',
		'py': 'python',
		'rb': 'ruby'
	};
	
	if (jQuery.inArray(ext, $.webos.gedit.modes()) != -1) {
		return ext;
	} else if (jQuery.inArray(languages[ext], $.webos.gedit.modes()) != -1) {
		return languages[ext];
	} else {
		return null;
	}
};
$.webos.gedit.loadMode = function(mode) {
	if (!mode) {
		return;
	}
	
	if (jQuery.inArray(mode, $.webos.gedit.modesLoaded) != -1) {
		return;
	}
	
	var depends = $.webos.gedit.depends(mode);
	if (depends.length > 0) {
		for (var i = 0; i < depends.length; i++) {
			$.webos.gedit.loadMode(depends[i]);
		}
	}
	
	new W.ScriptFile('usr/lib/codemirror/mode/'+mode+'/'+mode+'.js');
	$.webos.gedit.modesLoaded.push(mode);
};

function GEditWindow(file) {
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;;
		
		this._window = $.w.window.main({
			title: t.get('Gedit text editor'),
			icon: new W.Icon('apps/text-editor'),
			width: 500,
			height: 300,
			stylesheet: 'usr/share/css/gedit/main.css'
		});
		
		this._refreshTitle = function() {
			var file = this._file;
			
			var title = '';
			if (!this._isSaved) {
				title += '*';
			}
			if (file) {
				title += file.get('path');
			} else {
				title += t.get('New file');
			}
			
			title += ' - gedit';
			
			this._window.window('option', 'title', title);
		};
		
		this.openAboutWindow = function() {
			var aboutWindow = $.w.window.about({
				name: 'gedit',
				version: '1.3',
				description: t.get('Gedit is a small and light text editor.'),
				author: '$imon',
				icon: 'applications/gedit'
			});
			aboutWindow.window('open');
		};
		
		this.open = function(file, callback) {
			callback = W.Callback.toCallback(callback);
			file = W.File.get(file);
			
			if (file.get('is_dir')) {
				W.Error.trigger(t.get('The specified file is a directory'));
				return;
			}
			
			that._window.window('loading', true, {
				lock: false
			});
			file.readAsText(new W.Callback(function(contents) {
				that._window.window('loading', false);

				that._file = file;
				that._gedit.gedit('contents', '');
				that._gedit.gedit('option', 'language', $.webos.gedit.modeFromExt(file.get('extension')));
				that._gedit.gedit('contents', contents);
				that._gedit.gedit('codemirror', 'clearHistory');
				that._content.scrollPane('reload');
				
				that._isSaved = true;
				that._refreshTitle();
				
				callback.success();
			}, function(response) {
				that._window.window('loading', false);
				callback.error(response);
			}));
		};
		
		this.createEmptyFile = function() {
			this._file = null;		
			this._gedit.gedit('contents', '');
			this._gedit.gedit('option', 'language', null);
			this._gedit.gedit('codemirror', 'clearHistory');
			this._content.scrollPane('reload');
			
			this._isSaved = true;
			this._refreshTitle();
		};
		
		this.save = function(callback) {
			callback = W.Callback.toCallback(callback);
			
			var file = this._file;
			var contents = this._gedit.gedit('contents');
			
			var saveFn = function(file) {
				that._window.window('loading', true, {
					lock: false
				});
				file.setContents(contents, new W.Callback(function() {
					that._window.window('loading', false);
					if (!that._file) {
						that._file = file;
					}
					that._isSaved = true;
					that._refreshTitle();
					callback.success(file);
				}, function(response) {
					that._window.window('loading', false);
					response.triggerError(t.get('Can\'t save the file "${path}"', { path: file.get('path') }));
				}));
			};
			
			if (file && file.can('write')) {
				saveFn(file);
			} else {
				new NautilusFileSelectorWindow({
					parentWindow: that._window,
					exists: false
				}, function(paths) {
					if (paths.length) {
						var path = paths[0];
						W.File.load(path, new W.Callback(function(file) {
							saveFn(file);
						}, function(response) {
							W.File.createFile(path, new W.Callback(function(file) {
								saveFn(file);
							}, function(response) {
								response.triggerError(t.get('Can\'t save the file "${path}"', { path: path }));
							}));
						}));
					}
				});
			}
		};
		
		this.saveAs = function(callback) {
			var callback = W.Callback.toCallback(callback);
			
			var contents = this._gedit.gedit('contents');
			var saveFn = function(file) {
				that._window.window('loading', true, {
					lock: false
				});
				file.setContents(contents, new W.Callback(function() {
					that._window.window('loading', false);
					if (!that._file) {
						that._file = file;
						that._isSaved = true;
					}
					that._refreshTitle();
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
					var path = paths[0];
					W.File.load(path, new W.Callback(function(file) {
						saveFn(file);
					}, function(response) {
						W.File.createFile(path, new W.Callback(function(file) {
							saveFn(file);
						}, function(response) {
							response.triggerError(t.get('Can\'t save the file "${path}"', { path: path }));
						}));
					}));
				}
			});
		};
		
		this.mode = function(mode) {
			if (!mode) {
				return this._gedit.gedit('option', 'language');
			} else {
				this._gedit.gedit('option', 'language', mode);
			}
		};
		
		this._isSaved = false;
		
		this.saved = function() {
			return this._isSaved;
		};
		
		var headers = this._window.window('header');
		
		var menu = $.w.menuWindowHeader().appendTo(headers);
		
		var fileItem = $.w.menuItem(t.get('File')).appendTo(menu);
		fileItemContent = fileItem.menuItem('content');
		
		$.w.menuItem(t.get('New'))
			.click(function() {
				new GEditWindow();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Open...'))
			.click(function() {
				new NautilusFileSelectorWindow({
					parentWindow: that._window
				}, function(files) {
					if (files.length) {
						that.open(files[0]);
					}
				});
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Save'))
			.click(function() {
				that.save();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Save as...'))
			.click(function() {
				that.saveAs();
			})
			.appendTo(fileItemContent);
		
		$.w.menuItem(t.get('Quit'))
			.click(function() {
				that._window.window('close');
			})
			.appendTo(fileItemContent);
		
		var editItem = $.w.menuItem(t.get('Edit')).appendTo(menu);
		editItemContent = editItem.menuItem('content');
		
		$.w.menuItem(t.get('Undo'))
			.click(function() {
				that._gedit.gedit('undo');
			})
			.appendTo(editItemContent);
		
		$.w.menuItem(t.get('Redo'))
			.click(function() {
				that._gedit.gedit('redo');
			})
			.appendTo(editItemContent);

		$.w.menuItem(t.get('Select all'))
			.click(function() {
				that._gedit.gedit('selectAll');
			})
			.appendTo(editItemContent);
		
		var viewItem = $.w.menuItem(t.get('View')).appendTo(menu);
		viewItemContent = viewItem.menuItem('content');
		
		var modeItem = $.w.menuItem(t.get('Color mode')).appendTo(viewItemContent);
		var modes = $.webos.gedit.modes();
		var letters = {};
		for (var i = 0; i < modes.length; i++) {
			(function(mode) {
				var firstLetter = mode.substr(0, 1);
				if (!letters[firstLetter]) {
					letters[firstLetter] = $.w.menuItem(firstLetter).appendTo(modeItem.menuItem('content'));
				}
				
				$.w.menuItem(mode).click(function() {
					that.mode(mode);
				}).appendTo(letters[firstLetter].menuItem('content'));
			})(modes[i]);
		}
		
		var helpItem = $.w.menuItem(t.get('Help')).appendTo(menu);
		helpItemContent = helpItem.menuItem('content');
		
		$.w.menuItem(t.get('About'))
			.click(function() {
				that.openAboutWindow();
			})
			.appendTo(helpItemContent);
		
		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons = {};
		
		this._buttons.createEmptyFile = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/document-new', 'button'))
			.click(function() {
				new GEditWindow();
			})
			.appendTo(toolbar);
		this._buttons.openFile = $.w.toolbarWindowHeaderItem(t.get('Open'), new W.Icon('actions/document-open', 'button'))
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
		this._buttons.saveFile = $.w.toolbarWindowHeaderItem(t.get('Save'), new W.Icon('actions/document-save', 'button'))
			.click(function() {
				that.save();
			})
			.appendTo(toolbar);
		this._buttons.undo = $.w.toolbarWindowHeaderItem(t.get('Undo'), new W.Icon('actions/edit-undo', 'button'))
			.click(function() {
				that._gedit.gedit('undo');
			})
			.appendTo(toolbar);
		this._buttons.redo = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/edit-redo', 'button'))
			.click(function() {
				that._gedit.gedit('redo');
			})
			.appendTo(toolbar);
		
		this._content = $('<div></div>').appendTo(this._window.window('content'));
		
		this._gedit = $.w.gedit();

		this._gedit.bind('geditchange', function() {
			if (that._isSaved) {
				that._isSaved = false;
				that._refreshTitle();
			}
		}).bind('mousedown', function() {
			var speed = 0.75;
			var offset = that._content.offset(), dimentions = {
				width: that._content.width(),
				height: that._content.height()
			};
			var distanceX = 0, distanceY = 0;
			
			var timer = setInterval(function() {
				if (distanceX != 0) {
					that._content.scrollPane('scrollByX', distanceX * speed, false);
				}
				if (distanceY != 0) {
					that._content.scrollPane('scrollByY', distanceY * speed, false);
				}
			}, 100);
			$(document).bind('mousemove.gedit.webos', function(e) {
				if (e.pageX < offset.left) {
					distanceX = e.pageX - offset.left;
				} else if (e.pageX > offset.left + dimentions.width) {
					distanceX = e.pageX - (offset.left + dimentions.width);
				} else {
					distanceX = 0;
				}
				
				if (e.pageY < offset.top) {
					distanceY = e.pageY - offset.top;
				} else if (e.pageY > offset.top + dimentions.height) {
					distanceY = e.pageY - (offset.top + dimentions.height);
				} else {
					distanceY = 0;
				}
			});
			$(document).one('mouseup', function() {
				$(document).unbind('mousemove.gedit.webos');
				clearInterval(timer);
			});
		});
		
		this._gedit.gedit('codemirror', 'setOption', 'onCursorActivity', function() {
			if (that._gedit.gedit('codemirror', 'getSelection').length > 0) { //Si on selectionne du texte, c'est un autre code qui gere le deplacement
				return;
			}
			
			var coords = that._gedit.gedit('codemirror', 'cursorCoords', false, 'page');
			var offset = that._content.offset(), dimentions = {
				width: that._content.width(),
				height: that._content.height()
			};
			if (coords.x < offset.left) {
				that._content.scrollPane('scrollByX', coords.x - offset.left, false);
			}
			if (coords.x > offset.left + dimentions.width) {
				that._content.scrollPane('scrollByX', coords.x - offset.left - dimentions.width, false);
			}
			if (coords.y < offset.top) {
				that._content.scrollPane('scrollByY', coords.y - offset.top, false);
			}
			if (coords.yBot > offset.top + dimentions.height) {
				that._content.scrollPane('scrollByY', coords.yBot - offset.top - dimentions.height, false);
			}
		});
		
		this._content.scrollPane({
			autoReload: true,
			expand: true,
			keyUpResize: true,
			alsoResize: this._gedit
		}).on('scrollpanereload', function() {
			that._gedit.gedit('codemirror', 'refresh');
		});
		
		this._gedit.appendTo(this._content.scrollPane('content'));
		
		this._gedit.parent().mouseup(function(event) {
			if ($(event.target).is(this)) {
				that._gedit.gedit('codemirror', 'focus');
				that._gedit.gedit('codemirror', 'setCursor', that._gedit.gedit('codemirror', 'getValue').length);
			}
		});

		var closeStackLength = 0;
		this._window.bind('windowbeforeclose', function(event) {
			if (closeStackLength > 0) {
				closeStackLength = 0;
				return;
			}
			
			var file = that._file;
			if (!that.saved()) {
				closeStackLength++;
				var filename = (Webos.isInstanceOf(file, Webos.File)) ? file.get('basename') : 'Nouveau fichier';
				var confirm = $.w.window.confirm({
					title: t.get('Save changes'),
					label: t.get('Do you want to save changes of the file « ${filename} » before closing it ?', { filename: filename }),
					cancel: function() {
						that._window.window('close');
					},
					confirm: function() {
						closeStackLength = 0;
						that.save(new W.Callback(function() {
							that._window.window('close');
						}));
					},
					cancelLabel: t.get('Close without saving'),
					confirmLabel: t.get('Save')
				});
				confirm.window('open');
				event.preventDefault();
			}
		});
		
		this._refreshTitle();
		
		this._window.window('open');
		
		if (file) {
			this.open(file);
		} else {
			this.createEmptyFile();
		}
		
		this._content.scrollPane('reload');
		
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
}
GEditWindow.prototype = {
	_translationsName: 'gedit'
};

Webos.inherit(GEditWindow, Webos.Observable);
Webos.inherit(GEditWindow, Webos.TranslatedLibrary);