//On initialise la fenetre de connexion
var resetPasswordWindow = $.w.window.main({
	icon: 'actions/keys',
	title: 'Reset password',
	width: 400,
	resizable: false
});

//On ouvre la fenetre
resetPasswordWindow.window('open').window('loading', true);

Webos.Translation.load(function(t) {
	resetPasswordWindow.window('option', 'title', t.get('Reset password'));
	var loginWindowContents = resetPasswordWindow.window('content');

	var tokenData = {
		id: Webos.getQueryParam('token_id'),
		key: Webos.getQueryParam('token_key')
	};

	$.w.icon('actions/keys')
		.css('float', 'left')
		.appendTo(loginWindowContents);

	var form = $.w.entryContainer().submit(function() {
		if (newPasswordInput.passwordEntry('value') != newPasswordConfirmInput.passwordEntry('value')) {
			Webos.Error.trigger('Passwords do not match', '', 400);
			return;
		}

		resetPasswordWindow.window('loading', true);

		var resetPassword = function() {
			W.User.resetPassword(tokenData.id, tokenData.key, newPasswordInput.passwordEntry('value'), [function() {
				resetPasswordWindow.window('close');
				$.w.window.messageDialog({
					title: t.get('Reset password'),
					label: t.get('Your password has been changed.'),
					details: t.get('You can now login with your new password.')
				}).window('open');
			}, function(resp) {
				resetPasswordWindow.window('loading', false);
				resp.triggerError();
			}]);
		};

		if (!tokenData.key) {
			tokenData.key = keyInput.textEntry('value');
			if (!tokenData.key) {
				return;
			}
		}

		if (!tokenData.id) {
			resetPasswordWindow.window('loading', true);
			Webos.User.getTokenByEmail(emailInput.emailEntry('value'), [function(data) {
				resetPasswordWindow.window('loading', false);
				tokenData.id = data.id;
				resetPassword();
			}, function(resp) {
				resetPasswordWindow.window('loading', false);
				resp.triggerError();
			}]);
		} else {
			resetPassword();
		}
	});

	var inputsContainer = $.w.container().css('margin-left', '48px').appendTo(form);

	inputsContainer.append(t.get('Please enter your new password:'));

	var emailInput = $.w.emailEntry(t.get('E-mail :')).appendTo(inputsContainer);
	var keyInput = $.w.textEntry(t.get('Key :')).appendTo(inputsContainer);
	if (tokenData.id) {
		emailInput.hide();
	}
	if (tokenData.key) {
		keyInput.hide();
	}

	inputsContainer.append('<br />');

	var newPasswordInput = $.w.passwordEntry(t.get('New password:')).appendTo(inputsContainer);
	var newPasswordConfirmInput = $.w.passwordEntry(t.get('Retype new password:')).appendTo(inputsContainer);

	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.bind('click', function() {
			resetPasswordWindow.window('close');
		});
	$.w.button(t.get('Reset my password'), true).appendTo(buttonContainer);

	form.appendTo(loginWindowContents);

	resetPasswordWindow.window('loading', false).window('center');
	
	emailInput.emailEntry('content').focus();
}, 'gnome');