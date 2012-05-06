new W.ScriptFile('usr/lib/webos/file.js');
new W.Stylesheet('usr/share/css/nautilus/main.css');
new W.ScriptFile('usr/lib/jquery.filedrop.js');
new W.ScriptFile('usr/lib/fileuploader.js');

var nautilusProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilus',
	options: {
		directory: '~',
		multipleWindows: false,
		uploads: [],
		display: 'icons'
	},
	_create: function() {
		var that = this;
		
		if (this.options.display == 'icons') {
			this.options._content = $('<ul></ul>').addClass('icons').appendTo(this.element);
			
			that.content().mousedown(function(e) {
				if(e.button != 0) {
					return;
				}
				
				if (that.content().is(e.target)) {
					var diff = [0, 0];
					
					$(this).parents().each(function() {
						if ($(this).css('position') != 'absolute') {
							return;
						}
						var position = $(this).position();
						if (position.left != 0) {
							diff[0] += position.left;
						}
						if (position.top != 0) {
							diff[1] += position.top;
						}
					});
					
					var pos = [e.pageX - diff[0], e.pageY - diff[1]];
					
					var helper = $('<div></div>')
						.addClass('ui-selectable-helper')
						.css('top', pos[1])
						.css('left', pos[0])
						.css('width', 0)
						.css('height', 0)
						.css('position','absolute')
						.appendTo(that.content());
					
					var mouseMoveFn = function(e) {
						var x1 = pos[0], y1 = pos[1], x2 = e.pageX - diff[0], y2 = e.pageY - diff[1];
						if (x1 > x2) { var tmp = x2; x2 = x1; x1 = tmp; }
						if (y1 > y2) { var tmp = y2; y2 = y1; y1 = tmp; }
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
					};
					that.content().mousemove(mouseMoveFn);
					
					that.content().one('mouseup', function(e) {
						$(this).unbind('mousemove', mouseMoveFn);
						helper.fadeOut('fast', function() {
							$(this).remove();
						});
						e.preventDefault();
					});
				}
				
				e.preventDefault();
				
				if ($(this).is(e.target)) {
					that.items().filter('.active').removeClass('active');
					$(this).trigger('click');
				}
			});
		}

		if (this.options.display == 'list') {
			this.options._content = $.w.list(['Nom', 'Taille', 'Type']).appendTo(this.element);
		}

		this.content().click(function(event) {
			var item;
			if ($(event.target).is('li, tr')) {
				item = $(event.target);
			} else if ($(event.target).parents('li, tr').length > 0) {
				item = $(event.target).parents('li, tr').first();
			} else {
				that.items().filter('.active').removeClass('active').trigger('unselect');
				return;
			}
			if ($.webos.keyboard.ctrlDown()) {
				item.addClass('active').trigger('select');
			} else {
				that.items().filter('.active').trigger('unselect').removeClass('active');
				item.addClass('active').trigger('select');
			}
		});
		
		this.readDir(this.options.directory);
	},
	items: function() {
		if (this.options.display == 'icons') {
			return this.content().children('li');
		}
		if (this.options.display == 'list') {
			return this.content().list('content').children('tr');
		}
	},
	readDir: function(dir, userCallback) {
		if (typeof this.options._components.contextmenu != 'undefined') {
			this.options._components.contextmenu.contextMenu('destroy');
		}
		
		userCallback = W.Callback.toCallback(userCallback, new W.Callback(function() {}, function(response) {
			response.triggerError('Impossible de trouver « '+dir+' ».');
		}));
		
		var that = this;
		
		var callback = new W.Callback(function(files) {
			that.options.directory = dir;
			
			var contextmenu;
			
			that.options._components.contextmenu = contextmenu = $.w.contextMenu(that.element);
			
			$.webos.contextMenuItem('Cr&eacute;er un dossier').click(function() {
				that.createFile('Nouveau dossier', true);
			}).appendTo(contextmenu);
			$.webos.contextMenuItem('Cr&eacute;er un fichier').click(function() {
				that.createFile('Nouveau fichier');
			}).appendTo(contextmenu);
			$.webos.contextMenuItem('T&eacute;l&eacute;charger', true).click(function() {
				W.File.get(dir, new W.Callback(function(file) {
					that._download(file);
				}));
			}).appendTo(contextmenu);
			$.webos.contextMenuItem('Envoyer un fichier').click(function() {
				that.openUploadWindow();
			}).appendTo(contextmenu);
			$.webos.contextMenuItem('Rafra&icirc;chir', true).click(function() {
				that.refresh();
			}).appendTo(contextmenu);
			$.webos.contextMenuItem('Propri&eacute;t&eacute;s', true).click(function() {
				W.File.get(that.options.directory, new W.Callback(function(file) {
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
						var files = that.options._files;
						files.push(new W.File(ui.response.getData().file));
						that._render(files);
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
					
					W.File.get(dir, new W.Callback(function(file) {
						if (file.getAttribute('path') == ui.draggable.data('file')().getAttribute('dirname')) {
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
			that._trigger('readcomplete', {}, { location: that.location() });
			that._trigger('readerror', {}, { location: that.location() });
			
			userCallback.error(response);
		});
		
		this._trigger('readstart', {}, { location: dir });
		
		W.File.listDir(dir, callback);
	},
	_render: function(files) {
		var that = this;
		
		this.options._files = files;
		
		if (this.options.display == 'icons') {
			this.content().empty();
		}
		if (this.options.display == 'list') {
			this.content().list('content').empty();
		}
		
		for (var i = 0; i < files.length; i++) {
			(function(i, file) {
				var item;
				var icon;
				var iconPath = that._getFileIcon(file);
				if (that.options.display == 'icons') {
					item = $('<li></li>');
					
					icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon');
					icon.appendTo(item);
					
					item.append('<br />');
					
					$('<span></span>').addClass('filename').text(file.getAttribute('basename')).appendTo(item);
				} else if (that.options.display == 'list') {
					item = $.w.listItem();
					
					var content = $('<span></span>');
					item.listItem('addColumn', content);
					
					icon = $('<img />', { src: iconPath, alt: '' }).addClass('icon').appendTo(content);
					
					$('<span></span>').addClass('filename').text(file.getAttribute('basename')).appendTo(content);
					
					var size;
					if (file.getAttribute('is_dir')) {
						size = file.getAttribute('size')+' &eacute;l&eacute;ment'+((file.getAttribute('size') > 1) ? 's' : '');
					} else {
						size = W.File.bytesToSize(file.getAttribute('size'));
					}
					item.listItem('addColumn', size);
					
					var type;
					if (file.getAttribute('is_dir')) {
						type = 'Dossier';
					} else {
						type = 'Fichier '+file.getAttribute('extension');
					}
					item.listItem('addColumn', type);
				} else {
					return;
				}
				
				item.data('file', function() {
					return that.options._files[i];
				});
				item.data('nautilus', {
					open: function() {
						var file = item.data('file')();
						if (file.getAttribute('extension') == 'js') {
							var exeWindow = $.w.window.dialog({
								title: 'Ouverture de fichier',
								resizable: false,
								hideable: false,
								width: 550
							});
							
							var form = $.w.entryContainer().appendTo(exeWindow.window('content'));
							
							$.w.image(new SIcon('actions/help')).css('float', 'left').appendTo(form);
							$('<strong></strong>').html('Voulez-vous lancer « '+file.getAttribute('basename')+' » ou afficher son contenu ?').appendTo(form);
							form.after('<p>« '+file.getAttribute('basename')+' » est un fichier texte exécutable.</p>');
							
							var buttonContainer = $.w.buttonContainer().css('clear', 'both').appendTo(form);
							$.w.button('Lancer dans un terminal').click(function() {
								exeWindow.window('close');
								W.Cmd.execute('gnome-terminal "'+file.getAttribute('path')+'"');
							}).appendTo(buttonContainer);
							$.w.button('Afficher').click(function() {
								exeWindow.window('close');
								that._openFile(file);
							}).appendTo(buttonContainer);
							$.w.button('Annuler').click(function() {
								exeWindow.window('close');
							}).appendTo(buttonContainer);
							$.w.button('Lancer', true).appendTo(buttonContainer);
							
							form.submit(function() {
								exeWindow.window('close');
								W.Cmd.execute('"'+file.getAttribute('path')+'"');
							});
							
							exeWindow.window('open');
						} else {
							that._openFile(file);
						}
						item.trigger('open');
					},
					download: function() {
						that._download(item.data('file')());
						item.trigger('download');
					},
					rename: function() {
						that.renameFile(item, item.data('file')());
					},
					remove: function() {
						item.data('file')().remove(new W.Callback(function() {
							item.trigger('delete').remove();
						}));
					},
					openProperties: function() {
						that._openProperties(item.data('file')());
					}
				});
				
				item.dblclick(function() {
					$(this).data('nautilus').open();
				});
				
				var contextmenu = $.w.contextMenu(item);
				
				$.webos.contextMenuItem('Ouvrir').click(function() {
					var files = (that.getSelection().length == 0) ? item : that.getSelection();
					files.each(function() {
						$(this).data('nautilus').open();
					});
				}).appendTo(contextmenu);
				$.webos.contextMenuItem('T&eacute;l&eacute;charger').click(function() {
					var files = (that.getSelection().length == 0) ? item : that.getSelection();
					files.each(function() {
						$(this).data('nautilus').download();
					});
				}).appendTo(contextmenu);
				$.webos.contextMenuItem('Renommer...', true).click(function() {
					item.data('nautilus').rename();
				}).appendTo(contextmenu);
				$.webos.contextMenuItem('Supprimer').click(function() {
					var files = (that.getSelection().length == 0) ? item : that.getSelection();
					files.each(function() {
						$(this).data('nautilus').remove();
					});
				}).appendTo(contextmenu);
				$.webos.contextMenuItem('Propri&eacute;t&eacute;s', true).click(function() {
					var files = (that.getSelection().length == 0) ? item : that.getSelection();
					files.each(function() {
						$(this).data('nautilus').openProperties();
					});
				}).appendTo(contextmenu);
				
				if (file.getAttribute('is_dir')) {
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
				
				if (/^\./.test(file.getAttribute('basename'))) { //C'est un fichier cache, on ne l'affiche pas
					item.hide();
				}
				
				if (that.options.display == 'icons') {
					that.content().append(item);
				}
				if (that.options.display == 'list') {
					that.content().list('content').append(item);
				}
			})(i, files[i]);
		}
	},
	_download: function(file) {
		var serverCall = new W.ServerCall({
			'class': 'FileController',
			method: 'download',
			arguments: {
				file: file.getAttribute('path')
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
			width: 350,
			resizable: false,
			stylesheet: 'usr/share/css/nautilus/upload.css',
			icon: new SIcon('actions/save', 24)
		});
		
		uploadWindow.bind('windowclose', function() {
			delete that.options._components.uploadWindow;
		});
		
		var content = uploadWindow.window('content');
		
		$('<img />', { src: new SIcon('actions/save') }).addClass('upload-icon').appendTo(content);
		$.w.label('S&eacute;lectionnez un fichier &agrave; envoyer :').appendTo(content);
		
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
				uploadsIds[id] = that.options.uploads.length;
				that._uploadHasStarted(uploadsIds[id], fileName);
			},
			onProgress: function(id, fileName, loaded, total){
				that._uploadUpdateProgress(uploadsIds[id], fileName, Math.round(loaded / total * 100));
			},
			onComplete: function(id, fileName, responseJSON){
				that._uploadIsFinished(uploadsIds[id], fileName, 0, true);
			},
			onCancel: function(id, fileName){
				that._uploadIsFinished(uploadsIds[id], fileName, 0, false);
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
		var iconName = 'files/unknown';
		
		var exts = ['png', 'gif', 'jpeg', 'jpg', 'bmp', 'ico', 'js', 'mp3', 'ogv', 'tiff', 'php', 'ogg', 'mp4'];
		for(var i = 0; i < exts.length; i++) {
			if (exts[i] == file.getAttribute('extension')) {
				iconName = 'files/'+file.getAttribute('extension');
				break;
			}
		}
		
		if (file.getAttribute('is_dir')) {
			iconName = 'files/folder';
			
			if (state == 'dropover') {
				iconName = 'files/folder-open';
			}
		}
		
		switch (file.getAttribute('path')) {
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
		
		return new SIcon(iconName, size);
	},
	_openFile: function(file) {
		if (file.getAttribute('is_dir')) {
			if (this.options.multipleWindows) {
				W.Cmd.execute('nautilus "'+file.getAttribute('path')+'"');
			} else {
				this.readDir(file.getAttribute('path'));
			}
		} else {
			if (typeof this._applications == 'undefined') {
				var that = this;
				new W.ServerCall({
					'class': 'ApplicationShortcutController',
					method: 'getFilesOpeners',
					arguments: {}
				}).load(new W.Callback(function(response) {
					that._applications = response.getData();
					that._openFile(file);
				}));
			} else {
				if (typeof this._applications[file.getAttribute('extension')] != 'undefined') {
					W.Cmd.execute(this._applications[file.getAttribute('extension')]+' "'+file.getAttribute('path')+'"');
				} else {
					var fileOpenerWindow = $.w.window({
						title: 'Ouverture de '+file.getAttribute('basename'),
						width: 400,
						resizable: false
					});
					
					var chosenCmd = '';
					
					var content = $.w.entryContainer().submit(function() {
						fileOpenerWindow.window('close');
						W.Cmd.execute(chosenCmd+' "'+file.getAttribute('path')+'"');
					}).appendTo(fileOpenerWindow.window('content'));
					
					content.append('<strong>Choisissez une application pour ouvrir '+file.getAttribute('basename')+'</strong>');
					
					var list = $.w.list().appendTo(content);
					var cmds = {};
					
					for (var ext in this._applications) {
						if (typeof cmds[this._applications[ext]] == 'undefined') {
							cmds[this._applications[ext]] = [ext];
						} else {
							cmds[this._applications[ext]].push(ext);
						}
					}
					
					for (var cmd in cmds) {
						(function(cmd, ext) {
							$.w.listItem([cmd]).appendTo(list.list('content')).bind('listitemselect', function() {
								chosenCmd = cmd;
							}).bind('listitemunselect', function() {
								chosenCmd = undefined;
							});
						})(cmd, cmds[cmd]);
					}
					
					var buttonContainer = $.w.buttonContainer().appendTo(content);
					$.w.button('Annuler').click(function() {
						fileOpenerWindow.window('close');
					}).appendTo(buttonContainer);
					$.w.button('S&eacute;lectionner', true).appendTo(buttonContainer);
					
					fileOpenerWindow.window('open');
				}
			}
		}
	},
	_openProperties: function(file) {
		var propertiesWindow = $.w.window({
			title: 'Propri&eacute;t&eacute;s de '+file.getAttribute('basename'),
			icon: this._getFileIcon(file),
			resizable: false,
			stylesheet: 'usr/share/css/nautilus/properties.css'
		});
		
		var mtime = new Date(file.getAttribute('mtime') * 1000);
		var mtimeDate = parseInt(mtime.getDate());
		if (mtimeDate < 10) mtimeDate = '0'+mtimeDate;
		var mtimeMonth = (parseInt(mtime.getMonth()) + 1);
		if (mtimeMonth < 10) mtimeMonth = '0'+mtimeMonth;
		var mtimeYear = mtime.getFullYear();
		var mtimeHours = parseInt(mtime.getHours());
		if (mtimeHours < 10) mtimeHours = '0'+mtimeHours;
		var mtimeMinutes = parseInt(mtime.getMinutes());
		if (mtimeMinutes < 10) mtimeMinutes = '0'+mtimeMinutes;
		var atime = new Date(file.getAttribute('atime') * 1000);
		var atimeDate = parseInt(atime.getDate());
		if (atimeDate < 10) atimeDate = '0'+atimeDate;
		var atimeMonth = (parseInt(atime.getMonth()) + 1);
		if (atimeMonth < 10) atimeMonth = '0'+atimeMonth;
		var atimeYear = atime.getFullYear();
		var atimeHours = parseInt(atime.getHours());
		if (atimeHours < 10) atimeHours = '0'+atimeHours;
		var atimeMinutes = parseInt(atime.getMinutes());
		if (atimeMinutes < 10) atimeMinutes = '0'+atimeMinutes;
		var data = ['Nom : '+file.getAttribute('basename'),
		            'Type : '+((file.getAttribute('is_dir')) ? 'dossier' : 'fichier '+file.getAttribute('extension')),
		            'Emplacement : '+file.getAttribute('dirname'),
		            'Derni&egrave;re modification : '+mtimeDate+'/'+mtimeMonth+'/'+mtimeYear+' '+mtimeHours+':'+mtimeMinutes,
		            'Dernier acc&egrave;s : '+atimeDate+'/'+atimeMonth+'/'+atimeYear+' '+atimeHours+':'+atimeMinutes,
		            ((file.getAttribute('is_dir')) ? 'Contenu' : 'Taille')+' : '+((file.getAttribute('is_dir')) ? file.getAttribute('size')+' fichier'+((file.getAttribute('size') > 1) ? 's' : '') : W.File.bytesToSize(file.getAttribute('size')))];
		propertiesWindow.window('content').append('<img src="'+this._getFileIcon(file)+'" alt="" class="image"/><ul><li>'+data.join('</li><li>')+'</li></ul>');
		var buttons = $.w.buttonContainer().appendTo(propertiesWindow.window('content'));
		$.w.button('Fermer').appendTo(buttons).click(function() {
			propertiesWindow.window('close');
		});
		
		propertiesWindow.window('open');
	},
	createFile: function(name, is_dir) {
		var that = this;
		
		var callback = new W.Callback(function(file) {
			var refreshCallback = new W.Callback(function() {
				that.content().find('li').each(function() {
					if ($(this).children('.filename').text() == name) {
						that.renameFile($(this), file);
					}
				});
			});
			that.refresh(refreshCallback);
		});
		
		var path = this.options.directory+'/'+name;
		if (is_dir) {
			W.File.createFolder(path, callback);
		} else {
			W.File.createFile(path, callback);
		}
	},
	renameFile: function(item, file) {
		var that = this;
		
		var renameFn = function() {
			var name = input.val();
			input.remove();
			item.find('.filename').show();
			if (name == file.getAttribute('basename')) { return; }
			var oldname = file.getAttribute('basename');
			file.rename(name, new W.Callback(function() {
				item.find('.filename').text(name);
				for (var i = 0; i < that.options._files.length; i++) {
					if (that.options._files[i].getAttribute('basename') == oldname) {
						that.options._files[i] = file;
					}
				}
			}));
		};
		
		var onDocClickFn = function(event) {
			if (!$(event.target).is('ul.webos-nautilus li input')) {
				$('body').unbind('click', onDocClickFn);
				renameFn();
			}
		};
		
		setTimeout(function() { // Delay for Mozilla
			$(document).click(onDocClickFn);
		}, 0);
		
		var input = $('<input />', { type: 'text' }).keypress(function(e) {
			if (e.keyCode == 13) {
				$('body').unbind('click', onDocClickFn);
				renameFn();
				e.preventDefault();
			}
		});
		item.find('.filename').hide().after(input);
		input.val(file.getAttribute('basename')).focus();
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
	if ($.w.nautilus.progresses[id]._components.progressbar.progressbar('value') == 101) {
		$.w.nautilus.progresses[id]._components.element.remove();
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
	if (nbrProgresses == 0 && $.w.nautilus.progresses.window.closest('html').length) {
		$.w.nautilus.progresses.window.window('close');
	}
};

var nautilusFileSelectorProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusfileselector',
	options: {
		selectDirs: false,
		selectMultiple: false,
		exists: true
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
				if (file.getAttribute('is_dir')) {
					that.options._components.nautilus.nautilus('readDir', file.getAttribute('path'));
					return;
				}
			}
		}
		if (!this.options.selectMultiple) {
			selection = selection[0];
		}
		if (!this.options.exists) {
			selection = that.options._components.nautilus.nautilus('location')+'/'+that.options._components.filename.textEntry('content').val();
		}
		if (typeof selection == 'undefined' || selection.length == 0) {
			return;
		}
		that._trigger('select', null, { selection: selection });
	},
	nautilus: function() {
		return this.options._components.nautilus;
	}
});
$.widget('webos.nautilusFileSelector', nautilusFileSelectorProperties);

$.webos.nautilusFileSelector = function(options) {
	return $('<div></div>').nautilusFileSelector(options);
};


var nautilusShortcutsProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'nautilusshortcuts',
	options: {
		open: function() {}
	},
	_create: function() {
		var that = this;
		
		this.options._content = $.w.list(['Raccourcis']).appendTo(this.element);
		var listContent = this.options._content.list('content');
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-home', 22)+'" alt=""/> Dossier personnel']).bind('listitemselect', function() {
			that.options.open('~');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-desktop', 22)+'" alt=""/> Bureau']).bind('listitemselect', function() {
			that.options.open('~/Bureau');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-documents', 22)+'" alt=""/> Documents']).bind('listitemselect', function() {
			that.options.open('~/Documents');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-pictures', 22)+'" alt=""/> Images']).bind('listitemselect', function() {
			that.options.open('~/Images');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-music', 22)+'" alt=""/> Musique']).bind('listitemselect', function() {
			that.options.open('~/Musique');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-videos', 22)+'" alt=""/> Vidéos']).bind('listitemselect', function() {
			that.options.open('~/Vidéos');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('places/folder-downloads', 22)+'" alt=""/> Téléchargements']).bind('listitemselect', function() {
			that.options.open('~/Téléchargements');
		}).appendTo(listContent);
		
		$.w.listItem(['<img src="'+new SIcon('devices/harddisk', 22)+'" alt=""/> Syst&egrave;me de fichiers']).bind('listitemselect', function() {
			that.options.open('/');
		}).appendTo(listContent);
	}
});
$.widget('webos.nautilusShortcuts', nautilusShortcutsProperties);

$.webos.nautilusShortcuts = function(fn) {
	return $('<div></div>').nautilusShortcuts({
		open: fn
	});
};


function NautilusFileSelectorWindow(options, userCallback) {
	this._window = $.w.window.dialog({
		title: (typeof options.title != 'undefined') ? options.title : 'S&eacute;lection de fichiers',
		width: 550,
		icon: new SIcon('apps/filemanager'),
		resizable: false,
		hideable: false,
		parentWindow: options.parentWindow
	});
	
	var that = this;
	
	this._nautilus = $.w.nautilusFileSelector({
		select: function(event, data) {
			that._window.window('close');
			userCallback(data.selection);
		},
		cancel: function() {
			that._window.window('close');
			userCallback();
		},
		selectDirs: options.selectDirs,
		selectMultiple: options.selectMultiple,
		exists: options.exists
	});
	
	var nautilus = this._nautilus.nautilusFileSelector('nautilus');
	
	this._shortcuts = $.webos.nautilusShortcuts(function(path) {
		nautilus.nautilus('readDir', path);
	}).appendTo(this._window.window('content'));
	
	this._nautilus.appendTo(this._window.window('content'));
	
	this._window.bind('close', function() {
		userCallback();
	});
	
	this._refreshHeader = function(dir) {
		var headers = this._window.window('header');
		if (typeof this._toolbar != 'undefined') {
			this._toolbar.remove();
		}
		this._toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		var location = dir.replace(/\/$/, '').split('/');
		
		var createButtonFn = function createButtonFn(userDir, path) {
			var button = $.w.toolbarWindowHeaderItem(userDir);
			button.click(function() {
				nautilus.nautilus('readDir', path);
			});
			return button;
		};
		
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
		
		this._toolbar.find('li').last().addClass('active');
		
		headers.append(this._toolbar);
	};
	
	this._nautilus.bind('nautilusreadstart', function() {
		that._refreshHeader(nautilus.nautilus('location'));
	});
	
	this._refreshHeader(nautilus.nautilus('location'));
	
	this._window.window('open');
}

function NautilusWindow(dir, userCallback) {
	this.window = $.w.window({
		title: 'Gestionnaire de fichiers',
		width: 600,
		height: 400,
		icon: new SIcon('apps/filemanager'),
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
		
		var location = dir.replace(/\/$/, '').split('/');
		
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
		
		this._toolbar.find('li').last().addClass('active');
		
		headers.append(this._toolbar);
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
			version: '0.1',
			description: 'Nautilus permet d\'organiser vos fichiers et vos dossiers.',
			author: '$imon',
			icon: new SIcon('applications/nautilus')
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
	
	var fileItem = $.w.menuWindowHeaderItem('Fichier').appendTo(this._menu);
	fileItemContent = fileItem.menuWindowHeaderItem('content');
	
	$.w.menuWindowHeaderItem('Nouvelle fen&ecirc;tre')
		.click(function() {
			W.Cmd.execute('nautilus "'+that.nautilus.nautilus('location')+'"');
		})
		.appendTo(fileItemContent);
	
	$.w.menuWindowHeaderItem('Envoyer des fichiers')
		.click(function() {
			that.nautilus.nautilus('openUploadWindow');
		})
		.appendTo(fileItemContent);
	
	$.w.menuWindowHeaderItem('Cr&eacute;er un dossier')
		.click(function() {
			that.nautilus.nautilus('createFile', 'Nouveau dossier', true);
		})
		.appendTo(fileItemContent);
	
	$.w.menuWindowHeaderItem('Cr&eacute;er un fichier')
		.click(function() {
			that.nautilus.nautilus('createFile', 'Nouveau fichier');
		})
		.appendTo(fileItemContent);
	
	$.w.menuWindowHeaderItem('Fermer')
		.click(function() {
			that.window.window('close');
		})
		.appendTo(fileItemContent);
	
	var editItem = $.w.menuWindowHeaderItem('&Eacute;dition').appendTo(this._menu);
	editItemContent = editItem.menuWindowHeaderItem('content');
	
	$.w.menuWindowHeaderItem('Tout s&eacute;lectionner')
		.click(function() {
			that.nautilus.nautilus('items').addClass('active');
		})
		.appendTo(editItemContent);
	
	$.w.menuWindowHeaderItem('S&eacute;lectionner...')
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
	
	$.w.menuWindowHeaderItem('Inverser')
		.click(function() {
			that.nautilus.nautilus('items').toggleClass('active');
		})
		.appendTo(editItemContent);
	
	var viewItem = $.w.menuWindowHeaderItem('Affichage').appendTo(this._menu);
	viewItemContent = viewItem.menuWindowHeaderItem('content');
	
	$.w.menuWindowHeaderItem('Actualiser')
		.click(function() {
			that.refresh();
		})
		.appendTo(viewItemContent);
	
	var goToItem = $.w.menuWindowHeaderItem('Aller &agrave;...').appendTo(this._menu);
	goToItemContent = goToItem.menuWindowHeaderItem('content');
	
	$.w.menuWindowHeaderItem('Dossier parent')
		.click(function() {
			that._toolbar.toolbarWindowHeader('content').find('li:not(.active)').last().trigger('click');
		})
		.appendTo(goToItemContent);
	
	var helpItem = $.w.menuWindowHeaderItem('Aide').appendTo(this._menu);
	helpItemContent = helpItem.menuWindowHeaderItem('content');
	
	$.w.menuWindowHeaderItem('&Agrave; propos')
		.click(function() {
			that.openAboutWindow();
		})
		.appendTo(helpItemContent);
	
	this.window.window('open');
	
	this._refreshHeader(dir);
}