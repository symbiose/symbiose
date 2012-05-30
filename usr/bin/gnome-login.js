//On initialise la fenetre de deconnexion
var loginWindow = $.w.window({
	icon: new W.Icon('actions/keys'),
	title: 'Se connecter',
	width: 350,
	resizable: false
});

var loginWindowContents = loginWindow.window('content');

//Contenu de la fenetre
$('<img />').attr('src', new W.Icon('actions/keys'))
	.css('float', 'left')
	.appendTo(loginWindowContents);

loginWindowContents.append('Veuillez entrer votre nom d\'utilisateur et votre mot de passe :');
var form = $.w.entryContainer()
	.appendTo(loginWindowContents)
	.submit(function() {
		loginWindow.window('loading', true);
		var callback = new W.Callback(function() {
			loginWindow.window('close');
			var ui = uiSelector.selectButton('value');
			if (ui == '') {
				ui = undefined;
			}
			W.UserInterface.load(ui);
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
var spoiler = $.w.spoiler('Options').one('spoilershow', function() {
	W.UserInterface.getList(new W.Callback(function(data) {
		var uis = {};
		var defaultUI = undefined;
		for (var index in data) {
			(function(ui) {
				if (ui.type == 'ui') { //Si c'est une interface de travail, pas une interface de connexion
					uis[ui.name] = (ui.attributes.displayname) ? ui.attributes.displayname : ui.name;
					if ((ui['default'] && typeof defaultUI != 'undefined') || ui.name == W.UserInterface.current.name()) {
						defaultUI = ui.name;
					}
				}
			})(data[index]);
		}
		uiSelector.selectButton('option', 'choices', uis).selectButton('value', defaultUI);
	}, function() {}));
}).appendTo(form);
var uis = {};
uis[W.UserInterface.current.name()] = 'Interface actuelle';
uis[''] = 'Interface par d&eacute;faut';
var uiSelector = $.w.selectButton('Interface : ', uis).selectButton('value', W.UserInterface.current.name()).appendTo(spoiler.spoiler('content'));
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