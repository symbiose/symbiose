var confWindow = args.getParam(0);

confWindow.window('dialog', true);

var form = $.w.entryContainer().appendTo(confWindow.window('content'));

var inputs = {};
inputs.accounts = $.w.numberEntry('Nombre maximal de comptes (<em>-1</em> pour illimit&eacute;) : ', 0, -1).appendTo(form);
inputs.home = $.w.numberEntry('Taille maximale de chaque dossier personnel (<em>-1</em> pour illimit&eacute;) : ', 0, -1).appendTo(form);
var unitSelector = $.w.selectButton('', {
	0: 'octets',
	1: 'Kio',
	2: 'Mio',
	3: 'Gio',
	4: 'Tio'
});
unitSelector.selectButton('input').change(function() {
	var sizeInUnit = parseInt(inputs.home.numberEntry('value'));
	if (sizeInUnit > 0) {
		var size = sizeInUnit * Math.pow(1024, parseInt(unitSelector.selectButton('value')));
		inputs.home.numberEntry('value', size);
	}
	unitSelector.selectButton('value', 0);
}).appendTo(inputs.home);

inputs.register = $.w.switchButton('Inscription des visiteurs (sans validation) : ').appendTo(form);

confWindow.window('loading', true);

var loaded = 0;
var notifyLoadedFn = function() {
	loaded++;
	if (loaded == 2) {
		confWindow.window('loading', false);
	}
};
Webos.ConfigFile.load('/etc/quotas.xml', [function(configFile) {
	notifyLoadedFn();
	
	var saveConfigFn = function() {
		confWindow.window('loading', true);
		configFile.sync([function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			inputs.accounts.numberEntry('value', configFile.get('accounts'));
			inputs.home.numberEntry('value', configFile.get('home'));
			response.triggerError('Impossible de modifier la configuration des quotas');
		}]);
	};
	
	inputs.accounts.numberEntry('value', configFile.get('accounts')).bind('numberentrychange', function(e, data) {
		if (!configFile.set('accounts', data.value)) {
			W.Error.trigger('Impossible de modifier le nombre maximal d\'utilisateurs');
		} else {
			saveConfigFn();
		}
	});
	inputs.home.numberEntry('value', configFile.get('home')).bind('numberentrychange', function(e, data) {
		if (!configFile.set('home', data.value)) {
			W.Error.trigger('Impossible de modifier la taille maximale des dossiers personnels');
		} else {
			saveConfigFn();
		}
	});
}, function(response) {
	notifyLoadedFn();
	response.triggerError('Impossible d\'acc&eacute;der au fichier de configuration des quotas');
}]);

Webos.ConfigFile.load('/etc/register.xml', [function(configFile) {
	notifyLoadedFn();
	
	var saveConfigFn = function() {
		confWindow.window('loading', true);
		configFile.sync([function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			inputs.register.switchButton('value', parseInt(configFile.get('register')));
			response.triggerError('Impossible de modifier la configuration des inscriptions');
		}]);
	};
	
	inputs.register.switchButton('value', parseInt(configFile.get('register'))).bind('switchbuttonchange', function(e, data) {
		if (!configFile.set('register', (data.value) ? 1 : 0)) {
			W.Error.trigger('Impossible de modifier la configuration des inscriptions');
		} else {
			saveConfigFn();
		}
	});
}, function(response) {
	notifyLoadedFn();
	response.triggerError('Impossible d\'acc&eacute;der au fichier de configuration des inscriptions');
}]);