/**
 * SMeMenuApplet represente le menu utilisateur.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SMeMenuApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);
	
	var menu = $('<li></li>').attr('id','memenu').appendTo(content);
	var userBox = $('<a></a>', { href: '#' }).html('Utilisateur').appendTo(menu);
	
	this.content.bind('insert', function() {
		var callback = new W.Callback(function(user) {
			var realname = 'Invité';
			if (typeof user != 'undefined') {
				realname = user.getAttribute('realname');
			}
			userBox.text(realname);
		}, function() {
			//On declare la bienvenue a l'utilisateur
			new SNotification({
				message: 'Bienvenue sur Symbiose. Si vous souhaitez acc&eacute;der &agrave; vos documents, veuillez vous connecter.',
				title: 'Bonjour !',
				life: 7,
				icon: '/usr/share/images/distributor/logo-48.png'
			});
		});

		W.User.get(callback);
	});
}