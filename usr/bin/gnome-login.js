//On initialise la fenetre de connexion
var loginWindow = $.w.window({
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
			var callback = new W.Callback(function() {
				loginWindow.window('close');
				var ui = uiSelector.selectButton('value');
				if (ui == '') {
					ui = undefined;
				}
				W.UserInterface.load(ui);
			}, function(response) {
				loginWindow.window('loading', false);
				response.triggerError(t.get('The connection failed'));
				password.passwordEntry('content').val('');
				username.textEntry('content').focus();
			});
			W.User.login(username.textEntry('content').val(), password.passwordEntry('content').val(), callback);
		});
	var username = $.w.textEntry(t.get('Username :')).appendTo(form);
	var password = $.w.passwordEntry(t.get('Password :')).appendTo(form);
	var spoiler = $.w.spoiler(t.get('Options')).one('spoilershow', function() {
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
	uis[W.UserInterface.current.name()] = t.get('Current interface');
	uis[''] = t.get('Default interface');
	var uiSelector = $.w.selectButton(t.get('Interface :'), uis).selectButton('value', W.UserInterface.current.name()).appendTo(spoiler.spoiler('content'));
	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.bind('click', function() {
			loginWindow.window('close');
		});
	$.w.button(t.get('Login'), true).appendTo(buttonContainer);
	
	username.textEntry('content').focus();
}, 'gnome');