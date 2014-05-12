Webos.require([
	{
		path: '/usr/lib/webos/applications.js',
		forceExec: false
	}
], function() {
	if (window.Elementary) {
		return;
	}

	window.Elementary = {
		_$launcher: $('#launcher'),
		_$launcherApps: $('#launcher ul'),
		_$launcherOverlay: $('#launcher-overlay'),
		_$appsBtn: $('#header .elementary-apps-btn'),
		_$apps: $('#elementary-apps'),
		_$searchEntry: $('#elementary-apps .search-entry'),
		_$appsViewBtns: $('#elementary-apps .apps-header .apps-view-btn-group'),
		_$calendar: $('#header .calendar'),
		_$memenu: $('#header .memenu'),
		_fullCmds2Windows: {},
		_cmds2Windows: {},
		_translations: new Webos.Translation(),
		_appsView: 'grid',
		_maximizedWindow: false,
		translations: function() {
			return this._translations;
		},
		initWindowsEvents: function () {
			var that = this;

			var onMaximized = function (win) {
				that.hideLauncher();
				that._maximizedWindow = true;
				that._$launcherOverlay.show();
			};
			var onMinimized = function (win) {
				that.showLauncher();
				that._maximizedWindow = false;
				that._$launcherOverlay.hide();
			};

			//On stocke la correspondance commande <-> fenetre lors de l'ouverture des fenetres
			$(document).on('windowopen.launcher.elementary', function(event, data) {
				var $win = $(event.target);

				var process = Webos.Process.get($win.window('pid'));
				if (process) {
					if (!that._fullCmds2Windows[process.fullCmd]) {
						that._fullCmds2Windows[process.fullCmd] = $();
					}
					that._fullCmds2Windows[process.fullCmd] = that._fullCmds2Windows[process.fullCmd].add($win);

					if (!that._cmds2Windows[process.cmd]) {
						that._cmds2Windows[process.cmd] = $();
					}
					that._cmds2Windows[process.cmd] = that._cmds2Windows[process.cmd].add($win);
				}
			}).on('windowclose.launcher.elementary', function(event, data) { //Lors de leur fermeture, on detruit cette relation
				var $win = $(event.target);

				var process = Webos.Process.get($win.window('pid'));
				if (typeof process != 'undefined') {
					if (that._fullCmds2Windows[process.fullCmd]) {
						that._fullCmds2Windows[process.fullCmd] = that._fullCmds2Windows[process.fullCmd].not($win);
						if (!that._fullCmds2Windows[process.fullCmd].length) {
							delete that._fullCmds2Windows[process.fullCmd];
						}
					}
					if (that._cmds2Windows[process.cmd]) {
						that._cmds2Windows[process.cmd] = that._cmds2Windows[process.cmd].not($win);
						if (!that._cmds2Windows[process.cmd].length) {
							delete that._cmds2Windows[process.cmd];
						}
					}
				}
			}).on('windowafteropen.launcher.elementary windowclose.launcher.elementary', function() {
				//On met a jour l'affichage des fenetres lors de leur ouverture ou fermeture
				that.renderLauncher();
			}).on('windowmaximize.launcher.elementary', function (e) {
				onMaximized($(e.target));
			}).on('windowminimize.launcher.elementary', function (e) {
				onMinimized($(e.target));
			}).on('windowhide.launcher.elementary windowtobackground.launcher.elementary', function (e) {
				if ($(e.target).window('is', 'maximized')) {
					setTimeout(function () {
						if ($(e.target).window('is', 'maximized') && (!$(e.target).window('is', 'visible') || !$(e.target).window('is', 'foreground'))) {
							onMinimized($(e.target));
						}
					}, 500);
				}
			}).on('windowclose.launcher.elementary', function (e) {
				if ($(e.target).window('is', 'maximized')) {
					onMinimized($(e.target));
				}
			}).on('windowshow.launcher.elementary windowtoforeground.launcher.elementary', function (e) {
				if ($(e.target).window('is', 'maximized')) {
					setTimeout(function () {
						if ($(e.target).window('is', 'maximized') && $(e.target).window('is', 'foreground') && $(e.target).window('is', 'visible')) {
							onMaximized($(e.target));
						}
					}, 500);
				}
			});

			this._$launcherOverlay.mouseenter(function () {
				if (!that._maximizedWindow || that.launcherVisible()) {
					return;
				}

				entered = true;

				$(document).on('mousemove.launcher.elementary', function (e) {
					if (e.pageY < $(window).height() - 50) {
						that.hideLauncher();
						entered = false;
						$(document).off('mousemove.launcher.elementary');
						that._$launcherOverlay.show();
					}
				});

				that.showLauncher();
				that._$launcherOverlay.hide();
			});

			$.webos.window.setHidePosFn(function (win) {
				return {
					top: $(document).height(),
					left: $(document).width() / 2
				};
			});

			$.w.window.workspace.on('switch.launcher.elementary', function() {
				//On met a jour l'affichage des fenetres
				that.renderLauncher();
			});
		},
		destroyWindowsEvents: function () {
			$(document).off('.launcher.elementary');
			$.w.window.workspace.off('switch.launcher.elementary');
		},
		renderLauncher: function () {
			var that = this, t = this.translations();

			//On recupere les applications favorites
			Webos.Application.listFavorites(function(favorites) {
				//On detecte si c'est le premier rendu
				var isFirstRendering = false;
				if (that._$launcherApps.children().length == 0) {
					isFirstRendering = true;
				}
				
				that._$launcherApps.empty(); //On vide le lanceur

				var windows = $.w.window.workspace.getCurrent().getWindows();

				//Si rien n'est ouvert et qu'il n'y a aucun favori, on cache le lanceur et on s'arrete la
				if (!favorites.length && !windows.length) {
					that.hideLauncher();
					return;
				}

				var generateItemFn = function(data, $currentItem) {
					$item = $('<li></li>').addClass('app').draggable({
						data: (data.app) ? data.app : null,
						dragImage: $('<img />', { src: data.icon.realpath(48) }).css({ height: '48px', width: '48px' })
					});
					if ($currentItem) {
						$currentItem.replaceWith($item);
					}

					if (typeof data.app == 'string') {
						var $newItem = $item;
						Webos.Application.get(data.app, function (app) {
							if (app) {
								$newItem = generateItemFn($.extend({}, data, {
									app: app
								}), $item);
							} else {
								$newItem = generateItemFn($.extend({}, data, {
									app: null
								}), $item);
							}
						});
						return $newItem;
					}

					(function ($item) {
						if ($(data.windows).length) {
							var isActive = false;
							data.windows.each(function() {
								if ($(this).window('is', 'foreground')) {
									isActive = true;
									return false;
								}
							});
							if (isActive) {
								$item.addClass('app-active');
							}

							var eventHandlers = {
								'windowtoforeground.launcher.elementary windowshow.launcher.elementary': function () {
									$item.addClass('app-active');
								},
								'windowtobackground.launcher.elementary windowhide.launcher.elementary': function () {
									$item.removeClass('app-active');
								},
								'windowbadge.launcher.elementary': function () {
									var badgeVal = $(this).window('option', 'badge');

									if (badgeVal) {
										$item.find('.app-badge').text(badgeVal);
									} else {
										$item.find('.app-badge').empty();
									}
								},
								'windowloadingstart.launcher.elementary': function (e, data) {
									$item.find('.app-progressbar').addClass('progressbar-undefined');
								},
								'windowloadingstop.launcher.elementary': function (e, data) {
									$item.find('.app-progressbar').removeClass('progressbar-undefined');
								},
								'windowprogress.launcher.elementary': function (e, data) {
									if (data.value == 100) {

									} else {

									}
								}
							};

							for (var eventName in eventHandlers) {
								data.windows.off(eventName).on(eventName, eventHandlers[eventName]);
							}

							$item.click(function() {
								//if (appWindow.window('workspace').id() != $.w.window.workspace.getCurrent().id()) {
								//	$.w.window.workspace.switchTo(appWindow.window('workspace').id());
								//}

								var isShown = false, isForeground = false;
								data.windows.each(function () {
									if ($(this).window('is', 'foreground')) {
										isForeground = true;
										if ($(this).window('is', 'visible')) {
											isShown = true;
											return false;
										}
									}
								});

								if (isShown) {
									data.windows.window('hide');
								} else {
									data.windows.window('show');
									if (!isForeground) {
										data.windows.window('toForeground');
									}
								}
							});
						} else {
							$item.click(function() {
								W.Cmd.execute(data.app.get('command'));
							});
						}
					})($item);

					$('<img />', {
						src: data.icon.realpath(48),
						alt: data.title,
						'class': 'app-icon'
					}).appendTo($item);

					if ($(data.windows).length) {
						var indicators = '<div class="app-indicators"><span class="app-indicators-inner">';
						for (var i = 0; i < data.windows.length; i++) {
							indicators += '<span class="window-indicator"></span>';
						}
						indicators += '</span></div>';
						$item.append(indicators);

						var badgeVal = $(data.windows).window('option', 'badge');
						var badge = '<div class="app-badge">';
						if (badgeVal) {
							badge += badgeVal;
						}
						badge += '</div>';
						$item.append(badge);

						var progressBar = '<div class="app-progressbar"><div class="progressbar-inner" style="width:30%;"></div></div>';
						$item.append(progressBar);
					}

					$item.append('<div class="app-title"><span class="app-title-inner">'+data.title+'</span></div>');

					//Context menu
					if (data.app) {
						var contextmenu = $.w.contextMenu($item);
						$.webos.menuItem(t.get('New window')).click(function() {
							W.Cmd.execute(data.app.get('command'));
						}).appendTo(contextmenu);
						if (data.app.get('favorite') !== false) {
							$.webos.menuItem(t.get('Remove from favorites'), true).click(function() {
								that.removeFavorite(data.app);
							}).appendTo(contextmenu);
						} else {
							$.webos.menuItem(t.get('Add to favorites'), true).click(function() {
								that.addFavorite(data.app);
							}).appendTo(contextmenu);
						}
					}

					return $item;
				};

				var alreadyShownWindows = []; //Fenetres affichees dans les favoris
				for (var i = 0; i < favorites.length; i++) {
					(function(i, app) {
						//On detecte les fenetres correspondant au favori
						var appWindows = $();
						if (that._fullCmds2Windows[app.get('command')]) {
							appWindows = that._fullCmds2Windows[app.get('command')];
						} else if (that._cmds2Windows[app.get('command')]) {
							appWindows = that._cmds2Windows[app.get('command')];
						}

						var $item = generateItemFn({
							icon: new W.Icon(app.get('icon'), 48),
							app: app,
							title: app.get('title'),
							windows: appWindows
						}).appendTo(that._$launcherApps);

						appWindows.each(function () {
							alreadyShownWindows.push($(this).window('id'));
						});
					})(i, favorites[i]);
				}

				//Maintenant, on traite le reste des fenetres
				var alreadyShownApps = {};
				for (var i = 0; i < windows.length; i++) {
					(function(i, thisWindow) {
						//Si la fenetre a deja ete traitee, on passe
						if ($.inArray(thisWindow.window('id'), alreadyShownWindows) != -1) {
							return;
						}

						//Si c'est une fenetre fille, on passe
						if (typeof thisWindow.window('option', 'parentWindow') != 'undefined' &&
							thisWindow.window('option', 'parentWindow').length != 0) {
							return;
						}

						//Detect apps corresponding to this window
						var windowApp;
						for (var appCmd in that._fullCmds2Windows) {
							that._fullCmds2Windows[appCmd].each(function () {
								if (thisWindow.window('id') === $(this).window('id')) {
									windowApp = appCmd;
									return false;
								}
							});

							if (windowApp) {
								break;
							}
						}
						if (!windowApp) {
							for (var appCmd in that._cmds2Windows) {
								that._cmds2Windows[appCmd].each(function () {
									if (thisWindow.window('id') === $(this).window('id')) {
										windowApp = appCmd;
										return false;
									}
								});

								if (windowApp) {
									break;
								}
							}
						}

						if (windowApp && alreadyShownApps[windowApp]) {
							var item = alreadyShownApps[windowApp];

							item.data.windows = item.data.windows.add(thisWindow);
							item.$item = generateItemFn(item.data, item.$item);

							alreadyShownApps[windowApp] = item;
							return;
						}

						var itemData = {
							icon: thisWindow.window('option', 'icon'),
							title: thisWindow.window('option', 'title'),
							windows: thisWindow,
							app: windowApp
						};

						//Sinon, on affiche l'icone
						var $item = generateItemFn(itemData).appendTo(that._$launcherApps);

						if (windowApp) {
							alreadyShownApps[windowApp] = {
								data: itemData,
								$item: $item
							};
						}
					})(i, windows[i]);
				}

				if (!that._maximizedWindow) {
					that.showLauncher();
				}
			});
		},
		launcherVisible: function () {
			return !this._$launcher.is('.launcher-hidden');
		},
		showLauncher: function () {
			this._$launcher.removeClass('launcher-hidden');
		},
		hideLauncher: function () {
			this._$launcher.addClass('launcher-hidden');
		},
		addFavorite: function (app) {
			var that = this, t = this.translations();
			
			Webos.Application.listFavorites(function(favorites) {
				app.set('favorite', favorites.length + 1);
				app.sync([function() {
					that.renderLauncher();
				}, function(response) {
					response.triggerError(t.get('Cannot add "${app}" to favorites', { 'app': app.get('title') }));
				}]);
			});
		},
		removeFavorite: function (app) {
			var that = this, t = this.translations();
			
			app.set('favorite', 0);
			app.sync([function() {
				that.renderLauncher();
			}, function(response) {
				response.triggerError(t.get('Cannot remove "${app}" from favorites', { 'app': app.get('title') }));
			}]);
		},
		_displayApps: function (list) {
			var that = this, t = this.translations();

			var $view = this._$apps.find('.apps-view-'+this.appsView());

			var categoryName = null;
			var renderItem = function (app) {
				if (typeof app.get('hidden') != 'undefined' && parseInt(app.get('hidden')) == 1) {
					return;
				}

				if (typeof app.get('menu') != 'undefined' && app.get('menu') == 'places') {
					return;
				}

				var item = $('<li></li>', { title: app.get('description') }).draggable({
					data: app,
					dragImage: $('<img />', { src: new W.Icon(app.get('icon'), 48) }).css({ height: '48px', width: '48px' })
				});

				item.click(function() {
					that.closeApps();
					W.Cmd.execute(app.get('command'));
				});
				
				var img = $.w.icon(app.get('icon'), 48)
					.icon('option', { animate: true })
					.addClass('app-icon')
					.appendTo(item);
				$('<div></div>', { 'class': 'app-title' })
					.html(app.get('title'))
					.appendTo(item);
				$('<div></div>', { 'class': 'app-description' })
					.html(app.get('description'))
					.appendTo(item);

				var contextmenu = $.w.contextMenu(item);
				if (app.get('favorite') !== false) {
					$.webos.menuItem(t.get('Remove from favorites'), true).click(function() {
						that.removeFavorite(app);
					}).appendTo(contextmenu);
				} else {
					$.webos.menuItem(t.get('Add to favorites'), true).click(function() {
						that.addFavorite(app);
					}).appendTo(contextmenu);
				}

				if (app.get('category')) {
					if (categoryName === null) {
						categoryName = app.get('category');
					} else if (categoryName != app.get('category')) {
						categoryName = false;
					}
				}

				return item;
			};

			var $applications = $view.find('.apps-list');

			$applications.empty();
			for (var key in list) {
				(function(key, app) {
					var $item = renderItem(app);

					if (!$item) {
						return;
					}

					$item.appendTo($applications);
				})(key, list[key]);
			}

			var $categories = $view.find('.apps-categories');
			if ($categories.length) {
				$categories.empty();
				Webos.Application.categories(function (categories) {
					for (var key in categories) {
						(function(key, catData) {
							var $item = $('<li></li>', { title: catData.description }).html(catData.title);

							if (catData.name === categoryName) {
								$item.addClass('category-active');
							} else {
								$item.click(function() {
									that.renderAppsByCategory(catData.name);
								});
							}

							$item.appendTo($categories);
						})(key, categories[key]);
					}
				});
			}
		},
		renderApps: function () {
			var that = this;

			switch (this.appsView()) {
				case 'filter':
					Webos.Application.categories(function (categories) {
						for (var key in categories) {
							var catData = categories[key];
							that.renderAppsByCategory(catData.name);
							break;
						}
					});
					break;
				case 'grid':
				default:
					this.renderAllApps();
					break;
			}
		},
		renderAllApps: function () {
			var that = this;

			Webos.Application.list(function(apps) {
				that._displayApps(apps);
			});
		},
		renderAppsByCategory: function (category) {
			var that = this;

			Webos.Application.listByCategory(category, function(apps) {
				that._displayApps(apps);
			});
		},
		renderAppsSearch: function (searchQuery) {
			var that = this;

			Webos.Application.listBySearch(searchQuery, function(apps) {
				that._displayApps(apps);
			});
		},
		launchFirstApp: function () {
			var $view = this._$apps.find('.apps-view-'+this.appsView());
			var $apps = $view.find('.apps-list');

			$apps.children().first().click();
		},
		appsView: function () {
			return this._appsView;
		},
		switchAppsView: function (newViewName) {
			if (this.appsView() == newViewName) {
				return;
			}

			var $view = this._$apps.find('.apps-view-'+newViewName);

			if (!$view.length) {
				return false;
			}

			var $appsViewBtns = this._$appsViewBtns;
			$appsViewBtns.children().removeClass('active');
			$appsViewBtns.find('.apps-view-'+newViewName+'-btn').addClass('active');

			this._$apps.find('.apps-view').hide();
			$view.show();

			this._appsView = newViewName;
			this.renderApps();
		},
		openApps: function () {
			var that = this;
			var $apps = this._$apps;

			if (this._$searchEntry.val().length) {
				this._$searchEntry.val('');
				this.switchAppsView('grid');
			}

			$apps.css({
				opacity: 0,
				scale: 0.9,
				display: 'block'
			}).animate({
				opacity: 1,
				scale: 1
			}, 'fast');

			this._$searchEntry.focus();

			//setTimeout() required, otherwise a click is triggered
			//(the one which opens apps list)
			setTimeout(function () {
				$(document).on('click.apps.elementary', function (e) {
					if ($(e.target).parents().length != 0 && $(e.target).parents().add(e.target).filter($apps).length == 0) {
						that.closeApps();
					} else {
						that._$searchEntry.focus();
					}
				});
				that.once('closeapps', function () {
					$(document).off('click.apps.elementary');
				});
			}, 0);

			this.trigger('openapps');
		},
		closeApps: function () {
			var that = this;
			var $apps = this._$apps;

			$apps.animate({
				opacity: 0,
				scale: 0.9
			}, 'fast', function () {
				$(this).hide();

				that.trigger('closeapps');
			});
		},
		appsOpened: function () {
			return this._$apps.is(':visible');
		},
		toggleApps: function () {
			if (this.appsOpened()) {
				this.closeApps();
			} else {
				this.openApps();
			}
		},
		initApps: function () {
			var that = this;
			var $appsBtn = this._$appsBtn;

			$appsBtn.click(function (e) {
				that.toggleApps();
				e.preventDefault();
			});

			var $appsViewBtns = this._$appsViewBtns;
			$appsViewBtns.find('.apps-view-grid-btn').click(function () {
				that.switchAppsView('grid');
			});
			$appsViewBtns.find('.apps-view-filter-btn').click(function () {
				that.switchAppsView('filter');
			});

			that._$searchEntry.keydown(function (e) {
				if (e.keyCode == 13) {
					that.launchFirstApp();
				}
			}).keyup(function (e) {
				if (e.keyCode == 27) {
					$(this).val('');
					that.switchAppsView('grid');
				} else if ($(this).val().length) {
					that.switchAppsView('search');
					that.renderAppsSearch($(this).val());
				}
			});

			this.renderApps();
		},
		initCalendar: function () {
			var $calendar = this._$calendar;
			var $dateBox = $calendar.find('a');
			var showTime = function() {
				var locale = Webos.Locale.current();
				
				var theDate = locale.dateAbbreviation(new Date()) + ', ' + locale.time(new Date());
				
				$dateBox.html(theDate);
			};
			
			setTimeout(function() { //Quand la minute actuelle est passee
				setInterval(function() { //On rafraichit l'heure toutes les minutes
					showTime();
				}, 60000);
				
				showTime();
			}, (60 - new Date().getSeconds()) * 1000);
			
			Webos.Locale.bind('change', function() { //Lors du changement des preferences de localisation, on rafraichit l'heure
				showTime();
			});
			
			showTime(); //On affiche l'heure
		},
		_renderMeMenu: function (user) {
			var that = this, t = this.translations();
			var $memenu = this._$memenu,
				$submenu = $memenu.find('ul'),
				$username = $memenu.find('.memenu-username');

			$submenu.empty();

			var realname = t.get('Guest');
			if (user) {
				realname = user.get('realname');
				user.on('update.memenu.elementary', function(data) {
					if (data.key == 'realname') {
						that.renderMeMenu();
					}
				});

				$('<li>'+t.get('System settings')+'</li>').click(function() {
					W.Cmd.execute('gconf');
				}).appendTo($submenu);
			} else {
				if (!Webos.standalone) {
					$('<li>'+t.get('Login...')+'</li>').click(function() {
						W.Cmd.execute('gnome-login');
					}).appendTo($submenu);

					var registerMenuItem = $('<li>'+t.get('Register')+'</li>').click(function() {
						W.Cmd.execute('gnome-register');
					}).hide().appendTo($submenu);
					$('<li></li>', { 'class': 'separator' }).appendTo($submenu);
					
					Webos.User.canRegister(function(registerSettings) {
						var notificationsButtons = [
							$.w.button(t.get('Register')).click(function() { W.Cmd.execute('gnome-register'); }),
							$.w.button(t.get('Login...')).click(function() { W.Cmd.execute('gnome-login'); })
						];
						if (registerSettings.register) {
							registerMenuItem.show();
						} else {
							notificationsButtons = [notificationsButtons[1]];
						}
						
						/*$.w.notification({
							title: t.get('Welcome to ${webos} !', { webos: Webos.name }),
							message: t.get('To access your documents please login.'),
							icon: '/usr/share/images/distributor/logo-48.png',
							widgets: notificationsButtons
						});*/
					});
				}
			}

			if (Webos.fullscreen.support) {
				var toggleFullScreenItem = $('<li></li>');
				
				var updateFullScreenItemFn = function() {
					if (Webos.fullscreen.isFullScreen()) {
						toggleFullScreenItem.html(t.get('Exit fullscreen mode'));
					} else {
						toggleFullScreenItem.html(t.get('Enter fullscreen mode'));
					}
				};
				
				toggleFullScreenItem.click(function() {
					if (Webos.fullscreen.isFullScreen()) {
						Webos.fullscreen.cancel();
					} else {
						$('body').requestFullScreen();
					}
					updateFullScreenItemFn();
				}).appendTo($submenu);

				$('<li></li>', { 'class': 'separator' }).appendTo($submenu);

				$(document).bind(Webos.fullscreen.eventName, function() {
					updateFullScreenItemFn();
				});

				updateFullScreenItemFn();
			}

			if (typeof user != 'undefined') {
				$('<li>'+t.get('Lock')+'</li>').click(function() {
					W.Cmd.execute('gnome-screensaver -l');
				}).appendTo($submenu);
				$('<li>'+t.get('Logout...')+'</li>').click(function() {
					W.Cmd.execute('gnome-logout');
				}).appendTo($submenu);
			} else {
				$('<li>'+t.get('Lock')+'</li>').click(function() {
					W.Cmd.execute('gnome-screensaver -l');
				}).appendTo($submenu);
				$('<li>'+t.get('Restart')+'</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo($submenu);
			}

			$username.text(realname);
		},
		renderMeMenu: function () {
			var that = this;

			W.User.get([function(user) {
				that._renderMeMenu(user);
			}, function() {}]);
		},
		initMeMenu: function () {
			var that = this;

			this.renderMeMenu();

			Webos.User.on('login.memenu.elementary logout.memenu.elementary', function(data) {
				that._renderMeMenu(data.user);
			});
		},
		destroyMeMenu: function () {
			Webos.User.off('login.memenu.elementary logout.memenu.elementary');
		},
		_init: function () {
			var that = this;

			this.initWindowsEvents();
			this.initCalendar();

			Webos.Translation.load(function(t) {
				that._translations = t;

				that.initMeMenu();
			}, 'elementary');

			Webos.UserInterface.Booter.once('switch', function () {
				that.destroy();
			});
		},
		init: function () {
			var that = this;

			Webos.Translation.load(function(t) {
				that._translations = t;

				that.initApps();
				that.renderLauncher();

				Webos.Theme.on('load.elementary', function() {
					that.renderLauncher();
					that.renderApps();
				});

				Webos.Application.on('reload.elementary', function () {
					that.renderLauncher();
					that.renderApps();
				});

				that.trigger('ready');
			}, 'elementary');
		},
		destroy: function () {
			this.destroyWindowsEvents();
			this.destroyMeMenu();

			Webos.Theme.off('load.elementary');
			Webos.Application.off('reload.elementary');

			this.trigger('destroy');
			delete window.Elementary;
		}
	};

	Webos.Observable.build(Elementary);

	Elementary._init();
});
