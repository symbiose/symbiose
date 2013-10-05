var confWindow = args.getParam(0);

confWindow.window('dialog', true);

var tabs = $.w.tabs().appendTo(confWindow.window('content'));

//Global restrictions
var globalContent = $.w.entryContainer();
tabs.tabs('tab', 'Restrictions globales', globalContent);

var inputs = {};
inputs.accounts = $.w.numberEntry('Nombre maximal de comptes (<em>-1</em> pour illimit&eacute;) : ', 0, -1).appendTo(globalContent);
inputs.home = $.w.numberEntry('Taille maximale de chaque dossier personnel (<em>-1</em> pour illimit&eacute;) : ', 0, -1).appendTo(globalContent);
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

inputs.register = $.w.switchButton('Inscription des visiteurs (sans validation) : ').appendTo(globalContent);

//Specific restrictions
var specificContent = $.w.entryContainer();
tabs.tabs('tab', 'Restrictions sp&eacute;cifiques', specificContent);

inputs.specificList = $.w.list(['Utilisateur', 'Taille maximale du dossier personnel']).appendTo(specificContent);

inputs.specificAdd = $.w.button('Ajouter');
inputs.specificList.list('addButton', inputs.specificAdd);

inputs.specificEdit = $.w.button('Modifier');
inputs.specificList.list('addButton', inputs.specificEdit);

inputs.specificRemove = $.w.button('Enlever');
inputs.specificList.list('addButton', inputs.specificRemove);

confWindow.window('loading', true);

var loaded = 0;
var notifyLoadedFn = function() {
	loaded++;
	if (loaded == 2) {
		confWindow.window('loading', false);
	}
};

