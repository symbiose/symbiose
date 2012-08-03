W.ScriptFile.load(
	'/usr/lib/jquery.filedrop.js',
	'/usr/lib/fileuploader.js',
	'/usr/lib/webos/applications.js'
);

(function($) {
	$.fn.setCursorPosition = function(pos1, pos2) {
		this.each(function(index, elem) {
			if (elem.setSelectionRange) {
				elem.setSelectionRange(pos1, pos2);
			} else if (elem.createTextRange) {
				var range = elem.createTextRange();
				range.collapse(true);
				range.moveEnd('character', pos1);
				range.moveStart('character', pos2);
				range.select();
			}
		});
		return this;
	};
})(jQuery);

var nautilusProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilus',
	options: {
		directory: '~',
		multipleWindows: false,
		uploads: [],
		display: 'icons',
		showHiddenFiles: false
	},
	_create: function() {
		var that = this;
		
		this.element.scrollPane({
			autoReload: true
		});
		this.options._components.container = this.element.scrollPane('content');
		
		if (this.options.display == 'icons') {
			this.options._content = $('<ul></ul>').addClass('icons').appendTo(this.options._components.container);
			
			that.content().mousedown(function(e) {
				if(e.button != 0) {
					return;
				}
				
				if (that.content().is(e.target)) {
					var offset = $(this).offset();
					var dimentions = {
						width: $(this).width(),
						height: $(this).height()
					};
					var diff = [offset.left, offset.top];
					var pos = [e.pageX - diff[0], e.pageY - diff[1]];
					
					var helper = $('<div></div>')
						.addClass('ui-selectable-helper')
						.css('top', pos[1])
						.css('left', pos[0])
						.css('width', 0)
						.css('height', 0)
						.css('position','absolute')
						.appendTo(that.content());
					
					$(document).bind('mousemove.'+that.id()+'.nautilus.widget.webos', function(e) {
						var x1 = pos[0], y1 = pos[1], x2 = e.pageX - diff[0], y2 = e.pageY - diff[1];
						if (x1 > x2) { var tmp = x2; x2 = x1; x1 = tmp; }
						if (y1 > y2) { var tmp = y2; y2 = y1; y1 = tmp; }
						if (x1 < 0) { x1 = 0; }
						if (y1 < 0) { y1 = 0; }
						if (x2 > dimentions.width) { x2 = dimentions.width; }
						if (y2 > dimentions.height) { y2 = dimentions.height; }
						helper.css({left: x1, top: y1, width: x2-x1, height: y2-y1});
						
						that.items().each(function() {
							var elPos = $(this).position();
							var elPos1 = { left: elPos.left, top: elPos.top };
							var elPos2 = { left: elPos1.left + $(this).outerWidth(), top: elPos1.top + $(this).outerHeight() };
							var hit = ( !(elPos1.left > x2 || elPos2.left < x1 || elPos1.top > y2 || elPos2.top < y1) );
							if (hit) {
								$(this).addClass('active');
							} else if($(this).is('.active')) {
								$(this).removeClass('active');
							}
						});
						
						e.preventDefault();
					});
					
					$(document).one('mouseup', function(e) {
						$(document).unbind('mousemove.'+that.id()+'.nautilus.widget.webos');
						helper.fadeOut('fast', function() {
							$(this).remove();
						});
						e.preventDefault();
					});
				}
				
				e.preventDefault();
				
				if ($(this).is(e.target)) {
					that.getSelection().removeClass('active');
					$(this).trigger('click');
				}
			});
		}

		if (this.options.display == 'list') {
			this.options._content = $.w.list(['Nom', 'Taille', 'Type']).appendTo(this.options._components.container);
		}

		this.content().click(function(event) {
			var item;
			if ($(event.target).is('li, tr')) {
				item = $(event.target);
			} else if ($(event.target).parents('li, tr').length > 0) {
				item = $(event.target).parents('li, tr').first();
			} else {
				that.getSelection().removeClass('active').trigger('unselect');
				return;
			}
			
			if ($.webos.keyboard.pressed('ctrl')) {
				item.addClass('active').trigger('select');
			} else {
				that.getSelection().trigger('unselect').removeClass('active');
				item.addClass('active').trigger('select');
			}
		});
		
		$.webos.keyboard.bind(this.element, 'enter', function(e) {
			if (e.isFocused) {
				return;
			}
			
			that.getSelection().each(function() {
				$(this).data('nautilus').open();
			});
		});
		$.webos.keyboard.bind(this.element, 'del', function(e) {
			if (e.isFocused) {
				return;
			}
			
			$that.getSelection().each(function() {
				$(this).data('nautilus').remove();
			});
		});
		
		$.webos.keyboard.bind(this.element, 'right', function(e) {
			if (e.isFocused) {
				return;
			}
			
			var selectedElements = that.getSelection().trigger('unselect').removeClass('active');
			var elementToSelect = selectedElements.last().next(':visible');
			if (elementToSelect.length > 0) {
				elementToSelect.addClass('active').trigger('select');
			}
		});
		$.webos.keyboard.bind(this.element, 'left', function(e) {
			if (e.isFocused) {
				return;
			}
			
			var selectedElements = that.getSelection().trigger('unselect').removeClass('active');
			var elementToSelect = selectedElements.last().prev(':visible');
			if (elementToSelect.length > 0) {
				elementToSelect.addClass('active').trigger('select');
			}
		});
		
		this.readDir(this.options.directory);
	},
	items: function() {
		if (this.options.display == 'icons') {
			return this.content().children('li').filter(':visible');
		}
		if (this.options.display == 'list') {
			return this.content().list('content').children('tr').filter(':visible');
		}
	},
	readDir: function(dir, userCallback) {
		if (typeof this.options._components.contextmenu != 'undefined') {
			this.options._components.contextmenu.contextMenu('destroy');
		}
		
		dir = W.File.cleanPath(dir);
		
		userCallback = W.Callback.toCallback(userCallback, new W.Callback(function() {}, function(response) {
			response.triggerError('Impossible de trouver « '+dir+' ».');
		}));
		
		var that = this;
		
		var callback = new W.Callback(function(files) {
			that.options.directory = dir;
			
			var contextmenu;
			
			that.options._components.contextmenu = contextmenu = $.w.contextMenu(that.element);
			
			$.webos.menuItem('Cr&eacute;er un dossier').click(function() {
				that.createFile('Nouveau dossier', true);
			}).appendTo(contextmenu);
			$.webos.menuItem('Cr&eacute;er un fichier').click(function() {
				that.createFile('Nouveau fichier');
			}).appendTo(contextmenu);
			$.webos.menuItem('T&eacute;l&eacute;charger', true).click(function() {
				W.File.load(dir, new W.Callback(function(file) {
					that._download(file);
				}));
			}).appendTo(contextmenu);
			$.webos.menuItem('Envoyer un fichier').click(function() {
				that.openUploadWindow();
			}).appendTo(contextmenu);
			$.webos.menuItem('Rafra&icirc;chir', true).click(function() {
				that.refresh();
			}).appendTo(contextmenu);
			$.webos.menuItem('Propri&eacute;t&eacute;s', true).click(function() {
				W.File.load(that.options.directory, new W.Callback(function(file) {
					that._openProperties(file);
				}));
			}).appendTo(contextmenu);
			
			var serverCall = new W.ServerCall({
				'class': 'FileController',
				method: 'upload',
				arguments: {
					dest: dir
				}
			});
			
			var uploadsIds = {};
			that.element.filedrop({
				url: serverCall.url,
				paramname: 'file',
				data: serverCall.data,
				error: function(event, ui) {
					switch(ui.error) {
						case 'BrowserNotSupported':
							W.Error.trigger('Votre navigateur ne supporte pas le glisser-d&eacute;poser. Veuillez envoyer vos fichiers via le formulaire classique');
							break;
						case 'TooManyFiles':
							W.Error.trigger('Trop de fichiers envoy&eacute;s');
							break;
						case 'FileTooLarge':
							W.Error.trigger('Le fichier "'+ui.file.name+'" est trop gros (taille du fichier : '+W.File.bytesToSize(ui.file.size)+', taille maximale : '+W.File.bytesToSize(that.element.filedrop('option', 'maxfilesize') * 1024 * 1024)+')');
							break;
						default:
							W.Error.trigger('Une erreur est survenue lors de l\'envoi du fichier : '+ui.error);
							break;
					}
				},
				maxfiles: 25,
				maxfilesize: 20,
				uploadstarted: function(event, ui) {
					uploadsIds[ui.index] = $.w.nautilus.progresses.add(0, 'Envoi de '+ui.file.name);
				},
				uploadfinished: function(event, ui) {
					var success = true;
					if (!ui.response.isSuccess()) {
						W.Error.trigger('Impossible d\'envoyer le fichier "'+ui.file.name+'"', ui.response.getAllChannels());
						success = false;
					} else if (!ui.response.getData().success) {
						W.Error.trigger('Impossible d\'envoyer le fichier "'+ui.file.name+'"', ui.response.getData().msg);
						success = false;
					}
					
					var msg;
					if (success) {
						msg = 'Envoi termin&eacute;.';
					} else {
						msg = 'Erreur lors de l\'envoi.';
					}
					$.w.nautilus.progresses.update(uploadsIds[ui.index], 100, msg);
					
					if (success) {
						var newFile = new W.File(response.getData().file);
						var newItem = that._renderItem(newFile);
						if (that.location() == newFile.get('dirname')) {
							that._insertItem(newItem);
						}
						
						$.w.notification({
							title: 'Fichier envoy&eacute;',
							message: 'Le fichier '+newFile.get('basename')+' a &eacute;t&eacute; envoy&eacute;.',
							icon: that._getFileIcon(newFile),
							widgets: [$.w.button('Ouvrir le dossier parent').click(function() { W.Cmd.execute('nautilus "'+newFile.get('dirname')+'"'); }),
							          $.w.button('Ouvrir').click(function() { newItem.data('nautilus').open(); })]
						});
					}
				},
				progressupdated: function(event, ui) {
					$.w.nautilus.progresses.update(uploadsIds[ui.index], ui.progress);
				},
				speedupdated: function(event, ui) {
					$.w.nautilus.progresses.update(uploadsIds[ui.index], undefined, 'Envoi &agrave; '+ui.speed+' Kio/s...');
				}
			});
			
			//BUG : appel du droppable meme si des elements (comme des fenetres) sont au-dessus
			/*that.element.droppable({
				accept: '*',
				scope: 'webos',
				drop: function(event, ui) {
					if (typeof ui.draggable.data('file') == 'undefined') {
						return;
					}
					if (ui.draggable.parent().is(that.element)) {
						return;
					}
					
					W.File.load(dir, new W.Callback(function(file) {
						if (file.get('path') == ui.draggable.data('file')().getAttribute('dirname')) {
							return;
						}
						
						ui.draggable.data('file')().move(file, new W.Callback(function() {		
							ui.draggable.remove();
							that.reload();
						}));
					}));
					return false;
				}
			});*/
			
			that._render(files);
			
			that._trigger('readcomplete', {}, { location: that.location() });
			that._trigger('readsuccess', {}, { location: that.location() });
			
			userCallback.success(that);
		}, function(response) {
			var files = [];
			
			for (var path in that.options._files) {
				var file = that.options._files[path];
				files.push(file);
			}
			
			that._render(files);
			
			that._trigger('readcomplete', {}, { location: that.location() });
			that._trigger('readerror', {}, { location: that.location() });
			
			userCallback.error(response);
		});
		
		this._trigger('readstart', {}, { location: dir });
		
		W.File.listDir(dir, callback);
	},
	_render: function(files) {
		var that = this;
		
		this.options._files = {};
		
		if (this.options.display == 'icons') {
			this.content().empty();
		}
		if (this.options.display == 'list') {
			this.content().list('content').empty();
		}
		
		for (var i = 0; i < files.length; i++) {
			(function(file) {
				var item = that._renderItem(file);
				that._insertItem(item);
			})(files[i]);
		}
		
		this.element.scrollPane('reload');
		
		var createFileCallbackId = Webos.File.bind('create', function(data) {
			var newFile = data.file;
			
			if (newFile.get('dirname') != that.location()) {
				return;
			}
			
			that.options._files[newFile.get('path')] = newFile;
			var newItem = that._renderItem(newFile);
			that._insertItem(newItem);
			that.element.scrollPane('reload');
		});
		var umountCallbackId = Webos.File.bind('umount', function(data) {
			if (that.location().indexOf(data.local) != 0) {
				return;
			}
			
			that.readDir('~');
		});
		this.element.one('nautilusreadstart', function() {
			Webos.File.unbind(createFileCallbackId);
			Webos.File.unbind(umountCallbackId);
		});
	},
	_renderItem: function(file) {
		this.options._files[file.get('path')] = file;
		
		var that = this, filepath = file.get('path'), item, icon, iconPath = this._getFileIcon(file);
		
		if (that.options.display == 'icons') {
			item = $('<li></li>');
			
			icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon');
			icon.appendTo(item);
			
			item.append('<br />');
			
			$('<span></span>').addClass('filename').text(file.get('basename')).appendTo(item);
		} else if (that.options.display == 'list') {
			item = $.w.listItem();
			
			var content = $('<span></span>');
			item.listItem('addColumn', content);
			
			icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon').appendTo(content);
			
			$('<span></span>').addClass('filename').text(file.get('basename')).appendTo(content);
			
			var size;
			if (file.get('is_dir')) {
				size = file.get('size')+' &eacute;l&eacute;ment'+((file.get('size') > 1) ? 's' : '');
			} else {
				size = W.File.bytesToSize(file.get('size'));
			}
			item.listItem('addColumn', size);
			
			var type;
			if (file.get('is_dir')) {
				type = 'Dossier';
			} else {
				type = 'Fichier '+file.get('extension');
			}
			item.listItem('addColumn', type);
		} else {
			return;
		}
		
		item.data('file', function() {
			return that.options._files[filepath];
		});
		item.data('nautilus', {
			open: function() {
				var file = item.data('file')();
				that._openFile(file);
				item.trigger('open');
			},
			openWith: function() {
				var file = item.data('file')();
				that.openFileWindow(file);
				item.trigger('open');
			},
			download: function() {
				that._download(item.data('file')());
				item.trigger('download');
			},
			rename: function() {
				var file = item.data('file')();
				
				var renameFn = function() {
					var name = input.val();
					input.remove();
					item.find('.filename').show();
					
					if (name == file.get('basename')) { return; }
					
					file.rename(name);
				};
				
				var onDocClickFn = function(event) {
					if (!input.parents().filter(event.target).length == 0) {
						$(document).unbind('click', onDocClickFn);
						renameFn();
					}
				};
				
				setTimeout(function() { // Delay for Mozilla
					$(document).click(onDocClickFn);
				}, 0);
				
				var input = $('<input />', { type: 'text' }).keydown(function(e) {
					if (e.keyCode == 13) {
						$(document).unbind('click', onDocClickFn);
						renameFn();
						e.preventDefault();
					}
				});
				item.find('.filename').hide().after(input);
				input.val(file.get('basename')).focus().setCursorPosition(0, file.get('basename').length);
			},
			remove: function() {
				item.data('file')().remove();
			},
			openProperties: function() {
				that._openProperties(item.data('file')());
			}
		});
		
		item.dblclick(function() {
			$(this).data('nautilus').open();
		});
		
		var contextmenu = $.w.contextMenu(item);
		
		$.webos.menuItem('Ouvrir').click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').open();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem('Ouvrir avec...').click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').openWith();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem('T&eacute;l&eacute;charger').click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').download();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem('Renommer...', true).click(function() {
			item.data('nautilus').rename();
		}).appendTo(contextmenu);
		$.webos.menuItem('Supprimer').click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').remove();
			});
		}).appendTo(contextmenu);
		$.webos.menuItem('Propri&eacute;t&eacute;s', true).click(function() {
			var files = (that.getSelection().length == 0) ? item : that.getSelection();
			files.each(function() {
				$(this).data('nautilus').openProperties();
			});
		}).appendTo(contextmenu);
		
		contextmenu.bind('contextmenuopen', function() {
			if (!item.is('.active')) {
				that.getSelection().removeClass('active').trigger('unselect');
				item.addClass('active');
			}
		});
		
		if (file.get('is_dir')) {
			var overIcon = that._getFileIcon(file, 'dropover');
			item.droppable({
				accept: '*',
				scope: 'webos',
				hoverClass: 'ui-droppable-hover',
				drop: function(event, ui) {
					if (overIcon != iconPath) {
						icon.attr('src', iconPath);
					}
					
					if (typeof ui.draggable.data('file') == 'undefined') {
						return;
					}
					
					ui.draggable.data('file')().move(item.data('file')(), new W.Callback(function() {
						ui.draggable.remove();
					}));
					return false;
				},
				over: function() {
					if (overIcon != iconPath) {
						icon.attr('src', overIcon);
					}
				},
				out: function() {
					if (overIcon != iconPath) {
						icon.attr('src', iconPath);
					}
				}
			});
		}
		
		item.draggable({
			stack: '#'+that.element.attr('id')+' li',
			distance: 3,
			scope: 'webos',
			revert: 'invalid',
			helper: 'clone',
			scroll: false,
			zIndex: false,
			stop: function(event, ui) {
				$(this).css('z-index','0');
			}
		});
		
		if (/^\./.test(file.get('basename'))) { //C'est un fichier cache, on ne l'affiche pas
			item.addClass('hidden');
			if (!this.options.showHiddenFiles) {
				item.hide();
			}
		}
		
		var updateCallbackId = file.bind('update', function(data) {
			if (filepath != file.get('path')) {
				delete that.options._files[filepath];
				filepath = file.get('path');
			}
			that.options._files[filepath] = file;
			
			var newItem = that._renderItem(file);
			item.replaceWith(newItem);
			item = newItem;
		});
		var removeCallbackId = file.bind('remove', function() {
			item.remove();
		});
		
		this.element.one('nautilusreadcomplete', function() {
			file.unbind('update', updateCallbackId);
			file.unbind('remove', removeCallbackId);
		});
		
		return item;
	},
	_insertItem: function(item) {
		if (this.options.display == 'icons') {
			this.content().append(item);
		}
		if (this.options.display == 'list') {
			this.content().list('content').append(item);
		}
	},
	_openProperties: function(file) {
		var propertiesWindow = $.w.window({
			title: 'Propri&eacute;t&eacute;s de '+file.get('basename'),
			icon: this._getFileIcon(file),
			resizable: false,
			stylesheet: 'usr/share/css/nautilus/properties.css'
		});
		
		var mtime = new Date(file.get('mtime') * 1000);
		var mtimeDate = parseInt(mtime.getDate());
		if (mtimeDate < 10) mtimeDate = '0'+mtimeDate;
		var mtimeMonth = (parseInt(mtime.getMonth()) + 1);
		if (mtimeMonth < 10) mtimeMonth = '0'+mtimeMonth;
		var mtimeYear = mtime.getFullYear();
		var mtimeHours = parseInt(mtime.getHours());
		if (mtimeHours < 10) mtimeHours = '0'+mtimeHours;
		var mtimeMinutes = parseInt(mtime.getMinutes());
		if (mtimeMinutes < 10) mtimeMinutes = '0'+mtimeMinutes;
		var atime = new Date(file.get('atime') * 1000);
		var atimeDate = parseInt(atime.getDate());
		if (atimeDate < 10) atimeDate = '0'+atimeDate;
		var atimeMonth = (parseInt(atime.getMonth()) + 1);
		if (atimeMonth < 10) atimeMonth = '0'+atimeMonth;
		var atimeYear = atime.getFullYear();
		var atimeHours = parseInt(atime.getHours());
		if (atimeHours < 10) atimeHours = '0'+atimeHours;
		var atimeMinutes = parseInt(atime.getMinutes());
		if (atimeMinutes < 10) atimeMinutes = '0'+atimeMinutes;
		var data = ['Nom : '+file.get('basename'),
		            'Type : '+((file.get('is_dir')) ? 'dossier' : 'fichier '+file.get('extension')),
		            'Emplacement : '+file.get('dirname'),
		            'Derni&egrave;re modification : '+mtimeDate+'/'+mtimeMonth+'/'+mtimeYear+' '+mtimeHours+':'+mtimeMinutes,
		            'Dernier acc&egrave;s : '+atimeDate+'/'+atimeMonth+'/'+atimeYear+' '+atimeHours+':'+atimeMinutes,
		            ((file.get('is_dir')) ? 'Contenu' : 'Taille')+' : '+((file.get('is_dir')) ? file.get('size')+' fichier'+((file.get('size') > 1) ? 's' : '') : W.File.bytesToSize(file.get('size')))];
		propertiesWindow.window('content').append('<img src="'+this._getFileIcon(file)+'" alt="" class="image"/><ul><li>'+data.join('</li><li>')+'</li></ul>');
		var buttons = $.w.buttonContainer().appendTo(propertiesWindow.window('content'));
		$.w.button('Fermer').appendTo(buttons).click(function() {
			propertiesWindow.window('close');
		});
		
		propertiesWindow.window('open');
	},
	_download: function(file) {
		var serverCall = new W.ServerCall({
			'class': 'FileController',
			method: 'download',
			arguments: {
				file: file.get('path')
			}
		});
		var form = $('<form></form>')
			.attr('action', serverCall.url)
			.attr('method', serverCall.type)
			.attr('target', '_blank')
			.appendTo('body');
		for (var key in serverCall.data) {
			form.append($('<input />', { type: 'hidden', name: key, value: serverCall.data[key] }));
		}
		
		form.submit().remove();
	},
	openUploadWindow: function() {
		var that = this;
		
		if (typeof this.options._components.uploadWindow != 'undefined') {
			this.options._components.uploadWindow.window('hideOrShowOrToForeground');
			return;
		}
		
		var uploadWindow = this.options._components.uploadWindow = $.w.window({
			title: 'Envoi de fichiers vers '+that.location(),
			width: 370,
			resizable: false,
			stylesheet: 'usr/share/css/nautilus/upload.css',
			icon: new W.Icon('actions/document-save', 24)
		});
		
		uploadWindow.bind('windowclose', function() {
			delete that.options._components.uploadWindow;
		});
		
		var content = uploadWindow.window('content');
		
		$('<img />', { src: new W.Icon('actions/document-save') }).addClass('upload-icon').appendTo(content);
		$.w.label('Glissez-d&eacute;posez un fichier depuis votre ordinateur ou s&eacute;lectionnez un fichier &agrave; envoyer :').appendTo(content);
		
		var uploadButton = $.w.button('Envoyer un fichier').appendTo(content);
		
		var serverCall = new W.ServerCall({
			'class': 'FileController',
			method: 'upload',
			arguments: {
				dest: that.options.directory
			}
		});
		var uploadsIds = {};
		new qq.FileUploaderBasic({
			action: serverCall.url,
			params: serverCall.data,
			button: uploadButton[0],
			onSubmit: function(id, fileName){
				uploadsIds[id] = $.w.nautilus.progresses.add(0, 'Envoi de '+fileName);
			},
			onProgress: function(id, fileName, loaded, total){
				$.w.nautilus.progresses.update(uploadsIds[id], Math.round(loaded / total * 100));
			},
			onComplete: function(id, fileName, responseJSON){
				var response = new W.ServerCall.Response(responseJSON);
				var success = true;
				if (!response.isSuccess()) {
					W.Error.trigger('Impossible d\'envoyer le fichier "'+fileName+'"', response.getAllChannels());
					success = false;
				} else if (!response.getData().success) {
					W.Error.trigger('Impossible d\'envoyer le fichier "'+fileName+'"', response.getData().msg);
					success = false;
				}
				
				var msg;
				if (success) {
					msg = 'Envoi termin&eacute;.';
				} else {
					msg = 'Erreur lors de l\'envoi.';
				}
				$.w.nautilus.progresses.update(uploadsIds[id], 100, msg);
				
				if (success) {
					var newFile = new W.File(response.getData().file);
					var newItem = that._renderItem(newFile);
					if (that.location() == newFile.get('dirname')) {
						that._insertItem(newItem);
					}
					
					$.w.notification({
						title: 'Fichier envoy&eacute;',
						message: 'Le fichier '+newFile.get('basename')+' a &eacute;t&eacute; envoy&eacute;.',
						icon: that._getFileIcon(newFile),
						widgets: [$.w.button('Ouvrir le dossier parent').click(function() { W.Cmd.execute('nautilus "'+newFile.get('dirname')+'"'); }),
						          $.w.button('Ouvrir').click(function() { newItem.data('nautilus').open(); })]
					});
				}
			},
			onCancel: function(id, fileName){
				$.w.nautilus.progresses.update(uploadsIds[id], 100, 'Envoi annul&eacute;.');
			},
			// messages                
			messages: {
				typeError: "Le type du fichier <em>{file}</em> est incorrect. Seules les extensions {extensions} sont autoris&eacute;es.",
				sizeError: "Le fichier <em>{file}</em> est trop gros, la taille maximum est {sizeLimit}.",
				minSizeError: "Le fichier <em>{file}</em> est trop petit, la taille minimum est {minSizeLimit}.",
				emptyError: "Le fichier <em>{file}</em> est vide, veuillez r&eacute;essayer.",
				onLeave: "Des fichiers sont en cours de transfert, si vous quittez la page maintenant ils seront annul&eacute;s."            
			},
			showMessage: function(message){
				W.Error.trigger(message);
			}
        });
		
		var buttonContainer = $.w.buttonContainer().appendTo(content);
		
		$.w.button('Fermer').click(function() {
			uploadWindow.window('close');
		}).appendTo(buttonContainer);
		
		uploadWindow.window('open');
	},
	refresh: function(callback) {
		this.readDir(this.options.directory, callback);
	},
	location: function() {
		return this.options.directory;
	},
	_getFileIcon: function(file, state) {
		var iconName = 'mimes/unknown';
		
		var exts = ['png', 'gif', 'jpeg', 'jpg', 'bmp', 'ico', 'js', 'mp3', 'ogv', 'tiff', 'php', 'ogg', 'mp4', 'html', 'zip', 'txt'];
		for(var i = 0; i < exts.length; i++) {
			if (exts[i] == file.get('extension')) {
				iconName = 'mimes/'+file.get('extension');
				break;
			}
		}
		
		if (file.get('is_dir')) {
			iconName = 'mimes/folder';
			
			if (state == 'dropover') {
				iconName = 'mimes/folder-open';
			}
			
			var mountedDevices = Webos.File.mountedDevices();
			if (mountedDevices[file.get('path')]) {
				var mountData = Webos.File.getMountData(file.get('path'));
				var driverData = Webos.File.getDriverData(mountData.get('driver'));
				iconName = driverData.icon;
			}
		}
		
		switch (file.get('path')) {
			case '~':
				iconName = 'places/folder-home';
				break;
			case '~/Documents':
				iconName = 'places/folder-documents';
				break;
			case '~/Bureau':
				iconName = 'places/folder-desktop';
				break;
			case '~/Images':
				iconName = 'places/folder-pictures';
				break;
			case '~/Musique':
				iconName = 'places/folder-music';
				break;
			case '~/Vidéos':
				iconName = 'places/folder-videos';
				break;
			case '~/Téléchargements':
				iconName = 'places/folder-downloads';
				break;
		}
		
		var size = 22;
		if (this.options.display == 'icons') {
			size = 48;
		} else if (this.options.display == 'list') {
			size = 22;
		}
		
		return new W.Icon(iconName, size);
	},
	_openFile: function(file) {
		if (file.get('is_dir')) {
			if (this.options.multipleWindows) {
				W.Cmd.execute('nautilus "'+file.get('path')+'"');
			} else {
				this.readDir(file.get('path'));
			}
		} else {
			var that = this;
			
			var runOpenerFn = function() {
				Webos.Application.listOpeners(file.get('extension'), function(openers) {
					if (openers.length > 0) {
						W.Cmd.execute(openers[0].get('command')+' "'+file.get('path')+'"');
					} else {
						that.openFileWindow(file);
					}
				});
			};
			
			if (file.get('extension') == 'js') {
				var exeWindow = $.w.window.dialog({
					title: 'Ouverture de fichier',
					icon: this._getFileIcon(file),
					resizable: false,
					hideable: false,
					width: 550
				});
				
				var form = $.w.entryContainer().appendTo(exeWindow.window('content'));
				
				$.w.image(new W.Icon('actions/help')).css('float', 'left').appendTo(form);
				$('<strong></strong>').html('Voulez-vous lancer « '+file.get('basename')+' » ou afficher son contenu ?').appendTo(form);
				form.after('<p>« '+file.get('basename')+' » est un fichier texte exécutable.</p>');
				
				var buttonContainer = $.w.buttonContainer().css('clear', 'both').appendTo(form);
				$.w.button('Lancer dans un terminal').click(function() {
					exeWindow.window('close');
					W.Cmd.execute('gnome-terminal "'+file.get('path')+'"');
				}).appendTo(buttonContainer);
				$.w.button('Afficher').click(function() {
					exeWindow.window('close');
					runOpenerFn();
				}).appendTo(buttonContainer);
				$.w.button('Annuler').click(function() {
					exeWindow.window('close');
				}).appendTo(buttonContainer);
				$.w.button('Lancer', true).appendTo(buttonContainer);
				
				form.submit(function() {
					exeWindow.window('close');
					W.Cmd.execute('"'+file.get('path')+'"');
				});
				
				exeWindow.window('open');
			} else {
				runOpenerFn();
			}
		}
	},
	openFileWindow: function(file) {
		var that = this;
		
		var openFileWindowFn = function(apps) {
			var fileOpenerWindow = $.w.window.dialog({
				title: 'Ouverture de '+file.get('basename'),
				icon: that._getFileIcon(file),
				width: 400,
				resizable: false
			});
			
			var chosenCmd = '';
			
			var content = $.w.entryContainer().submit(function() {
				if (!chosenCmd) {
					return;
				}
				
				fileOpenerWindow.window('close');
				W.Cmd.execute(chosenCmd+' "'+file.get('path')+'"');
			}).appendTo(fileOpenerWindow.window('content'));
			
			content.append('<strong>Choisissez une application pour ouvrir '+file.get('basename')+'</strong>');
			
			var list = $.w.list().appendTo(content);
			
			for (var i = 0; i < apps.length; i++) {
				(function(app) {
					$.w.listItem([app.get('title')]).appendTo(list.list('content')).bind('listitemselect', function() {
						chosenCmd = app.get('command');
					}).bind('listitemunselect', function() {
						chosenCmd = '';
					});
				})(apps[i]);
			}
			
			var buttonContainer = $.w.buttonContainer().appendTo(content);
			$.w.button('Annuler').click(function() {
				fileOpenerWindow.window('close');
			}).appendTo(buttonContainer);
			$.w.button('S&eacute;lectionner', true).appendTo(buttonContainer);
			
			fileOpenerWindow.window('open');
		};
		
		Webos.Application.listOpeners(file.get('extension'), function(openers) {
			if (openers.length > 0) {
				openFileWindowFn(openers);
			} else {
				Webos.Application.list(function(apps) {
					var openers = [];
					
					for (var key in apps) {
						if (apps[key].get('open').length == 0) {
							continue;
						}
						
						openers.push(apps[key]);
					}
					
					openFileWindowFn(openers);
				});
			}
		});
	},
	createFile: function(name, is_dir) {
		var originalName = name, exists = false, i = 2, ext = null, filename = name;
		
		if (!is_dir) {
			var nameArray = name.split('.');
			ext = (nameArray.length > 1) ? nameArray.pop() : null;
			filename = nameArray.join('.');
		}
		
		do {
			for (var path in this.options._files) {
				var file = this.options._files[path];
				if (file.get('basename') == name) {
					exists = true;
					if (is_dir && ext) {
						name = filename+' ('+i+').'+ext;
					} else {
						name = originalName+' ('+i+')';
					}
					i++;
				} else {
					exists = false;
				}
			}
		} while (exists);
		
		var path = this.options.directory+'/'+name;
		
		if (is_dir) {
			W.File.createFolder(path);
		} else {
			W.File.createFile(path);
		}
	},
	getSelection: function() {
		return this.items().filter('.active');
	},
	getFilesSelection: function() {
		var selection = this.getSelection();
		var selectedFiles = [];
		selection.each(function() {
			selectedFiles.push($(this).data('file')());
		});
		return selectedFiles;
	}
});
$.webos.widget('nautilus', nautilusProperties);

