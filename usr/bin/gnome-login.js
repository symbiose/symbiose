//On initialise la fenetre de connexion
var loginWindow = $.w.window.main({
	icon: 'actions/keys',
	title: 'Login',
	width: 350,
	resizable: false
});

//On ouvre la fenetre
loginWindow.window('open');

loginWindow.window('loading', true);

Webos.Translation.load(function(t) {
	loginWindow.window('loading', false);
	
	loginWindow.window('option', 'title', t.get('Login'));
	
	var loginWindowContents = loginWindow.window('content');

	//Contenu de la fenetre
	$('<img />').attr('src', new W.Icon('actions/keys'))
		.css('float', 'left')
		.appendTo(loginWindowContents);
	
	loginWindowContents.append(t.get('Please enter your username and password :'));
	var form = $.w.entryContainer()
		.appendTo(loginWindowContents)
		.submit(function() {
			loginWindow.window('loading', true, {
				message: t.get('Connecting...')
			});
			W.User.login(username.textEntry('content').val(), password.passwordEntry('content').val(), [function() {
				loginWindow.window('close');
				var ui = uiSelector.selectButton('value');

				if (ui && Webos.UserInterface.Booter.current().name() != ui) {
					W.UserInterface.load(ui);
				}
			}, function(response) {
				loginWindow.window('loading', false);
				response.triggerError(t.get('The connection failed'));
				password.passwordEntry('content').val('');
				username.textEntry('content').focus();
			}]);
		});
	var username = $.w.textEntry(t.get('Username :')).appendTo(form);
	var password = $.w.passwordEntry(t.get('Password :')).appendTo(form);
	var spoiler = $.w.spoiler(t.get('Options')).one('spoilershow', function() {
		W.UserInterface.getList(new W.Callback(function(list) {
			console.log(list);
			var uis = {};
			var defaultUI;
			for (var i = 0; i < list.length; i++) {
				(function(ui) {
					if (jQuery.inArray('ui', ui.get('types')) != -1) { //Si c'est une interface de travail, pas une interface de connexion
						uis[ui.get('name')] = (ui.get('displayname')) ? ui.get('displayname') : ui.get('name');
						if ((ui.get('default') && typeof defaultUI != 'undefined') || ui.get('name') == W.UserInterface.Booter.current().name()) {
							defaultUI = ui.name;
						}
					}
				})(list[i]);
			}
			uiSelector.selectButton('option', 'choices', uis).selectButton('value', defaultUI);
		}, function() {}));
	}).appendTo(form);

	var uis = {};
	uis[W.UserInterface.Booter.current().name()] = t.get('Current interface');
	if (!W.UserInterface.current().get('default')) {
		uis[''] = t.get('Default interface');
	}
	var uiSelector = $.w.selectButton(t.get('Interface :'), uis).selectButton('value', W.UserInterface.Booter.current().name()).appendTo(spoiler.spoiler('content'));
	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.bind('click', function() {
			loginWindow.window('close');
		});
	$.w.button(t.get('Login'), true).appendTo(buttonContainer);
	
	username.textEntry('content').focus();
}, 'gnome');