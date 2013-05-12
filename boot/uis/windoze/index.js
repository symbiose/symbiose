W.UserInterface.Booter.current().disableAutoLoad();

//On definit la hauteur du bureau
var resizeDesktopFn = function() {
	$('#desktop').height($(window).height() - $('#taskbar').height());
};
$(window).resize(resizeDesktopFn);
resizeDesktopFn();

//On empeche de faire defiler la page
$(document).scroll(function() {
	$('body').scrollTop(0);
});

var loadThemeFn = function() {
	//Chargement du theme
	W.Theme.get([function(theme) {
		theme.load(function() {
			var bgRule = 'url("'+W.File.get(theme.get('background')).get('realpath')+'") no-repeat fixed center center / cover';

			var windowCss = '.webos-window {', bgWindowCss = '.webos-window:not(.bg-window) {';
			var vendorPrefixes = ['-moz-', '-webkit-', ''];
			for (var i = 0; i < vendorPrefixes.length; i++) {
				var vendorPrefix = vendorPrefixes[i];

				windowCss += 'background: '+vendorPrefix+'linear-gradien(top, rgba(160,160,160,0.4) 0%, rgba(160,160,160,0.4) 100%), '+bgRule+';';
				bgWindowCss += 'background: '+vendorPrefix+'linear-gradient(top, rgba(180,180,180,0.4) 0%, rgba(180,180,180,0.4) 100%), '+bgRule+';';
			}

			windowCss += '}';
			bgWindowCss += '}';

			Webos.Stylesheet.insertCss(windowCss, '#'+W.UserInterface.Booter.current().element().attr('id'));
			Webos.Stylesheet.insertCss(bgWindowCss, '#'+W.UserInterface.Booter.current().element().attr('id'));
		});
	}, function(response) {
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les pr&eacute;f&eacute;rences d\'affichage');
	}]);
};

Webos.User.bind('login logout', function() {
	loadThemeFn();
});

loadThemeFn();

var saveSession = function() {
	Webos.Compiz.Reviver.save([function() {}, function() {}]);
};
var reviveSession = function() {
	Webos.Compiz.Reviver.revive([function() {}, function() {}]);
};
Webos.User.bind('beforelogout', function() {
	saveSession();
});
Webos.User.bind('login', function() {
	if (!$.webos.window.getWindows().length) { //Si aucune fenetre n'est ouverte
		reviveSession();
	}
});


var $start = $('#start');
var $startmenu = $('#startmenu');
var $startmenuContents = $('#startmenu_content');
var $startmenuSearchterm = $('#startmenu_searchterm');
var $startmenuLinks = $('#startmenu_links');

var $programList = $('#programlist');
var programs = {};

var onWindowOpen = function(thisWindow) {
	if (thisWindow.window('option', 'parentWindow').length > 0) {
		return;
	}
	
	var $program = $('<span></span>', { 'class': 'program' })
		.click(function() {
			thisWindow.window('hideOrShowOrToForeground');
		})
		.append(
			$('<img />', { src: thisWindow.window('option', 'icon').realpath(32), alt: 'icon' })
		);
	
	programs[thisWindow.window('id')] = $program;
	
	$program.hide().appendTo($programList).fadeIn('fast');
};

$(document).bind('windowopen', function(e, data) {
	onWindowOpen($(data.window));
}).bind('windowtoforeground', function(e, data) {
	var thisWindow = $(data.window);
	
	if (programs[thisWindow.window('id')]) {
		programs[thisWindow.window('id')].addClass('active');
	} else if (thisWindow.window('option', 'parentWindow').length > 0) {
		programs[thisWindow.window('option', 'parentWindow').window('id')].addClass('active');
	}
}).bind('windowtobackground', function(e, data) {
	var thisWindow = $(data.window);
	
	if (programs[thisWindow.window('id')]) {
		programs[thisWindow.window('id')].removeClass('active');
	} else if (thisWindow.window('option', 'parentWindow').length > 0) {
		programs[thisWindow.window('option', 'parentWindow').window('id')].removeClass('active');
	}
}).bind('windowclose', function(e, data) {
	var thisWindow = $(data.window);
	
	if (programs[thisWindow.window('id')]) {
		programs[thisWindow.window('id')].remove();
		delete programs[thisWindow.window('id')];
	}
});

$.webos.window.setHidePosFn(function(thisWindow) {
	if (programs[thisWindow.window('id')]) {
		return programs[thisWindow.window('id')].offset();
	}
});

