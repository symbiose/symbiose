/**
 * Webos.Dashboard.Applet.GnomeShellMeMenu represente le menu utilisateur de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.GnomeShellMeMenu = function WGnomeShellMeMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);
	
	var menu = $('<li></li>').attr('id','memenu').appendTo(content);
	var userBox = $('<a></a>', { href: '#' }).html('Utilisateur').appendTo(menu);
	var userMenu = $('<ul></ul>').appendTo(menu);
	
	var callback = new W.Callback(function(user) {
		var realname = 'Invité';
		if (typeof user != 'undefined') {
			realname = user.get('realname');
			user.bind('update', function(data) {
				if (data.key == 'realname') {
					userBox.text(data.value);
				}
			});
			
			$('<li>Param&egrave;tres syst&egrave;me</li>').click(function() {
				W.Cmd.execute('gconf');
			}).appendTo(userMenu);
			
			if (Webos.fullscreen.support) {
				$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
				
				var toggleFullScreenItem = $('<li></li>');
				
				var updateFullScreenItemFn = function() {
					if (Webos.fullscreen.isFullScreen()) {
						toggleFullScreenItem.html('Quitter le mode plein &eacute;cran');
					} else {
						toggleFullScreenItem.html('Activer le mode plein &eacute;cran');
					}
				};
				
				toggleFullScreenItem.click(function() {
					if (Webos.fullscreen.isFullScreen()) {
						Webos.fullscreen.cancel();
					} else {
						$('body').requestFullScreen();
					}
					updateFullScreenItemFn();
				}).appendTo(userMenu);
				
				$(document).bind(Webos.fullscreen.eventName, function() {
					updateFullScreenItemFn();
				});
				
				updateFullScreenItemFn();
			}
			
			$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
			$('<li>Fermer la session...</li>').click(function() {
				W.Cmd.execute('gnome-logout');
			}).appendTo(userMenu);
			$('<li>Red&eacute;marrer</li>').click(function() {
				W.Cmd.execute('gnome-reboot');
			}).appendTo(userMenu);
		} else {
			$('<li>Me connecter...</li>').click(function() {
				W.Cmd.execute('gnome-login');
			}).appendTo(userMenu);
			var registerMenuItem = $('<li>M\'inscrire</li>').click(function() {
				W.Cmd.execute('gnome-register');
			}).hide().appendTo(userMenu);
			$('<li>Red&eacute;marrer</li>').click(function() {
				W.Cmd.execute('gnome-reboot');
			}).appendTo(userMenu);
			
			Webos.User.canRegister(function(canRegister) {
				var notificationsButtons = [$.w.button('M\'inscrire').click(function() { W.Cmd.execute('gnome-register'); }),
				                            $.w.button('Me connecter').click(function() { W.Cmd.execute('gnome-login'); })];
				if (canRegister) {
					registerMenuItem.show();
				} else {
					notificationsButtons = [notificationsButtons[1]];
				}
				
				$.w.notification({
					title: 'Bienvenue sur Symbiose !',
					message: 'Si vous souhaitez acc&eacute;der &agrave; vos documents, veuillez vous connecter.',
					icon: '/usr/share/images/distributor/logo-48.png',
					widgets: notificationsButtons
				});
			});
		}
		userBox.text(realname);
	}, function() {});

	W.User.get(callback);
};