$.webos.nautilus = function(options) {
	return $('<div></div>').nautilus(options);
};

$.w.nautilus.progresses = []; //Liste contenant les operations en cours
$.w.nautilus.progresses.add = function(value, action, details) { //Ajouter une operation en cours
	var id = $.w.nautilus.progresses.push({ //On ajoute les informations
		action: action,
		value: value,
		details: (details) ? details : ''
	}) - 1;
	$.w.nautilus.progresses.update(id); //On met a jour l'operation
	return id; //On retourmne l'id de l'operation
};
$.w.nautilus.progresses.defineWindow = function() {
	$.w.nautilus.progresses.window = $.w.window.dialog({ //Fenetre de progression des operations sur les fichiers
		title: 'Op&eacute;rations sur les fichiers',
		width: 300,
		resizable: false
	});
};
$.w.nautilus.progresses.update = function(id, value, details) { //Mettre a jour une operation en cours
	if (typeof $.w.nautilus.progresses[id] == 'undefined') { //Si l'operation n'existe pas
		return;
	}
	
	if (typeof $.w.nautilus.progresses.window == 'undefined') {
		$.w.nautilus.progresses.defineWindow();
	}
	
	if (typeof value != 'undefined') {
		$.w.nautilus.progresses[id].value = value; //On met a jour la valeur si elle est specifiee
	} else {
		value = $.w.nautilus.progresses[id].value;
	}
	
	if (typeof $.w.nautilus.progresses[id]._components == 'undefined') { //Si l'item dans la fenetre n'existe pas, on le cree
		$.w.nautilus.progresses[id]._components = {};
		var element = $.w.nautilus.progresses[id]._components.element = $.w.label().appendTo($.w.nautilus.progresses.window.window('content'));
		$.w.label($.w.nautilus.progresses[id].action).css('font-weight', 'bold').appendTo(element);
		$.w.nautilus.progresses[id]._components.details = $.w.label($.w.nautilus.progresses[id].details).css('font-size', 'small').appendTo(element);
		$.w.nautilus.progresses[id]._components.progressbar = $.w.progressbar(value).appendTo(element);
	} else { //Sinon, on le met a jour
		if ($.w.nautilus.progresses[id]._components.progressbar.progressbar('value') != value) {
			$.w.nautilus.progresses[id]._components.progressbar.progressbar('value', value);
		}
		if ($.w.nautilus.progresses[id]._components.details.html() != details && typeof details != 'undefined') {
			$.w.nautilus.progresses[id]._components.details.html(details);
		}
	}
	
	// Si la valeur est egale a cent, c'est que l'operation est terminee, on la retire
	if ($.w.nautilus.progresses[id]._components.progressbar.progressbar('value') == 100) {
		$.w.nautilus.progresses[id]._components.element.empty().remove();
		delete $.w.nautilus.progresses[id];
	}
	
	var countNbrProgressesFn = function() {
		//On compte le nombre d'operations restantes
		var nbrProgresses = 0;
		for (var i = 0; i < $.w.nautilus.progresses.length; i++) {
			if (typeof $.w.nautilus.progresses[i] == 'undefined') {
				continue;
			}
			nbrProgresses++;
		}
		return nbrProgresses;
	};
	
	var nbrProgresses = countNbrProgressesFn();
	
	//Si la fenetre n'est pas affichee et que plus d'une operation sont en cours
	if (nbrProgresses > 0 && !$.w.nautilus.progresses.window.closest('html').length && typeof $.w.nautilus.progresses.windowOpenTimeout == 'undefined') {
		$.w.nautilus.progresses.windowOpenTimeout = setTimeout(function() { //On affiche la fenetre au bout de deux secondes, si les operations ne se sont pas terminees avant
			if (countNbrProgressesFn() > 0 && !$.w.nautilus.progresses.window.closest('html').length) {
				$.w.nautilus.progresses.window.window('open');
			}
			delete $.w.nautilus.progresses.windowOpenTimeout;
		}, 000);
	}
	//Si il n'y a aucune operation en cours et que la fenetre est ouverte, on la ferme
	if (nbrProgresses == 0 && $.w.nautilus.progresses.window.window('is', 'opened')) {
		$.w.nautilus.progresses.window.window('close');
	}
};

var nautilusFileSelectorProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusfileselector',
	options: {
		selectDirs: false,
		selectMultiple: false,
		exists: true,
		extensions: null
	},
	_create: function() {
		var that = this;
		
		var form = $.w.entryContainer().submit(function() {
			that._select();
		}).appendTo(this.element);
		
		this.options._components.nautilus = $.w.nautilus({
			display: 'list'
		}).appendTo(form);
		
		if (!this.options.exists) {
			this.options._components.filename = $.w.textEntry('Nom du fichier :').prependTo(form);
			this.options._components.nautilus.bind('select', function(e) {
				that.options._components.filename.textEntry('content').val($(e.target).data('file')().getAttribute('basename'));
			});
			this.options._components.nautilus.bind('nautilusreadstart', function() {
				that.options._components.filename.textEntry('content').val('');
			});
		}
		
		this.options._components.nautilus.bind('nautilusreadcomplete', function() {
			$(this).nautilus('items').unbind('dblclick');
			$(this).nautilus('items').dblclick(function() {
				if ($(this).data('file')().getAttribute('is_dir')) {
					that.options._components.nautilus.nautilus('readDir', $(this).data('file')().getAttribute('path'));
				} else {
					that._select();
					return false;
				}
			});
			if (that.options.selectMultiple) {
				$(this).nautilus('items').click(function() {
					$(this).toggleClass('active');
				});
			}
		});
		
		this.options._components.buttons = {};
		var buttonContainer = $.w.buttonContainer().appendTo(form);
		this.options._components.buttons.cancel = $.w.button('Annuler').click(function() {
			that._trigger('cancel');
		}).appendTo(buttonContainer);
		this.options._components.buttons.submit = $.w.button('Ouvrir', true).appendTo(buttonContainer);
	},
	_select: function() {
		var that = this;
		
		if (!this.options.exists) {
			var filename = that.options._components.filename.textEntry('content').val();
			this.options._components.nautilus.nautilus('items').each(function() {
				if ($(this).data('file')().getAttribute('basename') == filename) {
					$(this).addClass('active');
				}
			});
		}
		
		var selection = this.options._components.nautilus.nautilus('getFilesSelection');
		
		if (!this.options.selectDirs) {
			for (var i = 0; i < selection.length; i++) {
				var file = selection[i];
				if (file.get('is_dir')) {
					that.options._components.nautilus.nautilus('readDir', file.get('path'));
					return;
				}
			}
		}
		if (!this.options.selectMultiple) {
			selection = selection[0];
		}
		if (!this.options.exists) {
			var filename = that.options._components.filename.textEntry('content').val();
			if (!filename) {
				filename = 'file';
			}
			selection = that.options._components.nautilus.nautilus('location')+'/'+filename;
		}
		if (typeof selection == 'undefined' || selection.length == 0) {
			return;
		}
		if (this.options.extensions && this.options.extensions.length > 0) {
			var checkExtsFn = function(file) {
				for (var i = 0; i < that.options.extensions.length; i++) {
					if (that.options.extensions[i] == file.get('extension')) {
						return true;
					}
				}
				
				return false;
			};
			
			if (this.options.selectMultiple) {
				for (var i = 0; i < selection.length; i++) {
					if (!checkExtsFn(selection[i])) {
						return;
					}
				}
			} else {
				if (!checkExtsFn(selection)) {
					return;
				}
			}
		}
		this._trigger('select', null, { selection: selection, parentDir: that.options._components.nautilus.nautilus('location') });
	},
	nautilus: function() {
		return this.options._components.nautilus;
	}
});
$.widget('webos.nautilusFileSelector', nautilusFileSelectorProperties);

