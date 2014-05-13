var booter = Webos.UserInterface.Booter.current();

//On empeche de faire defiler la page
$(document).scroll(function() {
	$('body').scrollTop(0);
});

var rootEl = Webos.UserInterface.Booter.current().element();
rootEl.scroll(function () { //Prevent from scrolling
	if (rootEl.scrollTop() > 0) {
		rootEl.scrollTop(0);
	}
});

var loadThemeFn = function() { //Chargement du theme
	Webos.require('/usr/lib/webos/theme.js', function () {
		Webos.Theme.get([function(theme) {
			theme.load();
		}, function(response) {
			response.triggerError('Impossible de r&eacute;cup&eacute;rer les pr&eacute;f&eacute;rences d\'affichage');
		}]);
	});
};

Webos.User.on('login.ini.gnome logout.ini.gnome', function() {
	loadThemeFn();
});

loadThemeFn();

var saveSession = function() {
	Webos.Compiz.Reviver.save([function() {}, function() {}]);
};
var reviveSession = function() {
	Webos.Compiz.Reviver.revive([function() {}, function() {}]);
};
Webos.User.on('beforelogout.ini.gnome', function() {
	saveSession();
});
Webos.User.on('login.ini.gnome', function() {
	if (!$.webos.window.getWindows().length) { //Si aucune fenetre n'est ouverte
		reviveSession();
	}
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
			Webos.require({
				path: '/usr/lib/nautilus/widgets.js',
				forceExec: true
			}, function() {
				var nautilusDesktopFiles = $.w.nautilus({
					multipleWindows: true,
					directory: t.get('~/Desktop'),
					organizeIcons: true
				});

				nautilusDesktopFiles.one('nautilusreadcomplete', function() {
					if (typeof resizeDesktopFn == 'function') {
						resizeDesktopFn();
					}
				}).one('nautilusreaderror', function(e, data) {
					data.response.logError();
					return false;
				});

				desktopFiles.replaceWith(nautilusDesktopFiles);
				desktopFiles = nautilusDesktopFiles;
			});

			GnomeScreenSaver.loadConfig();
		}

		Webos.ConfigFile.loadUserConfig('~/.config/exiting.xml', null, [function(configFile) {
			if (configFile.get('askOnExit') == 1) {
				$(window).bind('beforeunload', function() {
					return t.get('Are you sure you want to leave the webos ?');
				});
			}
		}, function() {}]);
	};

	Webos.User.bind('login.ini.gnome logout.ini.gnome', function(data) {
		loadDesktopFn(data.user);
	});

	Webos.User.getLogged([function(user) {
		loadDesktopFn(user);
	}, function() {}]);

	reviveSession();
}, 'gnome-shell');

booter.once('unload', function () {
	Webos.User.off('login.ini.gnome beforelogout.ini.gnome logout.ini.gnome');
});