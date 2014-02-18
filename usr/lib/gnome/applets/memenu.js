/**
 * Webos.Dashboard.Applet.MeMenu represente le menu utilisateur.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.MeMenu = function SMeMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);
	
	var menu = $('<li></li>').attr('id','memenu').appendTo(content);
	var userBox = $('<a></a>', { href: '#' }).html('Utilisateur').appendTo(menu);

	var generateMenu = function(user) {
		userBox.empty();

		if (typeof user != 'undefined') {
			var realname = 'Invité';
			if (typeof user != 'undefined') {
				realname = user.get('realname');
			}
			userBox.text(realname);
		} else {
			//On declare la bienvenue a l'utilisateur
			new SNotification({
				message: 'Bienvenue sur Symbiose. Si vous souhaitez acc&eacute;der &agrave; vos documents, veuillez vous connecter.',
				title: 'Bonjour !',
				life: 7,
				icon: '/usr/share/images/distributor/logo-48.png'
			});
		}
	};

	W.User.get(new W.Callback(function(user) {
		generateMenu(user);
	}, function() {}));

	Webos.User.bind('login logout', function(data) {
		generateMenu(data.user);
	});
};