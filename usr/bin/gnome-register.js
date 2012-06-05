//On initialise la fenetre
var registerWindow = $.w.window.dialog({
	icon: new W.Icon('stock/person'),
	title: 'S\'inscrire',
	width: 450,
	resizable: false
});

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
registerWindowContents.append('Veuillez entrer votre nom d\'utilisateur, votre adresse de messagerie et votre mot de passe pour vous inscrire :');

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
				title: 'S\'inscrire',
				label: 'Votre compte a &eacute;t&eacute; cr&eacute;&eacute; avec succ&egrave;s !',
				details: 'Vous pouvez vous connecter avec vos identifiants d&egrave;s maintenant.'
			}).window('open');
		}, function(response) {
			registerWindow.window('loading', false);
			response.triggerError('L\'inscription a &eacute;chou&eacute;');
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
inputs.realname = $.w.textEntry('Votre nom : ').keyup(function() {
	inputs.username.textEntry('value', inputs.realname.textEntry('value').toLowerCase().replace(/[^a-z0-9-_\.]/g, '')).trigger('keyup');
}).textEntry('option', 'check', function(value) {
	return (value.length > 0);
}).appendTo(form);
inputs.username = $.w.textEntry('Choisissez un nom d\'utilisateur : ').keyup(function() {
	inputs.username.textEntry('value', inputs.username.textEntry('value').toLowerCase().replace(/[^a-z0-9-_\.]/g, ''));
}).textEntry('option', 'check', function(value) {
	return (value.length > 0);
}).appendTo(form);
inputs.email = $.w.textEntry('Entrez votre adresse e-mail : ').textEntry('option', 'check', function(value) {
	return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value);
}).appendTo(form);
inputs.password = $.w.passwordEntry('Choisissez un mot de passe : ').passwordEntry('option', 'check', function(value) {
	return (Webos.User.evalPasswordPower(value) > 0);
}).appendTo(form);
$.w.label('Fiabilit&eacute; du mot de passe :').appendTo(form);
var passwordPowerIndicator = $.webos.progressbar().appendTo(form);
inputs.password.keyup(function() {
	var passwordPower = Webos.User.evalPasswordPower(inputs.password.passwordEntry('value'));
	passwordPowerIndicator.progressbar('value', passwordPower);
});
inputs.passwordCheck = $.w.passwordEntry('Retapez votre mot de passe : ').passwordEntry('option', 'check', function(value) {
	return (value.length > 0 && inputs.password.passwordEntry('value') == value);
}).appendTo(form);
inputs.captcha = $.w.captchaEntry().appendTo(form);

var buttonContainer = $.w.buttonContainer().appendTo(form);
$.w.button('Annuler')
	.appendTo(buttonContainer)
	.bind('click', function() {
		registerWindow.window('close');
	});
var registerButton = $.w.button('M\'inscrire', true).button('disabled', true).appendTo(buttonContainer);

//On ouvre la fenetre
registerWindow.window('open');

inputs.realname.textEntry('content').focus();

registerWindow.window('loading', true);
Webos.User.canRegister(function(canRegister) {
	registerWindow.window('loading', false);
	
	if (!canRegister) {
		registerWindow.window('close');
		$.webos.window.messageDialog({
			title: 'S\'inscrire',
			type: 'warning',
			label: 'L\'inscription a &eacute;t&eacute; d&eacute;sactiv&eacute;e sur ce webos.',
			details: 'Pour obtenir un compte, veuillez contacter l\'administrateur syst&egrave;me.'
		}).window('open');
	}
});