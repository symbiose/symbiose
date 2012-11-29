/**
 * Webos.Dashboard.Applet.GnomeShellMeMenu represente le menu utilisateur de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.GnomeShellMeMenu = function WGnomeShellMeMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var that = this;

	var content = $('<ul></ul>', { 'class': 'menu' });
	that.content.append(content);
	var menu = $('<li></li>').attr('class','memenu').appendTo(content);
	var userItem = $('<a></a>', { href: '#' }).appendTo(menu);
	$('<img src="'+new W.Icon('status/avatar-default-symbolic').realpath(16)+'" class="icon" style="margin-right: 3px;"/>').appendTo(userItem);
	var userBox = $('<span></span>').html('User').appendTo(userItem);
	var userMenu = $('<ul></ul>').appendTo(menu);

	var firstRun = true;
	Webos.Translation.load(function(t) {
		userBox.html(t.get('User'));

		var generateMenu = function(user) {
			userMenu.empty();
			
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
			} else {
				$('<li>'+t.get('Login...')+'</li>').click(function() {
					W.Cmd.execute('gnome-login');
				}).appendTo(userMenu);
				var registerMenuItem = $('<li>'+t.get('Register')+'</li>').click(function() {
					W.Cmd.execute('gnome-register');
				}).hide().appendTo(userMenu);
				
				Webos.User.canRegister(function(canRegister) {
					var notificationsButtons = [
						$.w.button(t.get('Register')).click(function() { W.Cmd.execute('gnome-register'); }),
						$.w.button(t.get('Login...')).click(function() { W.Cmd.execute('gnome-login'); })
					];
					if (canRegister) {
						registerMenuItem.show();
					} else {
						notificationsButtons = [notificationsButtons[1]];
					}
					
					$.w.notification({
						title: t.get('Welcome to ${webos} !', { webos: Webos.name }),
						message: t.get('To access your documents please login.'),
						icon: '/usr/share/images/distributor/logo-48.png',
						widgets: notificationsButtons
					});
				});
			}

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

			if (typeof user != 'undefined') {
				$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
				$('<li>'+t.get('Lock')+'</li>').click(function() {
					W.Cmd.execute('gnome-screensaver -l');
				}).appendTo(userMenu);
				$('<li>'+t.get('Logout...')+'</li>').click(function() {
					W.Cmd.execute('gnome-logout');
				}).appendTo(userMenu);
				$('<li>'+t.get('Restart')+'</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
			} else {
				$('<li></li>', { 'class': 'separator' }).appendTo(userMenu);
				$('<li>'+t.get('Lock')+'</li>').click(function() {
					W.Cmd.execute('gnome-screensaver -l');
				}).appendTo(userMenu);
				$('<li>'+t.get('Restart')+'</li>').click(function() {
					W.Cmd.execute('gnome-reboot');
				}).appendTo(userMenu);
			}

			if (!firstRun) {
				userBox.animate({
					opacity: 0
				}, 'normal', function() {
					userBox.text(realname);
					userBox.animate({
						opacity: 1
					});
				});
			} else {
				userBox.text(realname);
				firstRun = false;
			}
		};

		W.User.get(new W.Callback(function(user) {
			generateMenu(user);
		}, function() {}));

		Webos.User.bind('login logout', function(data) {
			generateMenu(data.user);
		});
	}, 'gnome-shell');
};