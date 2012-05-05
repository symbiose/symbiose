//On initialise la fenetre de deconnexion
var loginWindow = $.w.window({
	icon: new SIcon('actions/keys'),
	title: 'Se connecter',
	width: 350,
	resizable: false
});

var loginWindowContents = loginWindow.window('content');

//Contenu de la fenetre
$('<img />').attr('src', new SIcon('actions/keys'))
	.css('float', 'left')
	.appendTo(loginWindowContents);

loginWindowContents.append('Veuillez entrer votre nom d\'utilisateur et votre mot de passe :');
var form = $.w.entryContainer()
	.appendTo(loginWindowContents)
	.submit(function() {
		loginWindow.window('loading', true);
		var callback = new W.Callback(function() {
			loginWindow.window('close');
			W.UserInterface.load();
		}, function(response) {
			loginWindow.window('loading', false);
			response.triggerError('La connexion a &eacute;chou&eacute;');
			password.passwordEntry('content').val('');
			username.textEntry('content').focus();
		});
		W.User.login(username.textEntry('content').val(), password.passwordEntry('content').val(), callback);
	});
var username = $.w.textEntry('Nom d\'utilisateur : ').appendTo(form);
var password = $.w.passwordEntry('Mot de passe : ').appendTo(form);
var buttonContainer = $.w.buttonContainer().appendTo(form);
$.w.button('Annuler')
	.appendTo(buttonContainer)
	.bind('click', function() {
		loginWindow.window('close');
	});
$.w.button('Se connecter', true).appendTo(buttonContainer);

//On ouvre la fenetre
loginWindow.window('open');

username.textEntry('content').focus();