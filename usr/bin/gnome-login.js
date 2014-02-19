var that = this, args = that.getArguments();

//On initialise la fenetre de connexion
var loginWindow = $.w.window.main({
	icon: 'actions/keys',
	title: 'Login',
	width: 400,
	resizable: false
});

//On ouvre la fenetre
loginWindow.window('open');

loginWindow.window('loading', true);

var forgotPasswordBtn = $('<a></a>', { href: '#' });

Webos.Translation.load(function(t) {
	var forgotPassword = function() {
		var forgotPasswordWindow = $.w.window.dialog({
			title: t.get('Reset password'),
			width: 350,
			resizable: false,
			parentWindow: loginWindow
		});

		var form = $.w.entryContainer().submit(function() {
			forgotPasswordWindow.window('loading', true);

			Webos.User.sendResetPasswordRequest(emailInput.emailEntry('value'), [function() {
				forgotPasswordWindow.window('close');

				$.w.window.messageDialog({
					title: t.get('Reset password'),
					label: t.get('An e-mail has been sent to reset your password.'),
					details: t.get('Check your e-mails and click on the given link.')
				}).window('open');
			}, function(resp) {
				forgotPasswordWindow.window('loading', false);
				resp.triggerError();
			}]);
		}).appendTo(forgotPasswordWindow.window('content'));

		form.append($.w.label(t.get('Enter your e-mail below. You will receive an e-mail containg instructions to reset your password.')));

		var emailInput = $.w.emailEntry(t.get('E-mail :')).appendTo(form);

		var gotCodeBtn = $('<a></a>', { href: '#' }).html(t.get('Already received?')).click(function(e) {
			forgotPasswordWindow.window('close');

			W.Cmd.execute('gnome-reset-password');

			e.preventDefault();
		}).css('float', 'left').appendTo(form);

		var btns = $.w.buttonContainer().appendTo(form);
		$.w.button(t.get('Cancel')).click(function() {
			forgotPasswordWindow.window('close');
		}).appendTo(btns);
		$.w.button(t.get('Submit'), true).appendTo(btns);

		forgotPasswordWindow.window('open');
		emailInput.emailEntry('content').focus();
	};

	loginWindow.window('option', 'title', t.get('Login'));

	var loginWindowContents = loginWindow.window('content');

	//Contenu de la fenetre
	$.w.icon('actions/keys')
		.css('float', 'left')
		.appendTo(loginWindowContents);

	var form = $.w.entryContainer().submit(function() {
		loginWindow.window('loading', true, {
			message: t.get('Connecting...')
		});
		W.User.login(username.textEntry('value'), password.passwordEntry('value'), [function() {
			loginWindow.window('close');
			var ui = uiSelector.selectButton('value');

			if (ui && Webos.UserInterface.Booter.current().name() != ui) {
				W.UserInterface.load(ui);
			}
		}, function(response) {
			loginWindow.window('loading', false);
			response.triggerError(t.get('The connection failed'));
			password.passwordEntry('value', '');
			password.passwordEntry('content').focus();
		}]);
	});

	var inputsContainer = $.w.container().css('margin-left', '48px').appendTo(form);

	inputsContainer.append(t.get('Please enter your username and password :'));

	var username = $.w.textEntry(t.get('Username :')).appendTo(inputsContainer);
	var password = $.w.passwordEntry(t.get('Password :')).appendTo(inputsContainer);
	var spoiler = $.w.spoiler(t.get('Options')).one('spoilershow', function() {
		W.UserInterface.getList(new W.Callback(function(list) {
			var uis = {};
			var defaultUI;
			for (var i = 0; i < list.length; i++) {
				(function(ui) {
					if (jQuery.inArray('userInterface', ui.get('labels')) != -1) { //Si c'est une interface de travail, pas une interface de connexion
						uis[ui.get('name')] = (ui.get('displayname')) ? ui.get('displayname') : ui.get('name');
						if ((ui.get('default') && typeof defaultUI != 'undefined') || ui.get('name') == W.UserInterface.Booter.current().name()) {
							defaultUI = ui.name;
						}
					}
				})(list[i]);
			}
			uiSelector.selectButton('option', 'choices', uis).selectButton('value', defaultUI);
		}, function() {}));
	}).appendTo(inputsContainer);

	var uis = {};
	uis[W.UserInterface.Booter.current().name()] = t.get('Current interface');
	if (!W.UserInterface.current().get('default')) {
		uis[''] = t.get('Default interface');
	}
	var uiSelector = $.w.selectButton(t.get('Interface :'), uis).selectButton('value', W.UserInterface.Booter.current().name()).appendTo(spoiler.spoiler('content'));

	forgotPasswordBtn.html(t.get('Lost your password?')).click(function(e) {
		forgotPassword();
		e.preventDefault();
	}).css({
		'float': 'left',
		margin: '3px'
	}).appendTo(form);

	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.bind('click', function() {
			loginWindow.window('close');
		});
	$.w.button(t.get('Login'), true).appendTo(buttonContainer);

	form.appendTo(loginWindowContents);

	loginWindow.window('loading', false).window('center');
	username.textEntry('content').focus();

	if (args.isOption('forgot-password')) {
		forgotPassword();
	}
}, 'gnome');

Webos.User.canResetPassword([function(data) {
	loginWindow.window('loading', false);

	if (!data.enabled) {
		forgotPasswordBtn.hide();
	}
}, function() {
	loginWindow.window('loading', false);
	forgotPasswordBtn.hide();
}]);