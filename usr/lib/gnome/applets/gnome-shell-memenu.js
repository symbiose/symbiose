/**
 * SMeMenuApplet represente le menu utilisateur de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SGnomeShellMeMenuApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);
	
	var menu = $('<li></li>').attr('id','memenu').appendTo(content);
	var userBox = $('<a></a>', { href: '#' }).html('Utilisateur').appendTo(menu);
	var userMenu = $('<ul></ul>').appendTo(menu);
	
	this.content.bind('insert', function() {
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
				
				if (fullScreenApi.supportsFullScreen) {
					$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
					
					var toggleFullScreenItem = $('<li>Activer le mode plein &eacute;cran</li>');
					
					var updateFullScreenItemFn = function() {
						if (fullScreenApi.isFullScreen()) {
							toggleFullScreenItem.html('Quitter le mode plein &eacute;cran');
						} else {
							toggleFullScreenItem.html('Activer le mode plein &eacute;cran');
						}
					};
					
					toggleFullScreenItem.click(function() {
						if (fullScreenApi.isFullScreen()) {
							fullScreenApi.cancelFullScreen();
						} else {
							$('body').requestFullScreen();
						}
						updateFullScreenItemFn();
					}).appendTo(userMenu);
					
					$(document).bind(fullScreenApi.fullScreenEventName, function() {
						updateFullScreenItemFn();
					});
				}
				
				$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
				$('<li>Fermer la session...</li>').click(function() {
					W.Cmd.execute('gnome-logout');
				}).appendTo(userMenu);
				$('<li>Red&eacute;marrer</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
			} else {
				$('<li>Se connecter...</li>').click(function() {
					W.Cmd.execute('gnome-login');
				}).appendTo(userMenu);
				$('<li>Red&eacute;marrer</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
				
				$.w.notification({
					title: 'Bienvenue sur Symbiose !',
					message: 'Si vous souhaitez acc&eacute;der &agrave; vos documents, veuillez vous connecter.',
					icon: '/usr/share/images/distributor/logo-48.png',
					buttons: [$.w.button('Me connecter').click(function() { W.Cmd.execute('gnome-login'); })]
				});
			}
			userBox.text(realname);
		}, function() {});

		W.User.get(callback);
	});
}