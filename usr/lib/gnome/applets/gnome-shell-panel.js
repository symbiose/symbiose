/**
 * SGnomeShellPanelApplet represente le menu principal de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SGnomeShellPanelApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var menuContent = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(menuContent);
	
	var $menu = $('<li><a href="#">Activit&eacute;s</a></li>').appendTo(menuContent);
	
	var $appMenu = $('<li id="shell-appmenu"><a href="#"></a></li>').appendTo(menuContent);
	
	var isShellShown = false;
	
	$(window).bind('resize', function(e) {
		if (!$(e.target).is('*') && isShellShown) { //Si c'est la fenetre
			$('#shell .content').width($('#shell').innerWidth() - $('#shell .launcher').outerWidth());
		}
	});
	
	var $searchEntry = $('#shell .content input.search-entry');
	var windowKeydownFn = function(e) {
		if (!$(e.target).is('input')) {
			$searchEntry.focus();
		}
	};
	var showShell = function(animate) {
		isShellShown = true;
		$appMenu.hide();
		$('#desktop > .webos-nautilus').hide();
		$('#desktop #shell').show();
		$('#shell .content').width($('#shell').innerWidth() - $('#shell .launcher').outerWidth());
		$menu.addClass('hover');
		renderLauncher();
		renderWindowsThumbnails(animate);
		SNotification.showContainer();
		$(window).keydown(windowKeydownFn);
	};
	var hideShell = function(animate) {
		isShellShown = false;
		$appMenu.show();
		$searchEntry.val('');
		$('#desktop #shell').hide();
		$('#desktop > .webos-nautilus').show();
		$menu.removeClass('hover');
		SNotification.hideContainer();
		$(window).unbind('keydown', windowKeydownFn);
		restoreWindows(animate);
	};
	var toggleShell = function() {
		if (!isShellShown) {
			showShell();
		} else {
			hideShell();
		}
	};
	
	var shellOverlay = $();
	var renderWindowsThumbnails = function(animate) {
		hideShortcuts();
		
		var shellX = 150,
			shellY = 100,
			shellWidth = $('#desktop #shell').width() - $('#desktop #shell .launcher').outerWidth() - shellX,
			shellHeight = $('#desktop #shell').height() - $('#header').outerHeight() - shellY;
		var windows = SWorkspace.getCurrent().getWindows();
		
		if (windows.length == 0) {
			return;
		}
		
		var duration = 'fast';
		if (animate === false || $.fx.off) {
			duration = 0;
		}
		
		var overlayX = shellX - 5, overlayY = shellY - 5;
		if (typeof shellOverlay == 'undefined') {
			shellOverlay = $('<div></div>', { id: 'gnome-shell-overlay' }).css({
				position: 'absolute',
				left: overlayX+'px',
				top: overlayY+'px',
				width: (shellWidth + 5)+'px',
				height: (shellHeight + 5)+'px',
				'z-index': 9999
			}).appendTo(W.UserInterface.current.element);
			
			if (!$.support.transition) {
				shellOverlay.addClass('fallback');
			}
		} else {
			shellOverlay.empty().show();
		}
		
		var cols = 1, lines = windows.length;
		while(cols < lines) {
			cols++;
			lines = Math.ceil(windows.length / cols);
		}
		
		var paddingX = 10, paddingY = 30;
		var maxWindowWidth = Math.floor(shellWidth / cols) - paddingX,
			maxWindowHeight = Math.floor(shellHeight / lines) - paddingY;
		
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
						hideShell();
						if (thisWindow.is('.hidden-window')) {
							thisWindow.window('show');
						} else {
							thisWindow.window('toForeground');
						}
					}
				}).appendTo(shellOverlay);
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
	};
	var restoreWindows = function(animate) {
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
		if (typeof shellOverlay != 'undefined') {
			shellOverlay.fadeOut(duration, function() {
				$(this).remove();
			});
			shellOverlay = undefined;
		}
	};
	var showWindows = function() {
		hideShortcuts();
		if ($.support.transition) {
			var windows = SWorkspace.getCurrent().getWindows();
			for (var i = 0; i < windows.length; i++) {
				windows[i].show();
			}
		}
		if (typeof shellOverlay != 'undefined') {
			shellOverlay.show();
		}
	};
	var hideWindows = function() {
		if ($.support.transition) {
			var windows = SWorkspace.getCurrent().getWindows();
			for (var i = 0; i < windows.length; i++) {
				windows[i].hide();
			}
		}
		if (typeof shellOverlay != 'undefined') {
			shellOverlay.hide();
		}
	};
	
	var cmds2Windows = {};
	var categories;
	var applications;
	var loadShortcuts = function(callback) {
		callback = W.Callback.toCallback(callback);
		
		if (typeof applications == 'undefined') {
			new W.ServerCall({
				'class': 'ApplicationShortcutController',
				method: 'get',
				arguments: {}
			}).load(new W.Callback(function(response) {
				var data = response.getData();
				applications = data.applications;
				categories = {};
				for (var key in data.categories) {
					categories[data.categories[key].name] = data.categories[key];
				}
				callback.success();
			}, function(response) {
				callback.error(response);
			}));
		} else {
			callback.success();
		}
	};
	var showAppsCategories = function(list) {
		var $categories = $('#shell .shortcuts .filters');
		
		$categories.empty();
		
		$('<li></li>', { title: 'Afficher toutes les applications', 'class': 'active' }).html('Toutes').click(function() {
			$(this).parent().children('.active').removeClass('active');
			$(this).addClass('active');
			if ($searchEntry.val() == '') {
				showAllApps();
			} else {
				showSearch($searchEntry.val());
			}
		}).appendTo($categories);
		
		var usedCategories = [];
		for (var key in list) {
			(function(key, app) {
				//Si la categorie est specifiee
				if (typeof app.category == 'undefined') {
					return;
				}
				
				//Si le menu dans lequel est l'application n'existe pas
				if (jQuery.inArray(app.category, usedCategories) != -1) {
					return;
				}
				
				//Si on n'a pas les infos sur la categorie
				if (typeof categories[app.category] == 'undefined') {
					return;
				}
				
				var catData = categories[app.category];
				
				$('<li></li>', { title: catData.description }).html(catData.title).click(function() {
					$(this).parent().children('.active').removeClass('active');
					$(this).addClass('active');
					if ($searchEntry.val() == '') {
						showAppsByCat(catData.name);
					} else {
						getAppsByCat(function(apps) {
							getSearch(function(apps) {
								showShortcurts(apps);
							}, $searchEntry.val(), apps);
						}, catData.name);
					}
				}).appendTo($categories);
				
				usedCategories.push(catData.name);
			})(key, list[key]);
		}
	};
	var showShortcurts = function(list) {
		hideWindows();
		$('#shell .shortcuts').show();
		$('#desktop #shell .mode li.windows.active').removeClass('active');
		$('#desktop #shell .mode li.applications').addClass('active');
		
		var $list = $('#shell .shortcuts .list');
		$list.scrollPane({
			autoReload: true
		}).scrollPane('content').empty();
		var $applications = $('<ul></ul>').appendTo($list.scrollPane('content'));
		
		for (var key in list) {
			(function(key, app) {
				if (typeof app.menu != 'undefined' && app.menu == 'places') {
					return;
				}
				
				var item = $('<li></li>', { title: app.description });
				
				if (typeof cmds2Windows[app.command] != 'undefined') {
					item.addClass('active').click(function() {
						hideShell();
						var appWindow = cmds2Windows[app.command];
						if (appWindow.window('is', 'hidden')) {
							appWindow.window('show');
						} else {
							appWindow.window('toForeground');
						}
					});
				} else {
					item.click(function() {
						hideShell();
						W.Cmd.execute(app.command);
					});
				}
				
				$('<img />', { src: new W.Icon(app.icon, 92), alt: app.title }).appendTo(item);
				$('<br />').appendTo(item);
				$('<span></span>', { 'class': 'title' }).html(app.title).appendTo(item);
				
				item.appendTo($applications);
			})(key, list[key]);
		}
		
		$list.scrollPane('reload');
	};
	var clickOnFirstShortcut = function() {
		$('#shell .shortcuts .list ul:first li:first').click();
	};
	var hideShortcuts = function() {
		$('#shell .shortcuts').hide();
		$('#desktop #shell .mode li.applications.active').removeClass('active');
		$('#desktop #shell .mode li.windows').addClass('active');
	};
	var getAllApps = function(callback) {
		callback = W.Callback.toCallback(callback);
		
		if (typeof applications == 'undefined') {
			loadShortcuts(new W.Callback(function() {
				callback.success(applications);
			}, function(response) {
				callback.error(response);
			}));
		} else {
			callback.success(applications);
		}
	};
	var showAllApps = function() {
		getAllApps(function(apps) {
			showAppsCategories(apps);
			showShortcurts(apps);
		});
	};
	var getAppsByCat = function(callback, cat, apps) {
		callback = W.Callback.toCallback(callback);
		
		if (typeof applications == 'undefined') {
			loadShortcuts(new W.Callback(function() {
				getAppsByCat(callback, cat, apps);
			}, function(response) {
				callback.error(response);
			}));
		} else {
			if (typeof apps == 'undefined') {
				apps = applications;
			}
			var appsToShow = {};
			for (var key in apps) {
				var app = apps[key];
				if (typeof app.category == 'undefined') {
					continue;
				}
				
				if (app.category == cat) {
					appsToShow[key] = app;
				}
			}
			callback.success(appsToShow);
		}
	};
	var showAppsByCat = function(cat, apps) {
		getAppsByCat(function(apps) {
			showShortcurts(apps);
		}, cat, apps);
	};
	var getSearch = function(callback, search, apps) {
		callback = W.Callback.toCallback(callback);
		
		if (typeof applications == 'undefined') {
			loadShortcuts(new W.Callback(function() {
				getSearch(callback, search, apps);
			}, function(response) {
				callback.error(response);
			}));
		} else {
			if (typeof apps == 'undefined') {
				apps = applications;
			}
			if (search == '') {
				callback.success(apps);
				return;
			}
			
			search = search.toLowerCase();
			var appsToShow = {};
			for (var key in apps) {
				var app = apps[key];
				
				var found = 0;
				for (var index in app) {
					var data = app[index];
					if (typeof data == 'string') {
						if (data.toLowerCase().search(search) != -1) {
							found++;
						}
					}
				}
				
				if (found > 0) {
					appsToShow[key] = app;
				}
			}
			callback.success(appsToShow);
		}
	};
	var showSearch = function(search, apps) {
		getSearch(function(apps) {
			showAppsCategories(apps);
			showShortcurts(apps);
		}, search, apps);
	};
	
	var renderLauncher = function() {
		if (typeof applications == 'undefined') {
			loadShortcuts(new W.Callback(function() {
				renderLauncher();
			}));
			return;
		}
		
		var $launcher = $('#shell .launcher');
		
		var isFirstRendering = false;
		if ($launcher.children().length == 0) {
			isFirstRendering = true;
		}
		$launcher.empty();
		
		var windows = SWorkspace.getCurrent().getWindows(), favorites = [];
		
		for (var key in applications) {
			if (typeof applications[key].favorite != 'undefined' && parseInt(applications[key].favorite) > 0) {
				favorites.push(applications[key]);
			}
		}
		
		if (favorites.length == 0 && windows.length == 0) {
			$launcher.hide();
			return;
		}
		
		favorites.sort(function(a, b) {
		    return parseInt(a.favorite) - parseInt(b.favorite);
		});
		
		var alreadyShowedWindows = [];
		for (var i = 0; i < favorites.length; i++) {
			(function(i, thisApp) {
				var $item = $('<li></li>').appendTo($launcher);
				
				var appWindow = $();
				for (var cmd in cmds2Windows) {
					if (cmd === thisApp.command) {
						appWindow = cmds2Windows[cmd];
					}
				}
				
				if (appWindow.length > 0) {
					$item.addClass('active').click(function() {
						hideShell();
						if (appWindow.window('is', 'hidden')) {
							appWindow.window('show');
						} else {
							appWindow.window('toForeground');
						}
					});
					alreadyShowedWindows.push(appWindow.window('id'));
				} else {
					$item.click(function() {
						hideShell();
						W.Cmd.execute(thisApp.command);
					});
				}
				$('<img />', { src: new W.Icon(thisApp.icon, 48), alt: thisApp.title, title: thisApp.title }).appendTo($item);
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
					hideShell();
					if (thisWindow.window('is', 'hidden')) {
						thisWindow.window('show');
					} else {
						thisWindow.window('toForeground');
					}
				}).appendTo($launcher);
				$('<img />', { src: thisWindow.window('option', 'icon').realpath(48), alt: thisWindow.window('option', 'title'), title: thisWindow.window('option', 'title') }).appendTo($item);
			})(i, windows[i]);
		}
		
		$launcher.show();
		
		if (isFirstRendering) { //Si c'est la premiere initialisation, la position du launcher est buggee
			//Il faut cacher le shell puis le reafficher pour mettre a jour sa position
			hideShell(false);
			setTimeout(function() {
				showShell();
			}, 20);
		}
	};
	
	var menuToggled = false;
	$menu.click(function(e) {
		toggleShell();
		
		e.stopPropagation();
		e.preventDefault();
	}).mouseenter(function(e) {
		if (e.pageY != 0) {
			menuToggled = false;
		}
	}).mousemove(function(e) {
		if (!menuToggled && e.pageX < 10 && e.pageY < 10) {
			toggleShell();
			menuToggled = true;
		}
	});
	
	$('#desktop #shell .mode li').click(function() {
		if ($(this).is('.active')) {
			return;
		}
		
		if ($(this).is('.windows')) {
			showWindows();
		}
		if ($(this).is('.applications')) {
			showAllApps();
		}
	});
	var keypressTimer = -1;
	$searchEntry.hover(function() {
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
			keypressTimer = undefined;
			showSearch($searchEntry.val());
		}, 500);
	});
	$('#desktop').bind('windowopen', function(event, ui) {
		var process = Webos.Process.get(ui.window.window('pid'));
		if (typeof process != 'undefined') {
			cmds2Windows[process.cmd] = ui.window;
		}
	}).bind('windowclose', function(event, ui) {
		var process = Webos.Process.get(ui.window.window('pid'));
		if (typeof process != 'undefined') {
			delete cmds2Windows[process.cmd];
		}
	});
	$('#desktop').bind('windowafteropen windowclose', function() {
		if (isShellShown) {
			//On met a jour l'affichage des fenetres lors de leur ouverture ou fermeture
			restoreWindows(false);
			renderWindowsThumbnails(false);
			renderLauncher();
		}
	});
	
	var appMenuWindow = $();
	$('#desktop').bind('windowopen windowtoforeground', function(event, ui) {
		var thisWindow = $(ui.window);
		if (typeof thisWindow.window('option', 'parentWindow') != 'undefined' && thisWindow.window('option', 'parentWindow').length > 0) {
			thisWindow = thisWindow.window('option', 'parentWindow');
		}
		
		if (typeof appMenuWindow != 'undefined' && thisWindow.window('id') == appMenuWindow.window('id')) {
			return;
		}
		
		$appMenu.empty();
		var $appMenuTitle = $('<a></a>', { href: '#' }).appendTo($appMenu);
		var $iconContainer = $('<span></span>', { 'class': 'icon-container' }).appendTo($appMenuTitle);
		$('<img />', { src: thisWindow.window('option', 'icon').realpath(48), alt: '', 'class': 'icon' }).appendTo($iconContainer);
		$('<span></span>', { 'class': 'icon-overlay' }).appendTo($iconContainer);
		var loadingImg = $('<div></div>', { 'class': 'loading' }).appendTo($appMenuTitle);
		$('<span></span>', { 'class': 'title' }).html(thisWindow.window('option', 'title')).appendTo($appMenuTitle);
		$appMenuContent = $('<ul></ul>').appendTo($appMenu);
		$('<li>Quitter '+thisWindow.window('option', 'title')+'</li>').click(function() {
			thisWindow.window('close');
		}).appendTo($appMenuContent);
		
		if (!thisWindow.window('is', 'loading')) {
			loadingImg.hide();
		}
		
		var loadingStartHandler = function() {
			loadingImg.show();
		};
		var loadingStopHandler = function() {
			loadingImg.hide();
		};
		thisWindow
			.bind('windowloadingstart', loadingStartHandler)
			.bind('windowloadingstop', loadingStopHandler)
			.one('windowclose windowtobackground', function() {
				thisWindow
					.unbind('windowloadingstart', loadingStartHandler)
					.unbind('windowloadingstop', loadingStopHandler);
			});
		
		appMenuWindow = thisWindow;
	});
	$('#desktop').bind('windowclose windowtobackground', function(event, ui) {
		if (ui.window.is(appMenuWindow)) {
			$appMenu.empty();
			appMenuWindow = undefined;
		}
	});
}