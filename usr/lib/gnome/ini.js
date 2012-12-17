//On empeche de faire defiler la page
$(document).scroll(function() {
	$('body').scrollTop(0);
});

var loadThemeFn = function() {
	//Chargement du theme
	W.Theme.get(new W.Callback(function(theme) {
		theme.load();
	}, function(response) {
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les pr&eacute;f&eacute;rences d\'affichage');
	}));
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

	GnomeScreenSaver.loadConfig();
}, 'gnome-shell');

//On initialise les tableaux de bord
Webos.Dashboard.init();