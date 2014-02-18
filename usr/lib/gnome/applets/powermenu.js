/**
 * Webos.Dashboard.Applet.PowerMenu represente le menu permettant de controller le webos.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.PowerMenu = function WPowerMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var content = $('<ul></ul>', { 'class': 'menu', id: 'powermenu' });
	this.content.append(content);
	
	var button = $('<li></li>').appendTo(content);
	$('<a></a>', { href: '#', 'class': 'powerbutton' }).html('<img src="usr/share/images/gnome/disconnect.png" alt=""/>').appendTo(button);
	var menu = $('<ul></ul>').appendTo(button);

	var generateMenu = function(user) {
		menu.empty();

		if (typeof user == 'undefined') {
			var login = $('<li></li>').appendTo(menu);
			$('<a></a>', { href: '#' }).html('Se connecter').click(function() {
				W.Cmd.execute('gnome-login', new W.Callback());
			}).appendTo(login);
		} else {
			var logout = $('<li></li>').appendTo(menu);
			$('<a></a>', { href: '#' }).html('Se d&eacute;connecter').click(function() {
				W.Cmd.execute('gnome-logout', new W.Callback());
			}).appendTo(logout);
		}
		
		var reboot = $('<li></li>').appendTo(menu);
		$('<a></a>', { href: '#' }).html('Red&eacute;marrer').click(function() {
			W.Cmd.execute('gnome-reboot', new W.Callback());
		}).appendTo(reboot);
	};

	W.User.get(new W.Callback(function(user) {
		generateMenu(user);
	}, function() {}));

	Webos.User.bind('login logout', function(data) {
		generateMenu(data.user);
	});
};