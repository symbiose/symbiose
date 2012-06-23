(function() {
	new Webos.ScriptFile('usr/lib/webos/applications.js');
	
	window.Shell = {
		_initialized: false,
		_shown: false,
		_$shell: $('#shell'),
		_$launcher: $('#shell .launcher'),
		_$searchEntry: $('#shell .content input.search-entry'),
		_$overlay: $(),
		_$appsCategories: $('#shell .shortcuts .filters'),
		_$appsList: $('#shell .shortcuts .list'),
		
		_cmds2Windows: {},

		show: function(animate) {
			this._shown = true;
			$('#desktop > .webos-nautilus').hide();
			this._$shell.show();
			$('#shell .content').width(this._$shell.innerWidth() - this._$launcher.outerWidth());
			this._renderLauncher();
			this._renderWindowsThumbnails(animate);
			SNotification.showContainer();
			
			var that = this;
			$(window).bind('keydown.search.shell.webos', function(e) {
				if (!$(e.target).is('input')) {
					that._$searchEntry.focus();
				}
			});
			
			this.notify('show');
		},
		hide: function(animate) {
			this._shown = false;
			this._$searchEntry.val('');
			this._$shell.hide();
			$('#desktop > .webos-nautilus').show();
			SNotification.hideContainer();
			$(window).unbind('keydown.search.shell.webos');
			this._restoreWindows(animate);
			
			this.notify('hide');
		},
		shown: function() {
			return this._shown;
		},
		toggle: function() {
			if (!this.shown()) {
				this.show();
			} else {
				this.hide();
			}
		},
		_renderWindowsThumbnails: function(animate) {
			this._hideShortcuts();
			
			var shellX = 150,
				shellY = 100,
				shellWidth = this._$shell.width() - this._$launcher.outerWidth() - shellX,
				shellHeight = this._$shell.height() - $('#header').outerHeight() - shellY;
			var windows = SWorkspace.getCurrent().getWindows();
			
			if (windows.length == 0) {
				return;
			}
			
			var duration = 'fast';
			if (animate === false || $.fx.off) {
				duration = 0;
			}
			
			var overlayX = shellX - 5, overlayY = shellY - 5;
			if (!this._$shellOverlay || this._$shellOverlay.length == 0) {
				this._$shellOverlay = $('<div></div>', { id: 'gnome-shell-overlay' }).css({
					position: 'absolute',
					left: overlayX+'px',
					top: overlayY+'px',
					width: (shellWidth + 5)+'px',
					height: (shellHeight + 5)+'px',
					'z-index': 9999
				}).appendTo(Webos.UserInterface.current.element);
				
				if (!$.support.transition) {
					this._$shellOverlay.addClass('fallback');
				}
			} else {
				this._$shellOverlay.empty().show();
			}
			
			var cols = 1, lines = windows.length;
			while(cols < lines) {
				cols++;
				lines = Math.ceil(windows.length / cols);
			}
			
			var paddingX = 10, paddingY = 30;
			var maxWindowWidth = Math.floor(shellWidth / cols) - paddingX,
				maxWindowHeight = Math.floor(shellHeight / lines) - paddingY;
			
			var that = this;
			for (var i = 0; i < windows.length; i++) {
				(function(i, thisWindow) {
					var thisWindowPos = { element: thisWindow };
					
					var windowWidth, windowHeight;
					thisWindow.stop().css('display', 'block');
					if (thisWindow.window('is', 'hidden')) {
						thisWindow.css({
							top: 0,
							left: 0,
							width: 'auto',
							height: 'auto'
						});
						windowWidth = thisWindow.outerWidth();
						windowHeight = thisWindow.outerHeight();
						thisWindow.css({
							width: 0,
							height: 0,
							opacity: 0
						}).animate({
							opacity: 1,
							width: windowWidth,
							height: windowHeight
						}, {
							duration: duration,
							queue: false
						});
					} else {
						windowWidth = thisWindow.outerWidth();
						windowHeight = thisWindow.outerHeight();
					}
					
					//Determination de la position de la fenetre dans la grille
					var windowCol = i % cols, windowLine = Math.floor(i / cols);
					
					//Dimentions max. de la miniature
					var thisMaxWindowWidth = maxWindowWidth, thisMaxWindowHeight = maxWindowHeight;
					if (windowLine == lines - 1 && lines > 1) { //Si c'est la derniere ligne
						//On peut peut-etre prendre + de place, il peut y avoir des places vides
						var windowsInThisLine = windows.length % cols;
						if (windowsInThisLine == 0) { //Si on trouve 0, c'est que la ligne est remplie
							windowsInThisLine = cols;
						}
						thisMaxWindowWidth = Math.floor(shellWidth / windowsInThisLine) - paddingX;
					}
					
					//Reduction
					var reduction = 1;
					if (windowWidth > thisMaxWindowWidth || windowHeight > thisMaxWindowHeight) {
						var reductionX = thisMaxWindowWidth / windowWidth;
						var reductionY = thisMaxWindowHeight / windowHeight;
						reduction = Math.min(reductionX, reductionY);
					}
					thisWindowPos.width = Math.round(windowWidth * reduction);
					thisWindowPos.height = Math.round(windowHeight * reduction);
					
					//Translation
					var windowOffset = thisWindow.offset();
					var windowX = shellX + windowCol * (thisMaxWindowWidth + paddingX) + ((windowWidth + thisMaxWindowWidth) / 2 - windowWidth),
						windowY = shellY + windowLine * (maxWindowHeight + paddingY) + ((windowHeight + maxWindowHeight) / 2 - windowHeight);
					thisWindowPos.left = Math.round(windowX + (windowWidth - thisWindowPos.width) / 2);
					thisWindowPos.top = Math.round(windowY + (windowHeight - thisWindowPos.height) / 2);

					var translationX = windowX - windowOffset.left,
						translationY = windowY - windowOffset.top;
					
					var windowOverlayX = thisWindowPos.left - overlayX, windowOverlayY = thisWindowPos.top - overlayY;
					//On ajoute un element au-dessus
					var windowOverlay = $('<div></div>').css({
						position: 'absolute',
						left: windowOverlayX+'px',
						top: windowOverlayY+'px',
						width: thisWindowPos.width+'px',
						height: thisWindowPos.height+'px'
					}).click(function(e) {
						if (!$(e.target).is('.window-close')) {
							that.hide();
							if (thisWindow.is('.hidden-window')) {
								thisWindow.window('show');
							} else {
								thisWindow.window('toForeground');
							}
						}
					}).appendTo(that._$shellOverlay);
					$('<div></div>', { 'class': 'window-close' }).click(function() {
						$(this).remove();
						thisWindow.window('close');
					}).appendTo(windowOverlay);
					var windowLabel = $('<div></div>', { 'class': 'window-label' }).html('<span>'+thisWindow.window('option', 'title')+'</span>').hide().appendTo(windowOverlay);
					if (!$.support.transition) {
						var iconContainer = $('<div></div>', { 'class': 'icon' }).appendTo(windowOverlay);
						$('<img />', { src: thisWindow.window('option', 'icon').realpath(92) }).appendTo(iconContainer);
					}
					
					if ($.support.transition) {
						//On applique le CSS
						thisWindow.transition({
							x: translationX,
							y: translationY,
							scale: reduction
						}, duration, function() {
							windowLabel.fadeIn(duration);
						});
					} else {
						thisWindow.fadeOut(duration);
						windowLabel.fadeIn(duration);
					}
				})(i, windows[i]);
			}
		},
		_restoreWindows: function(animate) {
			var duration = 'fast';
			if (animate === false || $.fx.off) {
				duration = 0;
			}
			
			var windows = SWorkspace.getCurrent().getWindows();
			for (var i = 0; i < windows.length; i++) {
				if ($.support.transition) {
					var endState;
					
					if (windows[i].window('is', 'hidden')) {
						endState = {
							x: 0,
							y: 0,
							scale: 1,
							opacity: 0,
							width: 0,
							height: 0
						};
					} else {
						endState = {
							x: 0,
							y: 0,
							scale: 1
						};
					}
					
					windows[i].show().stop().transition(endState, duration);
				} else {
					if (!windows[i].window('is', 'hidden')) {
						windows[i].fadeIn(duration);
					}
				}
			}
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.fadeOut(duration, function() {
					$(this).remove();
				});
				this._$shellOverlay = $();
			}
		},
		showWindows: function() {
			this._hideShortcuts();
			if ($.support.transition) {
				var windows = SWorkspace.getCurrent().getWindows();
				for (var i = 0; i < windows.length; i++) {
					windows[i].show();
				}
			}
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.show();
			}
		},
		_hideWindows: function() {
			if ($.support.transition) {
				var windows = SWorkspace.getCurrent().getWindows();
				for (var i = 0; i < windows.length; i++) {
					windows[i].hide();
				}
			}
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.hide();
			}
		},
		_showAppsCategories: function(list) {
			var that = this;
			
			this._$appsCategories.empty();
			
			$('<li></li>', { title: 'Afficher toutes les applications', 'class': 'active' }).html('Toutes').click(function() {
				$(this).parent().children('.active').removeClass('active');
				$(this).addClass('active');
				if (!that._$searchEntry.val()) {
					that.showAllApps();
				} else {
					that.showAppsBySearch(that._$searchEntry.val());
				}
			}).appendTo(this._$appsCategories);
			
			var usedCategories = [];
			for (var key in list) {
				(function(key, app) {
					//Si la categorie est specifiee
					if (!app.get('category')) {
						return;
					}
					
					//Si le menu dans lequel est l'application n'existe pas
					if (jQuery.inArray(app.get('category'), usedCategories) != -1) {
						return;
					}
					
					Webos.Application.category(app.get('category'), function(catData) {
						if (!catData) {
							return;
						}
						
						$('<li></li>', { title: catData.description }).html(catData.title).click(function() {
							$(this).parent().children('.active').removeClass('active');
							$(this).addClass('active');
							if (!that._$searchEntry.val()) {
								that.showAppsByCat(catData.name);
							} else {
								Webos.Application.listByCategory(catData.name, function(apps) {
									Webos.Application.listBySearch(that._$searchEntry.val(), function(apps) {
										that._showShortcurts(apps);
									}, apps);
								});
							}
						}).appendTo(that._$appsCategories);
					});
					
					usedCategories.push(app.get('category'));
				})(key, list[key]);
			}
		},
		_showShortcurts: function(list) {
			var that = this;
			
			this._hideWindows();
			$('#shell .shortcuts').show();
			$('#desktop #shell .mode li.windows.active').removeClass('active');
			$('#desktop #shell .mode li.applications').addClass('active');
			
			var $list = this._$appsList;
			$list.scrollPane({
				autoReload: true
			}).scrollPane('content').empty();
			var $applications = $('<ul></ul>').appendTo($list.scrollPane('content'));
			
			for (var key in list) {
				(function(key, app) {
					if (typeof app.get('menu') != 'undefined' && app.get('menu') == 'places') {
						return;
					}
					
					var item = $('<li></li>', { title: app.get('description') });
					
					if (typeof that._cmds2Windows[app.get('command')] != 'undefined') {
						item.addClass('active').click(function() {
							that.hide();
							var appWindow = that._cmds2Windows[app.get('command')];
							if (appWindow.window('is', 'hidden')) {
								appWindow.window('show');
							} else {
								appWindow.window('toForeground');
							}
						});
					} else {
						item.click(function() {
							that.hide();
							W.Cmd.execute(app.get('command'));
						});
					}
					
					$('<img />', { src: new W.Icon(app.get('icon'), 92), alt: app.get('title') }).appendTo(item);
					$('<br />').appendTo(item);
					$('<span></span>', { 'class': 'title' }).html(app.get('title')).appendTo(item);
					
					var contextmenu = $.w.contextMenu(item);
					$.webos.menuItem('Nouvelle fen&ecirc;tre').click(function() {
						that.hide();
						W.Cmd.execute(app.get('command'));
					}).appendTo(contextmenu);
					if (app.get('favorite') !== false) {
						$.webos.menuItem('Retirer des favoris', true).click(function() {
							removeFavorite(app);
						}).appendTo(contextmenu);
					} else {
						$.webos.menuItem('Ajouter aux favoris', true).click(function() {
							addFavorite(app);
						}).appendTo(contextmenu);
					}
					
					item.appendTo($applications);
				})(key, list[key]);
			}
			
			$list.scrollPane('reload');
		},
		_clickOnFirstShortcut: function() {
			$('#shell .shortcuts .list ul:first li:first').click();
		},
		_hideShortcuts: function() {
			$('#shell .shortcuts').hide();
			$('#desktop #shell .mode li.applications.active').removeClass('active');
			$('#desktop #shell .mode li.windows').addClass('active');
		},
		showAllApps: function() {
			var that = this;
			
			Webos.Application.list(function(apps) {
				that._showAppsCategories(apps);
				that._showShortcurts(apps);
			});
		},
		showAppsByCat: function(cat, apps) {
			var that = this;
			
			Webos.Application.listByCategory(cat, function(apps) {
				that._showShortcurts(apps);
			}, apps);
		},
		showAppsBySearch: function(search, apps) {
			var that = this;
			
			Webos.Application.listBySearch(search, function(apps) {
				that._showAppsCategories(apps);
				that._showShortcurts(apps);
			}, apps);
		},
		_renderLauncher: function() {
			var that = this;
			
			Webos.Application.listFavorites(function(favorites) {
				var isFirstRendering = false;
				if (that._$launcher.children().length == 0) {
					isFirstRendering = true;
				}
				
				that._$launcher.empty();
				
				var windows = SWorkspace.getCurrent().getWindows();
				
				if (favorites.length == 0 && windows.length == 0) {
					that._$launcher.hide();
					return;
				}
				
				var alreadyShowedWindows = [];
				for (var i = 0; i < favorites.length; i++) {
					(function(i, app) {
						var $item = $('<li></li>').appendTo(that._$launcher);
						
						var appWindow = $();
						if (that._cmds2Windows[app.get('command')]) {
							appWindow = that._cmds2Windows[app.get('command')];
						}
						
						if (appWindow.length > 0) {
							$item.addClass('active').click(function() {
								that.hide();
								if (appWindow.window('is', 'hidden')) {
									appWindow.window('show');
								} else {
									appWindow.window('toForeground');
								}
							});
							alreadyShowedWindows.push(appWindow.window('id'));
						} else {
							$item.click(function() {
								that.hide();
								W.Cmd.execute(app.get('command'));
							});
						}
						$('<img />', { src: new W.Icon(app.get('icon'), 48), alt: app.get('title'), title: app.get('title') }).appendTo($item);
						
						var contextmenu = $.w.contextMenu($item);
						$.webos.menuItem('Nouvelle fen&ecirc;tre').click(function() {
							that.hide();
							W.Cmd.execute(app.get('command'));
						}).appendTo(contextmenu);
						if (app.get('favorite') !== false) {
							$.webos.menuItem('Retirer des favoris', true).click(function() {
								
							}).appendTo(contextmenu);
						} else {
							$.webos.menuItem('Ajouter aux favoris', true).click(function() {
								
							}).appendTo(contextmenu);
						}
					})(i, favorites[i]);
				}
				for (var i = 0; i < windows.length; i++) {
					(function(i, thisWindow) {
						if ($.inArray(thisWindow.window('id'), alreadyShowedWindows) != -1) {
							return;
						}
						
						if (typeof thisWindow.window('option', 'parentWindow') != 'undefined' && thisWindow.window('option', 'parentWindow').length != 0) {
							return;
						}
						
						var $item = $('<li></li>', { 'class': 'active' }).click(function() {
							that.hide();
							if (thisWindow.window('is', 'hidden')) {
								thisWindow.window('show');
							} else {
								thisWindow.window('toForeground');
							}
						}).appendTo(that._$launcher);
						$('<img />', { src: thisWindow.window('option', 'icon').realpath(48), alt: thisWindow.window('option', 'title'), title: thisWindow.window('option', 'title') }).appendTo($item);
					})(i, windows[i]);
				}
				
				that._$launcher.show();
				
				if (isFirstRendering) { //Si c'est la premiere initialisation, la position du launcher est buggee
					//Il faut cacher le shell puis le reafficher pour mettre a jour sa position
					that.hide(false);
					setTimeout(function() {
						that.show(false);
					}, 20);
				}
			});
		},
		init: function() {
			if (this._initialized) {
				return;
			}
			
			var that = this;
			
			$(window).bind('resize', function(e) {
				if (!$(e.target).is('*') && that.shown()) { //Si c'est la fenetre
					$('#shell .content').width(that._$shell.innerWidth() - that._$launcher.outerWidth());
				}
			});
			
			$(document).bind('windowopen', function(event, ui) {
				var process = Webos.Process.get(ui.window.window('pid'));
				if (typeof process != 'undefined') {
					that._cmds2Windows[process.cmd] = ui.window;
				}
			}).bind('windowclose', function(event, ui) {
				var process = Webos.Process.get(ui.window.window('pid'));
				if (typeof process != 'undefined') {
					delete that._cmds2Windows[process.cmd];
				}
			}).bind('windowafteropen windowclose', function() {
				if (that.shown()) {
					//On met a jour l'affichage des fenetres lors de leur ouverture ou fermeture
					that._restoreWindows(false);
					that._renderWindowsThumbnails(false);
					that._renderLauncher();
				}
			});
			
			$('#desktop #shell .mode li').click(function() {
				if ($(this).is('.active')) {
					return;
				}
				
				if ($(this).is('.windows')) {
					that.showWindows();
				}
				if ($(this).is('.applications')) {
					that.showAllApps();
				}
			});
			
			var keypressTimer = -1;
			this._$searchEntry.hover(function() {
				$(this).addClass('active');
			}, function() {
				if (!$(this).is(':focus')) {
					$(this).removeClass('active');
				}
			}).focusin(function() {
				$(this).addClass('active');
			}).focusout(function() {
				if (!$(this).is(':hover')) {
					$(this).removeClass('active');
				}
			}).bind('keydown', function(e) {
				if (e.keyCode == 13) {
					clickOnFirstShortcut();
					e.preventDefault();
				}
			}).bind('keyup', function(event) {
				if (keypressTimer !== -1) {
					clearTimeout(keypressTimer);
				}
				keypressTimer = setTimeout(function() {
					keypressTimer = -1;
					that.showAppsBySearch(that._$searchEntry.val());
				}, 500);
			});
			
			this._initialized = true;
		}
	};
	
	Webos.Observable.build(Shell);
	
	Shell.init();
})();