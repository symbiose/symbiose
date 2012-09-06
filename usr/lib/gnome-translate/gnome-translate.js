var GnomeTranslateWindow = function GnomeTranslateWindow(file) {
	var that = this;
	
	this._window = $.w.window({
		title: 'Traduction d\'applications',
		icon: 'apps/translate',
		width: 600,
		height: 400,
		stylesheet: '/usr/share/css/gnome-translate/main.css'
	});
	
	this._refreshTitle = function() {
		var title = '';
		
		if (this._originalFile) {
			title = this._originalFile.get('basename');
		} else {
			title = 'Nouvelle traduction';
		}
		
		if (this._exportFile) {
			title += ' [export&eacute;e]';
		}
		
		title += ' - Traduction d\'applications';
		
		this._window.window('option', 'title', title);
	};
	
	this.openFile = function() {
		new NautilusFileSelectorWindow({
			parentWindow: that._window
		}, function(file) {
			if (typeof file != 'undefined') {
				if (file.get('extension') == 'ini') {
					that.parse(file);
				} else {
					that.translate(file);
				}
			}
		});
	};
	
	this._originalFile = null;
	
	this.translate = function(file) {
		this._window.window('loading', true, {
			message: 'Chargement du fichier « '+file.get('basename')+' »...'
		});
		file.contents([function(contents) {
			that._originalFile = file;
			
			that._translate(contents);
			
			that._refreshTitle();
		}, function(response) {
			that._window.window('loading', false);
			that._refreshTitle();
			response.triggerError('Impossible de charger le fichier "'+file.get('path')+'"');
		}]);
	};
	
	this._translate = function(contents) {
		this._window.window('loading', true, {
			message: 'G&eacute;n&eacute;ration des traductions...'
		});
		
		var translates = [], lastChar = null, inString = false, stringOpener = null, inConcat = false, concatStart = 0, inComment = false, commentOpener = null, buffer = '';
		for (var i = 0; i < contents.length; i++) {
			var currentChar = contents[i];
			switch(currentChar) {
				case '"':
				case '\'':
					if (inString && inConcat && lastChar == '+') {
						inConcat = false;
						buffer = jQuery.trim(buffer);
						var concatContents = jQuery.trim(buffer.substr(concatStart));
						concatContents = jQuery.trim(concatContents.substring(0, concatContents.length - 1));
						buffer = buffer.substr(0, concatStart);
						if (concatContents) {
							buffer += '${'+concatContents.replace('{', '&#x7B;').replace('}', '&#x7D;')+'}';
						}
						stringOpener = currentChar;
					} else if (inString && inConcat) {
						buffer += currentChar;
					} else if (inString && stringOpener == currentChar && lastChar != '\\') {
						inString = false;
						translates.push([buffer, '']);
						buffer = '';
					} else if (inString) {
						buffer += currentChar;
					} else if (!inComment) {
						inString = true;
						stringOpener = currentChar;
					}
					break;
				case '\\':
					if (inString && lastChar == '\\') {
						buffer += currentChar;
					}
					break;
				case '+':
					if (!inString && lastChar == stringOpener) { //Si on vient de fermer une chaine
						buffer = translates.pop()[0];
						inString = true;
						inConcat = true;
						concatStart = buffer.length;
					} else if (inString) {
						buffer += currentChar;
					}
					break;
				case ';':
					if (inConcat) {
						inConcat = false;
						inString = false;
						buffer = jQuery.trim(buffer);
						var concatContents = jQuery.trim(buffer.substr(concatStart));
						buffer = buffer.substr(0, concatStart);
						if (concatContents) {
							buffer += '${'+concatContents.replace('{', '&#x7B;').replace('}', '&#x7D;')+'}';
						}
						translates.push([buffer, '']);
						buffer = '';
					} else if (inString) {
						buffer += currentChar;
					}
					break;
				case '/':
					if (!inComment && !inString && lastChar == '/') {
						inComment = true;
						commentOpener = '//';
					}
					if (inComment && commentOpener == '/*' && lastChar == '*') {
						inComment = false;
					}
					if (inString) {
						buffer += currentChar;
					}
					break;
				case "\n":
					if (inComment && commentOpener == '//') {
						inComment = false;
					}
					break;
				case '*':
					if (!inComment && !inString && lastChar == '/') {
						inComment = true;
						commentOpener = '/*';
					}
					if (inString) {
						buffer += currentChar;
					}
					break;
				default:
					if (inString) {
						buffer += currentChar;
					}
			}
			if (!inString || inConcat) {
				if (!/^\s$/.test(currentChar)) {
					lastChar = currentChar;
				}
			} else {
				lastChar = currentChar;
			}
		}
		
		this._buildList(translates, null, true);
		
		this._window.window('loading', false);
	};
	
	this._translates = [];
	this._columnToComplete = 0;
	this._buildList = function(translates, languages, merge) {
		this._window.window('loading', true, {
			message: 'G&eacute;n&eacute;ration du formulaire...'
		});
		
		if (!languages) {
			languages = [Webos.Locale.getDefault().name(), Webos.Locale.get(Webos.Locale.current()).name()];
		}
		
		this._list.list('content').empty();
		this._list.detach();
		
		var columnToComplete = (languages[0] != Webos.Locale.getDefault().name()) ? 0 : 1;
		
		var oldTranslates = this._translates, mergedTranslates = [];
		var oldColumnToComplete = this._columnToComplete;
		
		if (!merge) {
			oldTranslates = [];
		}
		
		var oldIndexes = {}, newIndexes = {}, mergedIndexes = {};
		for (var i = 0; i < oldTranslates.length; i++) {
			oldIndexes[oldTranslates[i][1 - oldColumnToComplete]] = i;
		}
		
		for (var i = 0; i < translates.length; i++) {
			if (translates[i][1 - columnToComplete] && typeof newIndexes[translates[i][1 - columnToComplete]] != 'undefined') {
				continue;
			}
			
			var translate = translates[i];
			
			if (!translates[i][columnToComplete] && typeof oldIndexes[translates[i][1 - columnToComplete]] != 'undefined' && oldTranslates[oldIndexes[translates[i][1 - columnToComplete]]][oldColumnToComplete]) {
				translate[columnToComplete] = oldTranslates[oldIndexes[translates[i][1 - columnToComplete]]][oldColumnToComplete];
			}
			
			newIndexes[translates[i][1 - columnToComplete]] = i;
			mergedIndexes[translates[i][1 - columnToComplete]] = mergedTranslates.push(translate) - 1;
		}
		
		for (var i = 0; i < oldTranslates.length; i++) {
			var index = oldTranslates[i][1 - oldColumnToComplete];
			if (typeof mergedIndexes[index] != 'undefined' && !mergedTranslates[mergedIndexes[index]][columnToComplete] && oldTranslates[oldIndexes[index]][oldColumnToComplete]) {
				mergedTranslates[mergedIndexes[index]][columnToComplete] = oldTranslates[oldIndexes[index]][oldColumnToComplete];
			} else if (typeof mergedIndexes[index] == 'undefined' || !index) {
				var translate;
				if (columnToComplete == 0) {
					translate = [oldTranslates[i][oldColumnToComplete], index];
				} else { //columnToComplete == 1
					translate = [index, oldTranslates[i][oldColumnToComplete]];
				}
				mergedIndexes[translate[1 - columnToComplete]] = mergedTranslates.push(translate) - 1;
			}
		}
		
		this._columnToComplete = columnToComplete;
		this._translates = mergedTranslates;
		translates = mergedTranslates;
		
		var generateLanguageSelectorFn = function(label, lang) {
			var list = {};
			var locales = Webos.Locale.getAll();
			for (var index in locales) {
				list[index] = locales[index].title();
			}
			return $.w.selectButton(label, list).selectButton('value', lang);
		};
		
		this._list.list('column', 2 - columnToComplete).empty().append(generateLanguageSelectorFn('Texte &agrave; traduire en ', languages[0]).bind('selectbuttonchange', function() {
			lang = $(this).selectButton('value');
			if (languages[1] == lang) {
				languages[1] = languages[0];
			}
			languages[0] = lang;
			that._buildList(translates, languages);
		}));
		this._list.list('column', columnToComplete + 1).empty().append(generateLanguageSelectorFn('Traduction &agrave; faire en ', languages[1]).bind('selectbuttonchange', function() {
			lang = $(this).selectButton('value');
			if (languages[0] == lang) {
				languages[0] = languages[1];
			}
			languages[1] = lang;
			that._buildList(translates, languages);
		}));
		
		for (var i = 0; i < translates.length; i++) {
			(function(i, translate) {
				if (translate[0].length == 0 && translate[1].length == 0) {
					return;
				}
				
				var enabled = $.w.checkButton('', (translate[0] && translate[1]) ? true : false),
					toTranslate = $.w.textEntry('', translate[0]),
					translated = $.w.textEntry('', translate[1]);
				var item = $.webos.listItem([enabled,'','']).keyup(function() {
					enabled.checkButton('value', (toTranslate.textEntry('value') && translated.textEntry('value')) ? true : false);
				});
				item.listItem('column', 2 - columnToComplete).append(toTranslate);
				item.listItem('column', columnToComplete + 1).append(translated);
				item.appendTo(that._list.list('content'));
			})(i, translates[i]);
		}
		
		this._list.appendTo(this._window.window('content'));
		
		this._window.window('loading', false);
	};
	
	this.parse = function(file) {
		this._window.window('loading', true, {
			message: 'Chargement du fichier « '+file.get('basename')+' »...'
		});
		file.contents([function(contents) {
			var data = Webos.Translation.parse(contents);
			var translates = [];
			
			for (var index in data) {
				translates.push([index, data[index]]);
			}
			
			that._exportFile = file;
			that._isSaved = true;
			that._refreshTitle();
			
			that._buildList(translates, null, true);
			
			that._window.window('loading', false);
		}, function(response) {
			that._window.window('loading', false);
			response.triggerError('Impossible de charger le fichier "'+file.get('path')+'"');
		}]);
	};
	
	this.createEmptyTranslation = function() {
		this._originalFile = null;
		this._exportFile = null;
		this._translates = [];
		this._buildList([]);
		this._refreshTitle();
	};
	
	this._export = function() {
		this._window.window('loading', true, {
			message: 'G&eacute;n&eacute;ration du fichier de traduction...'
		});
		
		var contents = '';
		
		if (this._originalFile) {
			contents += '; '+this._originalFile.get('path')+"\n";
		}
		
		var escapeFn = function(str) {
			return str.replace('=', '&#x3D;');
		};
		
		this._list.list('items').each(function() {
			var enabled = $(this).listItem('column', 0).children().checkButton('value');
			if (enabled) {
				var toTranslate = $(this).listItem('column', 1).children().textEntry('value'), translated = $(this).listItem('column', 2).children().textEntry('value');
				contents += escapeFn(toTranslate)+'='+escapeFn(translated)+"\n";
			}
		});
		
		this._window.window('loading', false);
		
		return contents;
	};
	
	this.export = function() {
		var contents = this._export();
		
		var dialog = $.w.window.dialog({
			title: 'Export de la traduction',
			parentWindow: this._window,
			width: 500,
			height: 300
		});
		
		var nl2brFn = function(str) {
			return str.replace("\n", '<br />');
		};
		
		dialog.window('content').html('<pre>'+nl2brFn(contents)+'</pre>');
		
		dialog.window('open');
	};
	
	this.import = function() {
		var dialog = $.w.window.dialog({
			title: 'Import d\'un fichier &agrave; traduire',
			parentWindow: this._window,
			width: 500
		});
		
		var form = $.w.entryContainer().submit(function() {
			dialog.window('close');
			that._translate(contents.textAreaEntry('value'));
		}).appendTo(dialog.window('content'));
		
		var contents = $.w.textAreaEntry('Code source de l\'application &agrave; traduire :').appendTo(form);
		contents.textAreaEntry('content').width('100%').height('300px');
		
		var buttons = $.w.buttonContainer().appendTo(form);
		$.w.button('Annuler').click(function() {
			dialog.window('close');
		}).appendTo(buttons);
		$.w.button('Importer', true).appendTo(buttons);
		
		dialog.window('open');
	};
	
	this._isSaved = false;
	this._exportFile = null;
	this.save = function(callback) {
		var callback = W.Callback.toCallback(callback);
		
		var file = this._exportFile;
		var contents = this._export();
		var saveFn = function(file) {
			that._window.window('loading', true, {
				lock: false
			});
			file.setContents(contents, new W.Callback(function() {
				that._refreshTitle();
				that._window.window('loading', false);
				that._isSaved = true;
				callback.success(file);
			}, function(response) {
				that._window.window('loading', false);
				response.triggerError('Impossible d\'enregistrer le fichier "'+file.getAttribute('path')+'"');
			}));
		};
		
		if (file) {
			saveFn(file);
		} else {
			new NautilusFileSelectorWindow({
				parentWindow: this._window,
				exists: false
			}, function(path) {
				if (typeof path != 'undefined') {
					W.File.load(path, new W.Callback(function(file) {
						saveFn(file);
					}, function(response) {
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
	
	this.openAboutWindow = function() {
		$.w.window.about({
			name: 'Traduction d\'applications',
			version: '0.1',
			description: 'Simplifie la traduction d\'applications.',
			author: '$imon',
			icon: 'apps/translate'
		}).window('open');
	};
	
	this._list = $.w.list(['','','']).appendTo(this._window.window('content'));
	
	var headers = this._window.window('header');
	
	var menu = $.w.menuWindowHeader().appendTo(headers);
	
	var fileItem = $.w.menuItem('Fichier').appendTo(menu);
	fileItemContent = fileItem.menuItem('content');
	
	$.w.menuItem('Ouvrir...')
		.click(function() {
			that.openFile();
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Importer')
		.click(function() {
			that.import();
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Enregistrer', true)
		.click(function() {
			that.save();
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Exporter')
		.click(function() {
			that.export();
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Quitter', true)
		.click(function() {
			that._window.window('close');
		})
		.appendTo(fileItemContent);
	
	var helpItem = $.w.menuItem('Aide').appendTo(menu);
	helpItemContent = helpItem.menuItem('content');
	
	$.w.menuItem('&Agrave; propos')
		.click(function() {
			that.openAboutWindow();
		})
		.appendTo(helpItemContent);
	
	this._window.window('open');
	
	if (file) {
		if (file.get('extension') == 'ini') {
			that.parse(file);
		} else {
			that.translate(file);
		}
	} else {
		this.createEmptyTranslation();
	}
};
