(function() {
	if (window.Shell) {
		if ($('#shell') != Shell._$shell) {
			Shell.reload();
		}
		return;
	}

	//On charge les bibliotheques
	W.ScriptFile.load(
		'/usr/lib/webos/applications.js',
		'/usr/lib/html2canvas/html2canvas.min.js',
		'/usr/lib/html2canvas/jquery.html2canvas.js'
	);

	/**
	 * Shell est la bibliotheque du Shell.
	 * @author $imon
	 * @version 1.2
	 */
	window.Shell = {
		/**
		 * Vrai si le Shell a ete initialise.
		 * @var boolean
		 */
		_initialized: false,
		/**
		 * Vrai si le Shell est affiche.
		 * @var boolean
		 */
		_shown: false,
		/**
		 * L'element du Shell.
		 * @var jQuery
		 */
		_$shell: $('#shell'),
		/**
		 * Le lanceur du Shell.
		 * @var jQuery
		 */
		_$launcher: $('#shell .launcher'),
		/**
		 * Le selecteur d'espace de travail.
		 * @var jQuery
		 */
		_$workspaces: $('#shell .workspaces'),
		/**
		 * Le cache de l'image d'arriere-plan pour les miniatures des espaces de travail.
		 */
		_backgroundImageData: null,
		/**
		 * URL de l'arriere-plan en cache pour les miniatures des espaces de travail.
		 */
		_backgroundImageURL: null,
		/**
		 * L'entree de recherche du Shell.
		 * @var jQuery
		 */
		_$searchEntry: $('#shell .content input.search-entry'),
		/**
		 * La surcouche du Shell, utilisee pour rendre les miniatures des fenetres.
		 * @var jQuery
		 */
		_$overlay: $(),
		/**
		 * Les filtres de recherche.
		 * @var jQuery
		 */
		_$appsCategories: $('#shell .shortcuts .filters'),
		/**
		 * La liste des applications.
		 * @var jQuery
		 */
		_$appsList: $('#shell .shortcuts .list'),
		
		/**
		 * L'objet faisant correspondre un commande aux fenetres ouvertes correspondantes.
		 * @var object
		 */
		_cmds2Windows: {},
		
		/**
		 * L'objet contenant les traductions.
		 * @var Webos.Translation
		 */
		_translations: null,

		/**
		 * Afficher le Shell.
		 * @param boolean animate Si definit a faux, les animations seront desactivees.
		 */
		show: function(animate) {
			this._shown = true;
			$('#desktop > .webos-nautilus').hide();
			this._$shell.show();
			$('#shell .content').width(this._$shell.innerWidth() - this._$launcher.outerWidth() - this._$workspaces.outerWidth());
			this._renderLauncher();
			this._renderWindowsThumbnails(animate);
			SNotification.showContainer();
			
			this._generateWorkspaces();
			
			var that = this;
			$(window).bind('keydown.search.shell.webos', function(e) {
				if (!$(e.target).is('input')) {
					that._$searchEntry.focus();
				}
			});
			
			this.notify('show');
		},
		/**
		 * Cacher le Shell.
		 * @param boolean animate Si definit a faux, les animations seront desactivees.
		 */
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
		/**
		 * Definit si le Shell est affiche ou non.
		 * @return boolean
		 */
		shown: function() {
			return this._shown;
		},
		/**
		 * Basculer l'affichage du Shell.
		 */
		toggle: function() {
			if (!this.shown()) {
				this.show();
			} else {
				this.hide();
			}
		},
		/**
		 * Effectuer le rendu des miniatures des fenetres.
		 * @param boolean animate Si definit a faux, les animations seront desactivees.
		 */
		_renderWindowsThumbnails: function(animate) {
			this._hideShortcuts(); //On cache les raccourcis.
			this._showWorkspaces();
			
			var shellX = 150,
				shellY = 100,
				shellWidth = this._$shell.width() - this._$launcher.outerWidth() - this._$workspaces.outerWidth() - shellX,
				shellHeight = this._$shell.height() - $('#header').outerHeight() - shellY;
			
			var windows = $.w.window.workspace.getCurrent().getWindows(); //Fenetres a afficher
			
			if (windows.length == 0) { //Si on n'a aucune fenetre a afficher, pas besoin d'aller plus loin
				return;
			}
			
			//Animations
			var duration = 'fast';
			if (animate === false || $.fx.off) {
				duration = 0;
			}
			
			//Ajout de la surcouche
			var overlayX = shellX - 5, overlayY = shellY - 5;
			if (!this._$shellOverlay || this._$shellOverlay.length == 0) {
				this._$shellOverlay = $('<div></div>', { id: 'gnome-shell-overlay' }).css({
					position: 'absolute',
					left: overlayX+'px',
					top: overlayY+'px',
					width: (shellWidth + 5)+'px',
					height: (shellHeight + 5)+'px',
					'z-index': 9999
				}).appendTo(Webos.UserInterface.Booter.current().element());
				
				if (!$.support.transition) {
					this._$shellOverlay.addClass('fallback');
				}
			} else {
				this._$shellOverlay.empty().show();
			}
			
			//Calcul du nombre de lignes et de colonnes optimal
			var cols = 1, lines = windows.length;
			while(cols < lines) {
				cols++;
				lines = Math.ceil(windows.length / cols);
			}
			
			//Calcul des dimentions max. d'une miniature
			var paddingX = 10, paddingY = 30;
			var maxWindowWidth = Math.floor(shellWidth / cols) - paddingX,
				maxWindowHeight = Math.floor(shellHeight / lines) - paddingY;
			
			var that = this;
			for (var i = 0; i < windows.length; i++) { //Pour chaque fenetre
				(function(i, thisWindow) {
					var thisWindowPos = { element: thisWindow };
					
					var windowWidth, windowHeight;
					thisWindow.stop().css('display', 'block');
					if (thisWindow.window('is', 'hidden')) { //Si la fenetre est cachee, il faut l'afficher
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
					if (!$.support.transition) { //Si le navigateur ne supporte pas les transformations CSS 2d, on active le mode "fallback"
						var iconContainer = $('<div></div>', { 'class': 'icon' }).appendTo(windowOverlay);
						$('<img />', { src: thisWindow.window('option', 'icon').realpath(92) }).appendTo(iconContainer);
					}
					
					if ($.support.transition) {
						//On applique le CSS
						thisWindow.addClass('animating').transition({
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
		/**
		 * Cacher les miniatures des fenetres.
		 * @param boolean animate Si definit a faux, les animations seront desactivees.
		 */
		_restoreWindows: function(animate) {
			//Animations
			var duration = 'fast';
			if (animate === false || $.fx.off) {
				duration = 0;
			}
			
			var windows = $.w.window.workspace.getCurrent().getWindows();
			for (var i = 0; i < windows.length; i++) {
				(function(thisWindow) {
					if ($.support.transition) {
						var endState;
						
						if (thisWindow.window('is', 'hidden')) {
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
						
						//On applique l'effet
						thisWindow.show().stop().transition(endState, duration, function() {
							thisWindow.removeClass('animating');
						});
					} else {
						if (!thisWindow.window('is', 'hidden')) {
							thisWindow.fadeIn(duration);
						}
					}
				})(windows[i]);
			}
			
			//On enleve la surcouche
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.fadeOut(duration, function() {
					$(this).remove();
				});
				this._$shellOverlay = $();
			}
		},
		/**
		 * Afficher les miniatures des fenetres.
		 */
		showWindows: function() {
			this._hideShortcuts(); //On cache les raccourcis
			this._showWorkspaces();
			
			if ($.support.transition) {
				var windows = $.w.window.workspace.getCurrent().getWindows();
				for (var i = 0; i < windows.length; i++) {
					windows[i].show();
				}
			}
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.show(); //On affiche la surcouche
			}
		},
		/**
		 * Cacher les miniatures des fenetres.
		 */
		_hideWindows: function() {
			if ($.support.transition) {
				var windows = $.w.window.workspace.getCurrent().getWindows();
				for (var i = 0; i < windows.length; i++) {
					windows[i].hide();
				}
			}
			if (typeof this._$shellOverlay != 'undefined') {
				this._$shellOverlay.hide(); //On cache la surcouche
			}
		},
		/**
		 * Afficher les categories des applications.
		 * @param object list La liste des applications a afficher.
		 */
		_showAppsCategories: function(list) {
			var that = this;
			var t = this.translations();
			
			this._$appsCategories.empty();
			
			$('<li></li>', { title: t.get('Show all applications'), 'class': 'active' }).html(t.get('All')).click(function() {
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
					
					//On recupere les infos sur la categorie
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
		/**
		 * Afficher les raccourcis des applications.
		 * @param object list La liste des applications a afficher.
		 */
		_showShortcurts: function(list) {
			var that = this;
			var t = this.translations();
			
			this._hideWindows();
			this._hideWorkspaces();
			$('#shell .shortcuts').show();
			$('#desktop #shell .mode li.windows.active').removeClass('active');
			$('#desktop #shell .mode li.applications').addClass('active');
			
			var $list = this._$appsList;
			$list.unbind('scrollpanescroll.shell.ui.webos');
			$list.scrollPane({
				autoReload: true
			}).scrollPane('content').empty();
			var $applications = $('<ul></ul>').appendTo($list.scrollPane('content'));
			
			var $icons = $();
			
			for (var key in list) {
				(function(key, app) {
					if (typeof app.get('menu') != 'undefined' && app.get('menu') == 'places') {
						return;
					}
					
					var item = $('<li></li>', { title: app.get('description') }).draggable({
						data: app,
						dragImage: $('<img />', { src: new W.Icon(app.get('icon'), 48) }).css({ height: '48px', width: '48px' })
					});
					
					if (typeof that._cmds2Windows[app.get('command')] != 'undefined') {
						item.addClass('active').click(function() {
							var appWindow = that._cmds2Windows[app.get('command')];
							if (appWindow.window('workspace').id() != $.w.window.workspace.getCurrent().id()) {
								$.w.window.workspace.switchTo(appWindow.window('workspace').id());
							}
							that.hide();
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
					
					var img = $.w.image(new W.Icon(app.get('icon'), 92), app.get('title')).appendTo(item);
					img.image('option', 'loadHidden', false);
					$('<br />').appendTo(item);
					$('<span></span>', { 'class': 'title' }).html(app.get('title')).appendTo(item);
					
					$icons = $icons.add(img);
					
					var contextmenu = $.w.contextMenu(item);
					$.webos.menuItem(t.get('New window')).click(function() {
						that.hide();
						W.Cmd.execute(app.get('command'));
					}).appendTo(contextmenu);
					if (app.get('favorite') !== false) {
						$.webos.menuItem(t.get('Remove from favorites'), true).click(function() {
							that.removeFavorite(app);
						}).appendTo(contextmenu);
					} else {
						$.webos.menuItem(t.get('Add to favorites'), true).click(function() {
							that.addFavorite(app);
						}).appendTo(contextmenu);
					}
					
					item.appendTo($applications);
				})(key, list[key]);
			}
			
			$list.scrollPane('reload');
			
			$list.bind('scrollpanescroll.shell.ui.webos', function(e, data) {
				//$icons.image('load');
			});
			
			$icons.image('load');
		},
		/**
		 * Simuler un clic sur le premier raccourci (utile lors d'un recherche, si l'utilisateur appuie sur la touche entree).
		 */
		_clickOnFirstShortcut: function() {
			$('#shell .shortcuts .list ul:first li:first').click();
		},
		/**
		 * Cacher les raccourcis.
		 */
		_hideShortcuts: function() {
			$('#shell .shortcuts').hide();
			$('#desktop #shell .mode li.applications.active').removeClass('active');
			$('#desktop #shell .mode li.windows').addClass('active');
		},
		/**
		 * Afficher les raccourcis de toutes les applications.
		 */
		showAllApps: function() {
			var that = this;
			
			Webos.Application.list(function(apps) {
				that._showAppsCategories(apps);
				that._showShortcurts(apps);
			});
		},
		/**
		 * Afficher les raccourcis d'une categorie d'appliactions.
		 * @param string cat Le nom de la categorie.
		 * @param object apps Les applications a filtrer.
		 */
		showAppsByCat: function(cat, apps) {
			var that = this;
			
			Webos.Application.listByCategory(cat, function(apps) {
				that._showShortcurts(apps);
			}, apps);
		},
		/**
		 * Afficher les raccourcis des applications repondant a une recherche.
		 * @param string search La recherche.
		 * @param object apps Les applications a filtrer.
		 */
		showAppsBySearch: function(search, apps) {
			var that = this;
			
			Webos.Application.listBySearch(search, function(apps) {
				that._showAppsCategories(apps);
				that._showShortcurts(apps);
			}, apps);
		},
		/**
		 * Ajouter une application aux favoris.
		 * @param Webos.Application app L'application a ajouter.
		 */
		addFavorite: function(app) {
			var that = this;
			var t = this.translations();
			
			Webos.Application.listFavorites(function(favorites) {
				app.set('favorite', favorites.length + 1);
				app.sync([function() {
					that._renderLauncher();
				}, function(response) {
					response.triggerError(t.get('Cannot add "${app}" to favorites', { 'app': app.get('title') }));
				}]);
			});
		},
		/**
		 * Enlever une applications des favoris.
		 * @param Webos.Application app L'application a enlever.
		 */
		removeFavorite: function(app) {
			var that = this;
			var t = this.translations();
			
			app.set('favorite', 0);
			app.sync([function() {
				that._renderLauncher();
			}, function(response) {
				response.triggerError(t.get('Cannot remove "${app}" from favorites', { 'app': app.get('title') }));
			}]);
		},
		/**
		 * Effectuer le rendu du lanceur.
		 */
		_renderLauncher: function() {
			var that = this;
			var t = this.translations();
			
			//On recupere les applications favorites
			Webos.Application.listFavorites(function(favorites) {
				//On detecte si c'est le premier rendu
				var isFirstRendering = false;
				if (that._$launcher.children().length == 0) {
					isFirstRendering = true;
				}
				
				that._$launcher.empty(); //On vide le lanceur
				
				var windows = $.w.window.workspace.getCurrent().getWindows();
				
				//Si rien n'est ouvert et qu'il n'y a aucun favori, on cache le lanceur et on s'arrete la
				if (favorites.length == 0 && windows.length == 0) {
					that._$launcher.hide();
					return;
				}
				
				var generateItemFn = function(data) {
					return $('<li></li>').addClass('icon').draggable({
						data: (data.app) ? data.app : null,
						dragImage: $('<img />', { src: data.icon.realpath(48) }).css({ height: '48px', width: '48px' })
					});
				};
				
				var alreadyShowedWindows = []; //Fenetres affichees dans les favoris
				for (var i = 0; i < favorites.length; i++) {
					(function(i, app) {
						var $item = generateItemFn({ icon: new W.Icon(app.get('icon'), 48), app: app }).appendTo(that._$launcher);
						
						//On detecte les fenetres correspondant au favori
						var appWindows = $();
						if (that._cmds2Windows[app.get('command')]) {
							appWindows = that._cmds2Windows[app.get('command')];
						}
						
						//Si des fenetres correspondent au favori
						if (appWindows.length > 0) {
							//On determine la fenetre ayant le + grand z-index, c'est la derniere fenetre utilisee
							//C'est elle qui sera controllee a l'aide de l'icone
							var maxZIndex = 0, appWindow = appWindows.last();
							appWindows.each(function() {
								var zIndex = parseInt($(this).css('z-index'));
								if (zIndex >= maxZIndex) {
									appWindow = $(this);
									maxZIndex = zIndex;
								}
							});
							
							$item.addClass('active').click(function() {
								if (appWindow.window('workspace').id() != $.w.window.workspace.getCurrent().id()) {
									$.w.window.workspace.switchTo(appWindow.window('workspace').id());
								}
								that.hide();
								if (appWindow.window('is', 'hidden')) {
									appWindow.window('show');
								} else {
									appWindow.window('toForeground');
								}
							});
							
							//On ajoute les fenetres a la liste des fenetres deja affichees
							appWindows.each(function() {
								alreadyShowedWindows.push($(this).window('id'));
							});
						} else {
							//Si aucune fenetre ne correspond, l'icone lancera l'application
							$item.click(function() {
								that.hide();
								W.Cmd.execute(app.get('command'));
							});
						}
						$('<img />', { src: new W.Icon(app.get('icon'), 48), alt: app.get('title'), title: app.get('title') }).appendTo($item);
						
						//Menu contextuel
						var contextmenu = $.w.contextMenu($item);
						$.webos.menuItem(t.get('New window')).click(function() {
							that.hide();
							W.Cmd.execute(app.get('command'));
						}).appendTo(contextmenu);
						if (app.get('favorite') !== false) {
							$.webos.menuItem(t.get('Remove from favorites'), true).click(function() {
								that.removeFavorite(app);
							}).appendTo(contextmenu);
						} else {
							$.webos.menuItem(t.get('Add to favorites'), true).click(function() {
								that.addFavorite(app);
							}).appendTo(contextmenu);
						}
					})(i, favorites[i]);
				}
				
				//Maintenant, on traite le reste des fenetres
				for (var i = 0; i < windows.length; i++) {
					(function(i, thisWindow) {
						//Si la fenetre a deja ete traitee, on passe
						if ($.inArray(thisWindow.window('id'), alreadyShowedWindows) != -1) {
							return;
						}
						
						//Si c'est une fenetre fille, on passe
						if (typeof thisWindow.window('option', 'parentWindow') != 'undefined' && thisWindow.window('option', 'parentWindow').length != 0) {
							return;
						}
						
						//Sinon, on affiche l'icone
						var $item = generateItemFn({ icon: thisWindow.window('option', 'icon') }).addClass('active').click(function() {
							if (thisWindow.window('workspace').id() != $.w.window.workspace.getCurrent().id()) {
								$.w.window.workspace.switchTo(thisWindow.window('workspace').id());
							}
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
					//Il faut modifier les dimentions du shell mettre a jour sa position
					$('#shell .content').width(that._$shell.innerWidth() - that._$launcher.outerWidth()- that._$workspaces.outerWidth());
				}
			});
		},
		_drawWorkspace: function($item, canvasDimentions, desktopFactors, workspace) {
			var that = this;
			
			$item.html('<canvas>'+((workspace) ? workspace.id() + 1 : '+')+'</canvas>');
			
			var canvas = $item.children('canvas')[0];
			
			var canvasWidth = canvasDimentions.width, canvasHeight = canvasDimentions.height;
			var desktopFactorX = desktopFactors.x, desktopFactorY = desktopFactors.y;
			
			canvas.setAttribute('width', canvasWidth);
			canvas.setAttribute('height', canvasHeight);
			
			if (canvas.getContext) {
				var ctx = canvas.getContext('2d');
				
				//Fenetres
				var drawWindows = function() {
					if (workspace) {
						var windows = workspace.windows();
						if (!windows.length) {
							return;
						}
						for (var i = 0; i < windows.length; i++) {
							(function(thisWindow) {
								if (thisWindow.window('is', 'hidden')) {
									return;
								}

								var isHidden = false;
								if (thisWindow.css('display') == 'none') {
									isHidden = true;
									thisWindow.show();
								}

								var dim = thisWindow.window('dimentions'), pos = thisWindow.window('position');
								var rectX = pos.left / desktopFactorX, rectY = pos.top / desktopFactorY;
								var rectWidth = dim.width / desktopFactorX, rectHeight = dim.height / desktopFactorY;
								
								if (!$.fx.off) {
									try {
										thisWindow.html2canvas({
											proxy: null,
											onrendered: function(canvas) {
												if (isHidden) {
													thisWindow.hide();
												}
												ctx.drawImage(canvas, rectX, rectY, rectWidth, rectHeight);
											}
										});
									} catch (e) {}
								} else {
									if (isHidden) {
										thisWindow.hide();
									}

									ctx.fillStyle = 'white';
									ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
									ctx.fillStyle = 'black';
									ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
									
									var icon = thisWindow.window('option', 'icon');
									var url = icon.realpath(48);
									var img = new Image();
									img.src = url;
									
									var padding = 5;
									var originalImgWidth = 48, originalImgHeight = 48;
									var imgFactorX = rectWidth / originalImgWidth, imgFactorY = rectHeight / originalImgHeight;
									var imgFactor;
									if (imgFactorX < imgFactorY) {
										imgFactor = imgFactorX;
									} else {
										imgFactor = imgFactorY;
									}
									var imgWidth = originalImgWidth * imgFactor - padding, imgHeight = originalImgHeight * imgFactor - padding;
									if (imgWidth > originalImgWidth) { imgWidth = originalImgWidth; }
									if (imgHeight > originalImgHeight) { imgHeight = originalImgHeight; }
									var imgX = rectX + (rectWidth - imgWidth) / 2, imgY = rectY + (rectHeight - imgHeight) / 2;
									
									ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
								}
							})(windows[i]);
						}
					}
				};
				
				var url = Webos.File.get(Webos.Theme.current().get('background')).get('realpath');
				
				//Image d'arriere-plan
				if (this._backgroundImageData && this._backgroundImageURL == url && this._backgroundImageData.width == canvasWidth && this._backgroundImageData.height == canvasHeight) {
					ctx.putImageData(this._backgroundImageData, 0, 0);
					
					drawWindows();
				} else {
					//Fond blanc
					ctx.fillStyle = 'white';
					ctx.fillRect(0, 0, canvasWidth, canvasHeight);
					
					var url = Webos.File.get(Webos.Theme.current().get('background')).get('realpath');
					var img = new Image();
					img.onload = function() {
						var imgFactorX = canvasWidth / img.width, imgFactorY = canvasHeight / img.height;
						var imgFactor;
						if (imgFactorX > imgFactorY) {
							imgFactor = imgFactorX;
						} else {
							imgFactor = imgFactorY;
						}
						var imgWidth = img.width * imgFactor, imgHeight = img.height * imgFactor;
						var imgX = (canvasWidth - imgWidth) / 2, imgY = (canvasHeight - imgHeight) / 2;
						
						ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
						
						that._backgroundImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
						that._backgroundImageURL = url;
						
						drawWindows();
					};
					img.src = url;
				}
			}
		},
		_generateWorkspaces: function() {
			var that = this;
			
			var list = $.w.window.workspace.getList();
			
			var lastWorkspaceFilled = false;
			if (list.length) {
				lastWorkspaceFilled = (list[list.length - 1].windows().length > 0);
			}
			
			var desktopWidth = $('#desktop').outerWidth(), desktopHeight = $('#desktop').outerHeight();
			var availableWidth = that._$workspaces.width(), availableHeight = that._$workspaces.height();
			var nbrWorkspaces = $.w.window.workspace.getList().length + ((lastWorkspaceFilled) ? 1 : 0);
			
			var maxCanvasHeight = Math.round((availableHeight - nbrWorkspaces * 4) / nbrWorkspaces);
			var canvasHeight = (maxCanvasHeight > 110) ? 110 : maxCanvasHeight;
			
			var desktopFactorY = desktopHeight / canvasHeight;
			var canvasWidth = Math.round(desktopWidth / desktopFactorY);
			var desktopFactorX = desktopWidth / canvasWidth;
			
			if (canvasWidth > 160) {
				canvasWidth = 160;
				desktopFactorX = desktopWidth / canvasWidth;
				canvasHeight = Math.round(desktopHeight / desktopFactorX);
				desktopFactorY = desktopHeight / canvasHeight;
			}
			
			var lastWorkspaceFilled = false, previousWorkspaceFilled = false, isWorkspaceEmpty = false;
			for (var i = 0; i < list.length; i++) {
				(function(workspace) {
					previousWorkspaceFilled = lastWorkspaceFilled;
					lastWorkspaceFilled = (workspace.windows().length > 0);
					
					var found = false, regenerate = true, $item;
					that._$workspaces.children('li.workspace').each(function() {
						if ($(this).data('workspaceId') == workspace.id()) {
							found = true;
							$item = $(this);
						}
					});
					
					if (!lastWorkspaceFilled && !previousWorkspaceFilled && list.length > 1 && $.w.window.workspace.getCurrent().id() != workspace.id()) {
						if (found) {
							$item.remove();
						}
						$.w.window.workspace.remove(workspace.id());
						return;
					}
					
					if (!isWorkspaceEmpty) {
						isWorkspaceEmpty = (workspace.windows().length == 0);
					}
					
					if (found && workspace.id() != $.w.window.workspace.getCurrent().id()) {
						$item.removeClass('active');
						if ($item.children('canvas').width() == canvasWidth && $item.children('canvas').height() == canvasHeight) {
							return;
						}
					}
					
					if (!found) {
						$item = $('<li></li>', { 'class': 'workspace' });
						$item.appendTo(that._$workspaces);
						$item.data('workspaceId', workspace.id());
						$item.click(function() {
							$.w.window.workspace.switchTo(workspace.id());
							that._$workspaces.children('li.active').removeClass('active');
							$item.addClass('active');
						});
					}
					
					if (workspace.id() == $.w.window.workspace.getCurrent().id()) {
						$item.addClass('active');
					}
					
					that._drawWorkspace($item, { width: canvasWidth, height: canvasHeight }, { x: desktopFactorX, y: desktopFactorY }, workspace);
				})(list[i]);
			}
			
			if (that._$workspaces.children('li.create-workspace').length > 0) {
				that._$workspaces.children('li.create-workspace').remove();
			}
			if (!isWorkspaceEmpty) {
				var $item = $('<li></li>', { 'class': 'create-workspace' });
				$item.click(function() {
					var id = new $.w.window.workspace().id();
					$.w.window.workspace.switchTo(id);
					that._$workspaces.children('li.active').removeClass('active');
					that._generateWorkspaces();
				});
				$item.appendTo(that._$workspaces);
				that._drawWorkspace($item, { width: canvasWidth, height: canvasHeight }, { x: desktopFactorX, y: desktopFactorY });
			}
		},
		_hideWorkspaces: function() {
			this._$workspaces.hide();
			$('#shell .content').width(this._$shell.innerWidth() - this._$launcher.outerWidth());
		},
		_showWorkspaces: function() {
			this._$workspaces.show();
			$('#shell .content').width(this._$shell.innerWidth() - this._$launcher.outerWidth() - this._$workspaces.outerWidth());
		},
		/**
		 * Recuperer les traductions de GNOME Shell.
		 */
		translations: function() {
			return this._translations;
		},
		/**
		 * Initialiser le Shell.
		 */
		init: function() {
			if (this._initialized) { //Si le Shell a deja ete initialise, on stoppe
				return;
			}
			
			var that = this;
			
			//On redimentionne le Shell lorsque la fenetre l'est
			$(window).bind('resize', function(e) {
				if (!$(e.target).is('*') && that.shown()) { //Si c'est la fenetre
					$('#shell .content').width(that._$shell.innerWidth() - that._$launcher.outerWidth() - that._$workspaces.outerWidth());
				}
			});
			
			//On stocke la correspondance commande <-> fenetre lors de l'ouverture des fenetres
			$(document).bind('windowopen', function(event, ui) {
				var process = Webos.Process.get(ui.window.window('pid'));
				if (typeof process != 'undefined') {
					if (that._cmds2Windows[process.cmd]) {
						that._cmds2Windows[process.cmd] = that._cmds2Windows[process.cmd].add(ui.window);
					} else {
						that._cmds2Windows[process.cmd] = ui.window;
					}
				}
			}).bind('windowclose', function(event, ui) { //Lors de leur fermeture, on detruit cette relation
				var process = Webos.Process.get(ui.window.window('pid'));
				if (typeof process != 'undefined' && that._cmds2Windows[process.cmd]) {
					if (that._cmds2Windows[process.cmd].length > 1) {
						that._cmds2Windows[process.cmd] = that._cmds2Windows[process.cmd].not(ui.window);
					} else {
						delete that._cmds2Windows[process.cmd];
					}
				}
			}).bind('windowafteropen windowclose', function() {
				if (that.shown()) {
					//On met a jour l'affichage des fenetres lors de leur ouverture ou fermeture
					that._restoreWindows(false);
					that._renderWindowsThumbnails(false);
					that._renderLauncher();
					that._generateWorkspaces();
				}
			});
			
			$.w.window.workspace.bind('switch', function() {
				if (that.shown()) {
					//On met a jour l'affichage des fenetres
					that._restoreWindows(false);
					that._renderWindowsThumbnails(false);
					that._generateWorkspaces();
				}
			});
			
			//Lors du clic sur un bouton de mode ("Fenetres" et "Applications"), on change le mode
			this._$shell.find('.mode li').click(function() {
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
			
			//Gestion de la recherche via la zone de saisie
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
					that._clickOnFirstShortcut();
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
			
			//On charge les traductions
			Webos.Translation.load(function(t) {
				that._translations = t;
				
				that._$searchEntry.attr('placeholder', t.get('Search...'));
				that._$shell.find('.mode li.windows').html(t.get('Windows'));
				that._$shell.find('.mode li.applications').html(t.get('Applications'));
				
				var insertEl = $('<li></li>', { 'class': 'insert' }), dragIndex = null;
				that._$launcher.droppable({
					over: function(e, data) {
						var showInsertEl = function(e) {
							var inserted = false, thisIndex = 0;
							that._$launcher.children('li.icon').each(function() {
								if (inserted) {
									return;
								}
								if (data.draggable.is(this)) {
									return;
								}
								
								var offset = $(this).offset(), height = $(this).outerHeight(true);
								if (e.pageY > offset.top - height / 2 && e.pageY < offset.top + height / 2) {
									dragIndex = thisIndex;
									insertEl.detach().insertBefore(this);
									inserted = true;
								}
								if (e.pageY > offset.top + height / 2 && e.pageY < offset.top + height * 1.5) {
									dragIndex = thisIndex + 1;
									insertEl.detach().insertAfter(this);
									inserted = true;
								}
								
								thisIndex++;
							});
						};
						
						$(document).bind('mousemove.launcher.shell.ui.webos', function(e) {
							showInsertEl(e);
						});
						
						showInsertEl(e);
						
						insertEl.show();
					},
					out: function(e, data) {
						$(document).unbind('mousemove.launcher.shell.ui.webos');
						insertEl.hide();
						dragIndex = null;
					},
					drop: function(e, data) {
						$(document).unbind('mousemove.launcher.shell.ui.webos');
						insertEl.hide();
						
						var dragData = data.draggable.draggable('option', 'data');
						if (data.draggable.parent().is(that._$launcher)) {
							if (dragIndex === null) {
								return;
							}
							
							var inserted = false, thisIndex = 0;
							that._$launcher.children('li.icon').each(function() {
								if (inserted) {
									return;
								}
								if (data.draggable.is(this)) {
									return;
								}
								
								if (thisIndex == dragIndex) {
									data.draggable.detach().insertBefore(this);
									inserted = true;
								}
								
								thisIndex++;
							});
							if (!inserted) {
								data.draggable.detach().appendTo(that._$launcher);
							}
						}
						
						if (dragData instanceof Webos.Application) {
							var app = dragData;
							Webos.Application.listFavorites(function(favorites) {
								app.set('favorite', dragIndex + 1);
								app.sync([function() {
									that._renderLauncher();
								}, function(response) {
									response.triggerError(t.get('Cannot add "${app}" to favorites', { 'app': app.get('title') }));
								}]);
							});
						}
					}
				});
			}, 'gnome-shell');
			
			this._initialized = true; //On marque le Shell comme initialise
		},
		reload: function() {
			this._$shell = $('#shell');
			this._$launcher = $('#shell .launcher');
			this._$workspaces = $('#shell .workspaces');
			this._$searchEntry = $('#shell .content input.search-entry');
			this._$overlay = $();
			this._$appsCategories = $('#shell .shortcuts .filters');
			this._$appsList = $('#shell .shortcuts .list');

			this._initialized = false;
			this.init();
		}
	};
	
	Webos.Observable.build(Shell); //On rend le Shell observable
	
	Shell.init(); //On initialise le Shell
})();