Webos.require('/usr/lib/webos/data.js', function() {
	Webos.DataFile.loadSystemData('register', [function(configFile) {
		notifyLoadedFn();

		var displayConfig = function() {
			inputs.register.switchButton('value', configFile.get('register'));
			inputs.accounts.numberEntry('value', parseInt(configFile.get('maxUsers')));
		};
		
		var saveConfig = function() {
			confWindow.window('loading', true);
			configFile.sync([function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				displayConfig();
				response.triggerError('Impossible de modifier la configuration des inscriptions');
			}]);
		};
		
		inputs.register.bind('switchbuttonchange', function(e, data) {
			if (!configFile.set('register', (data.value) ? 1 : 0)) {
				W.Error.trigger('Impossible de modifier la configuration des inscriptions');
			} else {
				saveConfig();
			}
		});

		inputs.accounts.bind('numberentrychange', function(e, data) {
			configFile.set('maxUsers', data.value);
			saveConfig();
		});

		displayConfig();
	}, function(response) {
		notifyLoadedFn();
		response.triggerError('Impossible d\'acc&eacute;der au fichier de configuration des inscriptions');
	}]);

	Webos.DataFile.loadSystemData('quotas', [function(dataFile) {
		notifyLoadedFn();

		var userSpecificData = dataFile.get('specific') || {},
		globalData = dataFile.get('global') || {
			'~': -1
		},
		selectedRuleUser = null, $selectedItem = $();

		var displayGlobalData = function() {
			inputs.home.numberEntry('value', globalData['~']);
		};

		var saveData = function() {
			confWindow.window('loading', true);
			dataFile.sync([function() {
				confWindow.window('loading', false);
				displayUserSpecificData();
			}, function(response) {
				confWindow.window('loading', false);
				displayGlobalData();
				response.triggerError('Impossible de modifier la configuration des quotas');
			}]);
		};
		
		inputs.home.bind('numberentrychange', function(e, data) {
			globalData['~'] = data.value;
			dataFile.set('global', globalData);
			saveData();
		});

		var displayUserSpecificData = function() {
			userSpecificData = dataFile.get('specific') || {};
			inputs.specificList.list('content').empty();

			for (var username in userSpecificData) {
				(function(username, userQuotas) {
					var maxHomeSize = '';
					if (userQuotas.home >= 0) {
						maxHomeSize = W.File.bytesToSize(userQuotas.home);
					} else {
						maxHomeSize = 'Illimit&eacute;';
					}
					var $item = $.w.listItem([username, maxHomeSize]);

					$item.on('listitemselect', function() {
						selectedRuleUser = username;
						$selectedItem = $item;
					}).on('listitemunselect', function() {
						selectedRuleUser = null;
						$selectedItem = $();
					});

					$item.appendTo(inputs.specificList.list('content'));
				})(username, userSpecificData[username]);
			}
		};

		inputs.specificAdd.click(function() {
			var $userChooser = $.w.window({
				title: 'Nouvelle r&egrave;gle',
				parentWindow: confWindow,
				resizable: false,
				dialog: true
			});

			var $chooserForm = $.w.entryContainer().submit(function() {
				var username = $usernameEntry.textEntry('value'),
				maxHomeSize = parseInt($maxHomeSizeEntry.numberEntry('value'));

				if (maxHomeSize > 0) {
					maxHomeSize = maxHomeSize * Math.pow(1024, parseInt($maxHomeSizeUnitEntry.selectButton('value')));
				}

				if (!username) {
					return;
				}

				var newUserData = {
					'~': maxHomeSize
				};

				var userSpecificData = dataFile.get('specific') || {};

				$userChooser.window('loading', true, {
					message: 'V&eacute;rification de l\'utilisateur...'
				});

				Webos.User.getByUsername(username, [function(user) {
					userSpecificData[username] = newUserData;
					dataFile.set('specific', userSpecificData);

					$userChooser.window('close');
					saveData();
				}, function(response) {
					$userChooser.window('loading', false);
					response.triggerError('Utilisateur inexistant');
				}]);
			}).appendTo($userChooser.window('content'));

			var $usernameEntry = $.w.textEntry('Nom d\'utilisateur : ').textEntry('option', 'check', function(value) {
				return (value) ? true : false;
			}).appendTo($chooserForm);
			var $maxHomeSizeEntry = $.w.numberEntry('Taille maximale du dossier personnel : ').appendTo($chooserForm);
			var $maxHomeSizeUnitEntry = $.w.selectButton('', {
				0: 'octets',
				1: 'Kio',
				2: 'Mio',
				3: 'Gio',
				4: 'Tio'
			});
			$maxHomeSizeUnitEntry.selectButton('input').appendTo($maxHomeSizeEntry);

			var $btnContainer = $.w.buttonContainer().appendTo($chooserForm);
			var $cancelBtn = $.w.button('Annuler').click(function() {
				$userChooser.window('close');
			}).appendTo($btnContainer);
			var $submitBtn = $.w.button('Valider', true).appendTo($btnContainer);

			$userChooser.window('open');
		});

		inputs.specificEdit.click(function() {
			if ($selectedItem.length) {
				var $maxHomeSizeEntry = $.w.numberEntry('', userSpecificData[selectedRuleUser]['~']);
				var $maxHomeSizeUnitEntry = $.w.selectButton('', {
					0: 'octets',
					1: 'Kio',
					2: 'Mio',
					3: 'Gio',
					4: 'Tio'
				});
				$maxHomeSizeUnitEntry.selectButton('input').appendTo($maxHomeSizeEntry);

				$selectedItem.listItem('column', 1).html($maxHomeSizeEntry);

				var $submitColumn = $selectedItem.listItem('column').html($.w.button('Valider').click(function() {
					$submitColumn.remove();

					var maxHomeSize = $maxHomeSizeEntry.numberEntry('value');

					if (maxHomeSize > 0) {
						maxHomeSize = maxHomeSize * Math.pow(1024, $maxHomeSizeUnitEntry.selectButton('value'));
					}

					userSpecificData[selectedRuleUser]['~'] = maxHomeSize;
					dataFile.set('specific', userSpecificData);
					saveData();
				}));
			}
		});

		inputs.specificRemove.click(function() {
			if ($selectedItem.length) {
				delete userSpecificData[selectedRuleUser];
				dataFile.set('specific', userSpecificData);
				saveData();
			}
		});

		displayGlobalData();
		displayUserSpecificData();
	}, function(response) {
		notifyLoadedFn();
		response.triggerError('Impossible d\'acc&eacute;der &agrave; la configuration des utilisateurs bloqu&eacute;s');
	}]);
});