$.webos.nautilusFileSelector = function(options) {
	return $('<div></div>').nautilusFileSelector(options);
};

var nautilusFileEntryProperties = $.webos.extend($.webos.properties.get('entry'), {
	_name: 'nautilusfileentry',
	options: {
		fileSelector: {}
	},
	_create: function() {
		var that = this;
		
		this.options._content = $('<input />', { type: 'text' }).appendTo(this.element);
		this.options._components.browseButton = $.w.button('Choisir').click(function() {
			new NautilusFileSelectorWindow(that.options.fileSelector, function(path) {
				if (path) {
					that.value(path);
				}
			});
		}).appendTo(this.element);
		
		this.value(this.options.value);
	}
});
$.widget('webos.nautilusFileEntry', nautilusFileEntryProperties);

$.webos.nautilusFileEntry = function(label, options) {
	return $('<div></div>').nautilusFileEntry($.extend({}, options, {
		label: label
	}));
};

var nautilusShortcutsProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusshortcuts',
	options: {
		open: function() {}
	},
	_create: function() {
		var that = this;
		
		var thisProcess = W.Process.current(), canReadUserFiles = true, canReadSystemFiles = true;
		if (thisProcess) {
			canReadUserFiles = thisProcess.getAuthorizations().can('file.user.read');
			canReadSystemFiles = thisProcess.getAuthorizations().can('file.system.read');
		}
		
		this.options._content = $.w.list(['Raccourcis']).appendTo(this.element);
		var listContent = this.options._content.list('content');
		
		if (canReadUserFiles) {
			$.w.listItem(['<img src="'+new W.Icon('places/folder-home', 22)+'" alt=""/> Dossier personnel']).bind('listitemselect', function() {
				that.options.open('~');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-desktop', 22)+'" alt=""/> Bureau']).bind('listitemselect', function() {
				that.options.open('~/Bureau');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-documents', 22)+'" alt=""/> Documents']).bind('listitemselect', function() {
				that.options.open('~/Documents');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-pictures', 22)+'" alt=""/> Images']).bind('listitemselect', function() {
				that.options.open('~/Images');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-music', 22)+'" alt=""/> Musique']).bind('listitemselect', function() {
				that.options.open('~/Musique');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-videos', 22)+'" alt=""/> Vidéos']).bind('listitemselect', function() {
				that.options.open('~/Vidéos');
			}).appendTo(listContent);
			
			$.w.listItem(['<img src="'+new W.Icon('places/folder-downloads', 22)+'" alt=""/> Téléchargements']).bind('listitemselect', function() {
				that.options.open('~/Téléchargements');
			}).appendTo(listContent);
		}
		
		if (canReadSystemFiles) {
			$.w.listItem(['<img src="'+new W.Icon('devices/harddisk', 22)+'" alt=""/> Syst&egrave;me de fichiers']).bind('listitemselect', function() {
				that.options.open('/');
			}).appendTo(listContent);
		}
		
		this._refreshDevices();
		
		this.options._mountCallback = Webos.File.bind('mount', function() {
			that._refreshDevices();
		});
		this.options._umountCallback = Webos.File.bind('umount', function() {
			that._refreshDevices();
		});
	},
	_refreshDevices: function() {
		var that = this;
		
		if (this.options._devices) {
			this.options._devices.remove();
		}
		
		var mountedDevices = Webos.File.mountedDevices();
		var devicesShortcuts = $.w.list(['Volumes']);
		var i = 0;
		
		for (var local in mountedDevices) {
			(function(local, point) {
				var driverData = Webos.File.getDriverData(point.get('driver'));
				var item = $.w.listItem(['<img src="'+new W.Icon(driverData.icon, 22)+'" alt=""/> ' + driverData.title + ' sur ' + local]).bind('listitemselect', function() {
					$(this).listItem('option', 'active', false);
				}).click(function(e) {
					if ($(e.target).is('.umount')) {
						if (Webos.File.umount(local) === false) {
							Webos.Error.trigger('Impossible de d&eacute;monter "'+driverData.title+'" sur "'+local+'"');
						}
						return;
					}
					
					that.options.open(local);
				});
				$('<img />', { src: new W.Icon('actions/umount', 16), alt: '', title: 'D&eacute;monter le volume' }).addClass('umount').prependTo(item.listItem('column', 0));
				
				item.appendTo(devicesShortcuts.list('content'));
			})(local, mountedDevices[local]);
			i++;
		}
		
		if (i > 0) {
			this.options._devices = devicesShortcuts.appendTo(this.element);
		}
	},
	destroy: function() {
		Webos.File.unbind(this.options._mountCallback);
		Webos.File.unbind(this.options._umountCallback);
	}
});
$.widget('webos.nautilusShortcuts', nautilusShortcutsProperties);

$.webos.nautilusShortcuts = function(fn) {
	return $('<div></div>').nautilusShortcuts({
		open: fn
	});
};