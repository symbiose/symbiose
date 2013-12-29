var confWindow = args.getParam(0);

confWindow.window('dialog', true);

var uisList = $.w.list(['Name', 'Labels', 'Enabled', 'By default']).appendTo(confWindow.window('content'));

var uisLabels = {
	'userInterface': 'User desktop interface',
	'guestInterface': 'Guest desktop interface',
	'touchDevices': 'For touch devices'
};
var _generatedUIItems = [];
var generateUIItemFn = function(ui, enabled) {
	if (!enabled && $.inArray(ui.get('name'), _generatedUIItems) != -1) {
		return $();
	}

	_generatedUIItems.push(ui.get('name'));

	var syncUi = function() {
		confWindow.window('loading', true);

		ui.sync([function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			response.triggerError();
		}]);
	};

	var syncTypes = function() {};

	var enabledSelector = $.w.switchButton('', (enabled) ? true : false).on('switchbuttonchange', function() {
		ui.set('enabled', ($(this).switchButton('value')) ? true : false);
		syncUi();
	});

	var defaultSelector = $.w.switchButton('', (ui.get('default')) ? true : false).on('switchbuttonchange', function() {
		ui.set('default', ($(this).switchButton('value')) ? true : false);
		syncUi();
	});

	if (!enabled) {
		defaultSelector.switchButton('disabled', true);
	}

	var $labels = $();
	for (var labelName in uisLabels) {
		(function (labelName, labelTitle) {
			var isLabelled = (~jQuery.inArray(labelName, ui.get('labels')));
			var $checkbox = $.w.checkButton(labelTitle, isLabelled).on('checkbuttonchange', function() {
				var labels = ui.get('labels'), labelIndex = labels.indexOf(labelName);
				if ($checkbox.checkButton('value')) {
					console.log('add', !~labelIndex);
					if (!~labelIndex) {
						console.log('doadd');
						labels.push(labelName);
					}
				} else {
					console.log('remove', !!~labelIndex);
					if (~labelIndex) {
						console.log('doremove');
						labels.splice(labelIndex, 1);
					}
				}
				console.log(labels);
				ui.set('labels', labels);
				syncUi();
			});

			$labels = $labels.add($checkbox);
		})(labelName, uisLabels[labelName]);
	}

	return $.w.listItem([(typeof ui.get('displayname') != 'undefined') ? '<strong>'+ui.get('displayname')+'</strong> (<em>'+ui.get('name')+'</em>)' : '<strong>'+ui.get('name')+'</strong>', $labels, enabledSelector, defaultSelector]);
};
var displayUIsFn = function() {
	uisList.list('content').empty();

	confWindow.window('loading', true);

	var loadedCallsNbr = 0;
	var callLoadedFn = function(index) {
		loadedCallsNbr++;

		if (loadedCallsNbr >= 2) {
			confWindow.window('loading', false);
		} else if (index == 0) {
			confWindow.window('loading', true, {
				lock: false
			});
		}
	};
	
	W.UserInterface.getList([function(list) {
		for (var i = 0; i < list.length; i++) {
			(function(ui) {
				var item = generateUIItemFn(ui, true);
				
				item.appendTo(uisList.list('content'));
			})(list[i]);
		}
		
		callLoadedFn(0);
	}, function(response) {
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur les interfaces utilisateur');
	}]);
	
	W.UserInterface.getInstalled([function(list) {
		for (var i = 0; i < list.length; i++) {
			(function(ui) {
				var item = generateUIItemFn(ui, false);
				
				item.appendTo(uisList.list('content'));
			})(list[i]);
		}

		callLoadedFn(1);
	}, function(response) {
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur le interfaces install&eacute;s');
	}]);
};

displayUIsFn();