var $openedWindows = $.webos.window.getWindows();
if ($openedWindows.length) {
	$openedWindows.each(function() {
		onWindowOpen($(this));
	});
}

// Clock
var showTime = function() {
	var locale = Webos.Locale.current();
	
	var theDate = locale.time(new Date()) + '<br />' + locale.dateAbbreviation(new Date());
	
	$('#clock').html(theDate);
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

//Desktop button
$('#showdesktop').click(function() {
	var $list = $.webos.window.getWindows();
	$list.each(function() {
		if (!$(this).window('is', 'hidden')) {
			$(this).window('hide');
		} else {
			$(this).window('show');
		}
	});
});

Webos.Translation.load(function(t) {
	var desktopFiles = $('#desktop-files');
	var loadDesktopFn = function(user) {
		//Si l'utilisateur n'est pas connecte, on n'affiche pas son bureau
		if (!user) {
			emptyDesktopFiles = $('<div id="desktop-files"></div>');
			desktopFiles.replaceWith(emptyDesktopFiles);
			desktopFiles = emptyDesktopFiles;
		} else {
			//On charge le contenu du bureau
			Webos.require('/usr/lib/nautilus/widgets.js', function() {
				var nautilusDesktopFiles = $.w.nautilus({
					multipleWindows: true,
					directory: t.get('~/Desktop')
				});

				nautilusDesktopFiles.one('nautilusreadcomplete', function() {
					resizeDesktopFn();
				}).one('nautilusreaderror', function(e, data) {
					data.response.logError();
					return false;
				});;

				desktopFiles.replaceWith(nautilusDesktopFiles);
				desktopFiles = nautilusDesktopFiles;
			});
		}
	};

	Webos.User.bind('login logout', function(data) {
		loadDesktopFn(data.user);
	});

	Webos.User.getLogged([function(user) {
		loadDesktopFn(user);
	}, function() {}]);

	Webos.ConfigFile.loadUserConfig('~/.config/exiting.xml', null, [function(configFile) {
		if (configFile.get('askOnExit') == 1) {
			$(window).bind('beforeunload', function() {
				return t.get('Are you sure you want to leave the webos ?');
			});
		}
	}, function() {}]);

	reviveSession();

	//GnomeScreenSaver.loadConfig();

	// Startmenu
	var showStartMenu = function() {
		$start.addClass('active');
		$startmenu.show();
		$startmenuSearchterm.focus();
	};
	var hideStartMenu = function() {
		$start.removeClass('active');
		$startmenu.hide();
		$startmenuSearchterm.val('').trigger('keyup');
	};

	$start.click(function () {
		if ($(this).hasClass("active")) {
			hideStartMenu();
		} else {
			showStartMenu();
		};
	});

	Webos.require('/usr/lib/webos/applications.js', function() {
		Webos.Application.list(function(apps) {
			var displayApps = function(apps) {
				$startmenuContents.empty();

				var $applications = $('<ul></ul>');
				for (var key in apps) {
					(function(key, app) {
						if (typeof app.get('menu') != 'undefined' && app.get('menu') == 'places') {
							return;
						}
						
						var item = $('<li></li>');
						var contents = $('<a></a>', { title: app.get('description') }).appendTo(item);
						
						item.click(function() {
							hideStartMenu();
							W.Cmd.execute(app.get('command'));
						});
						
						var img = $.w.image(new W.Icon(app.get('icon'), 32), app.get('title')).appendTo(contents);
						img.image('option', 'loadHidden', false);
						$('<span></span>', { 'class': 'title' }).html(app.get('title')).appendTo(contents);

						item.appendTo($applications);
					})(key, apps[key]);
				}

				$applications.appendTo($startmenuContents);
			};

			displayApps(apps);

			$startmenuSearchterm.keyup(function() {
				var searchTerm = $(this).val();

				Webos.Application.listBySearch(searchTerm, function(apps) {
					displayApps(apps);
				}, apps);
			}).attr('placeholder', t.get('Search applications...'));
		});
	});

	var startmenuLinks = [
		{
			title: t.get('User'),
			setup: function(item) {
				$username = $(item).children('span');

				var generateStartmenuUserBtn = function(user) {
					$username.empty();

					if (typeof user != 'undefined') {
						var realname = t.get('Invité');
						if (typeof user != 'undefined') {
							realname = user.get('realname');
						}
						$username.text(realname);
					} else {
						$username.text(t.get('Guest'));
					}
				};

				W.User.get(new W.Callback(function(user) {
					generateStartmenuUserBtn(user);
				}, function() {}));

				Webos.User.bind('login logout', function(data) {
					generateStartmenuUserBtn(data.user);
				});
			},
			click: function() {
				W.User.get(new W.Callback(function(user) {
					if (user) {
						Webos.Cmd.execute('nautilus ~');
					} else {
						Webos.Cmd.execute('gnome-login');
					}
				}, function() {}));
			}
		},
		{
			title: t.get('Documents'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('nautilus ~/'+t.get('Documents'));
			}
		},
		{
			title: t.get('Pictures'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('nautilus ~/'+t.get('Pictures'));
			}
		},
		{
			title: t.get('Music'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('nautilus ~/'+t.get('Music'));
			}
		},
		{
			title: t.get('Videos'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('nautilus ~/'+t.get('Videos'));
			}
		},
		{
			title: t.get('System settings'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('gconf');
			}
		},
		{
			title: t.get('Login...'),
			onlyShowToGuests: true,
			click: function() {
				Webos.Cmd.execute('gnome-login');
			}
		},
		{
			title: t.get('Register'),
			onlyShowToGuests: true,
			click: function() {
				Webos.Cmd.execute('gnome-register');
			}
		},
		{
			title: t.get('Logout...'),
			onlyShowToUsers: true,
			click: function() {
				Webos.Cmd.execute('gnome-logout');
			}
		},
		{
			title: t.get('Restart'),
			click: function() {
				Webos.Cmd.execute('gnome-reboot');
			}
		}
	];

	$startmenuLinksItems = $();
	for (var i = 0; i < startmenuLinks.length; i++) {
		(function(item) {
			var $item = $('<li><a href="#"><span>'+item.title+'</span></a></li>');

			if (typeof item.setup == 'function') {
				item.setup.call(item, $item.children('a')[0]);
			}

			$item.children('a').click(function(e) {
				if (typeof item.click == 'function') {
					item.click.call(item, this, e);
				}

				hideStartMenu();

				e.preventDefault();
			});

			if (item.onlyShowToUsers || item.onlyShowToGuests) {
				var updateItem = function(user) {
					if (item.onlyShowToUsers) {
						if (user) {
							$item.show();
						} else {
							$item.hide();
						}
					}
					if (item.onlyShowToGuests) {
						if (user) {
							$item.hide();
						} else {
							$item.show();
						}
					}
				};

				W.User.get(new W.Callback(function(user) {
					updateItem(user);
				}, function() {}));

				Webos.User.bind('login logout', function(data) {
					updateItem(data.user);
				});
			}

			$startmenuLinksItems = $startmenuLinksItems.add($item);
		})(startmenuLinks[i]);
	}
	$startmenuLinks.html($startmenuLinksItems);
}, 'windoze');


//Notifications
function SIndicator(item) {
	item.appendTo(SIndicator.container);
	
	this.remove = function() {
		item.remove();
	};
}
SIndicator.container = $('#systemtray').hide();

//On definit la fonction de gestion des erreurs
Webos.Error.setErrorHandler(function(error) {
	var errorWindow = $.webos.window({
		title: 'Erreur',
		resizable: false,
		width: 400,
		icon: new W.Icon('status/error')
	});
	
	var message, details;
	if (error instanceof Webos.Error) {
		message = error.html.message;
		details = error.toString();
	} else {
		message = details = error.name + ' : ' + error.message;
	}
	
	var img = $('<img />', { 'src': new W.Icon('status/error'), 'alt': 'erreur' }).css('float', 'left');
	errorWindow.window('content').append(img);
	
	errorWindow.window('content').append('<strong>Une erreur est survenue.</strong><br />'+message);
	
	var spoiler = $.w.spoiler('D&eacute;tails').appendTo(errorWindow.window('content'));
	
	$('<pre></pre>')
		.html(details)
		.css('height','150px')
		.css('overflow','auto')
		.css('background-color','white')
		.css('padding','2px')
		.appendTo(spoiler.spoiler('content'));
	
	var buttonContainer = $.webos.buttonContainer();
	var closeButton = $.webos.button('Fermer');
	closeButton.click(function() {
		errorWindow.window('close');
	});
	buttonContainer.buttonContainer('content').append(closeButton);
	errorWindow.window('content').append(buttonContainer);
	
	errorWindow.window('open');
});

W.ServerCall.one('complete', function() {
	resizeDesktopFn();
	W.UserInterface.Booter.current().finishLoading();
});