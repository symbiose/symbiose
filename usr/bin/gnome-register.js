//On initialise la fenetre
var registerWindow = $.w.window.main({
	icon: new W.Icon('stock/person'),
	title: 'Register',
	width: 450,
	resizable: false,
	dialog: true
});

//On ouvre la fenetre
registerWindow.window('open');

registerWindow.window('loading', true);

Webos.Translation.load(function(t) {
	registerWindow.window('option', 'title', t.get('Register'));
	
	var registerWindowContents = registerWindow.window('content');
	
	var checkFormFn = function() {
		var valid = true;
		for (var inputName in inputs) {
			(function($input) {
				if ($.webos.widget.is($input, 'textEntry')) {
					valid = $input.textEntry('isValid');
				}
				if ($.webos.widget.is($input, 'passwordEntry')) {
					valid = $input.passwordEntry('isValid');
				}
				if ($.webos.widget.is($input, 'captchaEntry')) {
					valid = $input.captchaEntry('isValid');
				}
			})(inputs[inputName]);
			
			if (!valid) {
				return false;
			}
		}
		return true;
	};
	
	//Contenu de la fenetre
	registerWindowContents.append(t.get('With an account, you can upload your documents, adjust your preferences and enjoy all the features of this webos. Simply fill in this form :'));
	
	var checkInProgress = false;
	var form = $.w.entryContainer()
		.appendTo(registerWindowContents)
		.submit(function() {
			if (!checkFormFn()) {
				return;
			}
			
			registerWindow.window('loading', true);
			W.User.register({
				username: inputs.username.textEntry('value'),
				realname: inputs.realname.textEntry('value'),
				password: inputs.password.passwordEntry('value'),
				email: inputs.email.textEntry('value')
			}, {
				id: inputs.captcha.captchaEntry('captchaId'),
				value: inputs.captcha.captchaEntry('value')
			}, new W.Callback(function() {
				registerWindow.window('close');
				$.webos.window.messageDialog({
					title: t.get('Register'),
					label: t.get('Your account has been created !'),
					details: t.get('You can login from now.')
				}).window('open');
			}, function(response) {
				registerWindow.window('loading', false);
				response.triggerError(t.get('Registration failed'));
			}));
		})
		.bind('textentrycheck passwordentrycheck', function(e, data) {
			if (!data.valid) {
				registerButton.button('disabled', true);
			} else {
				registerButton.button('disabled', !checkFormFn());
			}
		});
	var inputs = {};
	inputs.realname = $.w.textEntry(t.get('Your name :')).keyup(function() {
		inputs.username.textEntry('value', inputs.realname.textEntry('value').toLowerCase().replace(/[^a-z0-9-_\.]/g, '')).trigger('keyup');
	}).textEntry('option', 'check', function(value) {
		return (value.length > 0);
	}).appendTo(form);
	inputs.username = $.w.textEntry(t.get('Choose a username :')).keyup(function() {
		inputs.username.textEntry('value', inputs.username.textEntry('value').toLowerCase().replace(/[^a-z0-9-_\.]/g, ''));
	}).textEntry('option', 'check', function(value) {
		return (value.length > 0);
	}).appendTo(form);
	inputs.email = $.w.textEntry(t.get('Enter your e-mail adress :')).textEntry('option', 'check', function(value) {
		return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value);
	}).appendTo(form);
	inputs.password = $.w.passwordEntry(t.get('Choose a password :')).passwordEntry('option', 'check', function(value) {
		return (Webos.User.evalPasswordPower(value) > 0);
	}).appendTo(form);
	$.w.label(t.get('Password strength :')).appendTo(form);
	var passwordPowerIndicator = $.webos.progressbar().appendTo(form);
	inputs.password.keyup(function() {
		var passwordPower = Webos.User.evalPasswordPower(inputs.password.passwordEntry('value'));
		passwordPowerIndicator.progressbar('value', passwordPower);
	});
	inputs.passwordCheck = $.w.passwordEntry(t.get('Retype your password :')).passwordEntry('option', 'check', function(value) {
		return (value.length > 0 && inputs.password.passwordEntry('value') == value);
	}).appendTo(form);
	inputs.captcha = $.w.captchaEntry().appendTo(form);
	
	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.bind('click', function() {
			registerWindow.window('close');
		});
	var registerButton = $.w.button(t.get('Register'), true).button('disabled', true).appendTo(buttonContainer);
	
	Webos.User.canRegister(function(canRegister) {
		registerWindow.window('loading', false).window('center');
		
		if (!canRegister) {
			registerWindow.window('close');
			$.webos.window.messageDialog({
				title: t.get('Register'),
				type: 'warning',
				label: t.get('Registration has been disabled on this webos.'),
				details: t.get('To get an account, please contact the system administrator.')
			}).window('open');
		}
	});
}, 'gnome');