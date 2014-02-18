var confWindow = args.getParam(0);

confWindow.window('dialog', true);

var tabs = $.w.tabs().appendTo(confWindow.window('content'));

//Global restrictions
var globalContent = $.w.entryContainer();
tabs.tabs('tab', 'Global quotas', globalContent);

var inputs = {};
inputs.accounts = $.w.numberEntry('Maximal number of accounts (<em>-1</em> for no limit) : ', 0, -1).appendTo(globalContent);
inputs.home = $.w.numberEntry('Maximal size of each home directory (<em>-1</em> for no limit) : ', 0, -1).appendTo(globalContent);
var sizesUnits = {
	0: 'bytes',
	1: 'KiB',
	2: 'MiB',
	3: 'GiB',
	4: 'TiB'
};
var unitSelector = $.w.selectButton('', sizesUnits);
unitSelector.selectButton('input').change(function() {
	var sizeInUnit = parseInt(inputs.home.numberEntry('value'));
	if (sizeInUnit > 0) {
		var size = sizeInUnit * Math.pow(1024, parseInt(unitSelector.selectButton('value')));
		inputs.home.numberEntry('value', size);
	}
	unitSelector.selectButton('value', 0);
}).appendTo(inputs.home);

inputs.register = $.w.switchButton('Allow users to register').appendTo(globalContent);
inputs.autoEnable = $.w.switchButton('Allow users to register without an administrator confirmation').appendTo(globalContent);

//Specific restrictions
var specificContent = $.w.entryContainer();
tabs.tabs('tab', 'Specific quotas', specificContent);

inputs.specificList = $.w.list(['User', 'Maximal size of home directory']).appendTo(specificContent);

inputs.specificAdd = $.w.button('Add');
inputs.specificList.list('addButton', inputs.specificAdd);

inputs.specificEdit = $.w.button('Edit');
inputs.specificList.list('addButton', inputs.specificEdit);

inputs.specificRemove = $.w.button('Remove');
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
			inputs.autoEnable.switchButton('value', configFile.get('autoEnable'));
		};
		
		var saveConfig = function() {
			confWindow.window('loading', true);
			configFile.sync([function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				displayConfig();
				response.triggerError();
			}]);
		};
		
		inputs.register.bind('switchbuttonchange', function(e, data) {
			if (!configFile.set('register', (data.value) ? 1 : 0)) {
				W.Error.trigger('Cannot change registration configuration');
			} else {
				saveConfig();
			}
		});

		inputs.autoEnable.bind('switchbuttonchange', function(e, data) {
			if (!configFile.set('autoEnable', data.value)) {
				W.Error.trigger('Cannot change registration configuration');
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
		response.triggerError();
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
				response.triggerError();
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
						maxHomeSize = 'Unlimited';
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
				title: 'New rule',
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
					message: 'Checking user...'
				});

				Webos.User.getByUsername(username, [function(user) {
					userSpecificData[username] = newUserData;
					dataFile.set('specific', userSpecificData);

					$userChooser.window('close');
					saveData();
				}, function(response) {
					$userChooser.window('loading', false);
					response.triggerError('User doesn\'t exist');
				}]);
			}).appendTo($userChooser.window('content'));

			var $usernameEntry = $.w.textEntry('Username : ').textEntry('option', 'check', function(value) {
				return (value) ? true : false;
			}).appendTo($chooserForm);
			var $maxHomeSizeEntry = $.w.numberEntry('Maximal size of home directory : ').appendTo($chooserForm);
			var $maxHomeSizeUnitEntry = $.w.selectButton('', sizesUnits);
			$maxHomeSizeUnitEntry.selectButton('input').appendTo($maxHomeSizeEntry);

			var $btnContainer = $.w.buttonContainer().appendTo($chooserForm);
			var $cancelBtn = $.w.button('Cancel').click(function() {
				$userChooser.window('close');
			}).appendTo($btnContainer);
			var $submitBtn = $.w.button('Add rule', true).appendTo($btnContainer);

			$userChooser.window('open');
		});

		inputs.specificEdit.click(function() {
			if ($selectedItem.length) {
				var $maxHomeSizeEntry = $.w.numberEntry('', userSpecificData[selectedRuleUser]['~']);
				var $maxHomeSizeUnitEntry = $.w.selectButton('', sizesUnits);
				$maxHomeSizeUnitEntry.selectButton('input').appendTo($maxHomeSizeEntry);

				$selectedItem.listItem('column', 1).html($maxHomeSizeEntry);

				var $submitColumn = $selectedItem.listItem('column').html($.w.button('Submit').click(function() {
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
		response.triggerError();
	}]);
});