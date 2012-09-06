/**
 * Webos.Dashboard.Applet.GnomeShellMeMenu represente le menu utilisateur de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.GnomeShellMeMenu = function WGnomeShellMeMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var that = this;
	
	Webos.Translation.load(function(t) {
		var content = $('<ul></ul>', { 'class': 'menu' });
		that.content.append(content);
		
		var menu = $('<li></li>').attr('id','memenu').appendTo(content);
		var userBox = $('<a></a>', { href: '#' }).html(t.get('User')).appendTo(menu);
		var userMenu = $('<ul></ul>').appendTo(menu);
		
		var callback = new W.Callback(function(user) {
			var realname = t.get('Guest');
			if (typeof user != 'undefined') {
				realname = user.get('realname');
				user.bind('update', function(data) {
					if (data.key == 'realname') {
						userBox.text(data.value);
					}
				});
				
				$('<li>'+t.get('System settings')+'</li>').click(function() {
					W.Cmd.execute('gconf');
				}).appendTo(userMenu);
				
				if (Webos.fullscreen.support) {
					$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
					
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
					}).appendTo(userMenu);
					
					$(document).bind(Webos.fullscreen.eventName, function() {
						updateFullScreenItemFn();
					});
					
					updateFullScreenItemFn();
				}
				
				$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
				$('<li>'+t.get('Logout...')+'</li>').click(function() {
					W.Cmd.execute('gnome-logout');
				}).appendTo(userMenu);
				$('<li>'+t.get('Reboot')+'</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
			} else {
				$('<li>'+t.get('Login...')+'</li>').click(function() {
					W.Cmd.execute('gnome-login');
				}).appendTo(userMenu);
				var registerMenuItem = $('<li>'+t.get('Register')+'</li>').click(function() {
					W.Cmd.execute('gnome-register');
				}).hide().appendTo(userMenu);
				$('<li>'+t.get('Reboot')+'</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
				
				Webos.User.canRegister(function(canRegister) {
					var notificationsButtons = [$.w.button(t.get('Register')).click(function() { W.Cmd.execute('gnome-register'); }),
					                            $.w.button(t.get('Login...')).click(function() { W.Cmd.execute('gnome-login'); })];
					if (canRegister) {
						registerMenuItem.show();
					} else {
						notificationsButtons = [notificationsButtons[1]];
					}
					
					$.w.notification({
						title: t.get('Welcome to ${webos}', { webos: Webos.name }),
						message: t.get('To access your documents please login.'),
						icon: '/usr/share/images/distributor/logo-48.png',
						widgets: notificationsButtons
					});
				});
			}
			userBox.text(realname);
		}, function() {});
	
		W.User.get(callback);
	}, 'gnome-shell');
};