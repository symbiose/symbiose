var confWindow = args.getParam(0);

confWindow.window('dialog', true);

var uisList = $.w.list(['Nom', 'Type', 'Activ&eacute;e', 'Par d&eacute;faut']).appendTo(confWindow.window('content'));

var uisTypes = {
	'ui': 'Environnement de bureau utilisateur',
	'gi': 'Environnement de bureau invit&eacute;'
};
var _generatedUIItems = [];
var generateUIItemFn = function(ui, enabled) {
	if (!enabled && $.inArray(ui.get('name'), _generatedUIItems) != -1) {
		return $();
	}
	
	_generatedUIItems.push(ui.get('name'));
	
	var enabledSelector = $.w.switchButton('', enabled).bind('switchbuttonchange', function() {
		confWindow.window('loading', true);
		var $selector = $(this);
		$selector.switchButton('disabled', true);
		var enabled = $selector.switchButton('value');

		ui.set('enabled', enabled);
		ui.sync([function() {
			confWindow.window('loading', false);
			$selector.switchButton('disabled', false);
			if (!enabled) {
				defaultSelector.switchButton('value', false).switchButton('disabled', true);
			} else {
				defaultSelector.switchButton('disabled', false);
			}
		}, function(response) {
			confWindow.window('loading', false);
			$selector.switchButton('toggle').switchButton('disabled', false);
			response.triggerError('Impossible de modifier les param&egrave;tres sur les interfaces');
		}]);
	});
	var defaultIsChanging = false;
	var defaultSelector = $.w.switchButton('', ui.get('default')).bind('switchbuttonchange', function() {
		if (defaultIsChanging) {
			return;
		}

		defaultIsChanging = true;
		confWindow.window('loading', true);
		var $selector = $(this);

		ui.set('default', $selector.switchButton('value'));
		ui.sync([function() {
			confWindow.window('loading', false);
			defaultIsChanging = false;
		}, function(response) {
			confWindow.window('loading', false);
			$selector.switchButton('toggle');
			defaultIsChanging = false;
			response.triggerError('Impossible de modifier les param&egrave;tres sur les interfaces');
		}]);
	});
	
	if (!enabled) {
		defaultSelector.switchButton('disabled', true);
	}

	var types = [];
	for (var i = 0; i < ui.get('types').length; i++) {
		types.push(uisTypes[ui.get('types')[i]]);
	} 
	
	return $.w.listItem([(typeof ui.get('displayname') != 'undefined') ? '<strong>'+ui.get('displayname')+'</strong> (<em>'+ui.get('name')+'</em>)' : '<strong>'+ui.get('name')+'</strong>', types.join('<br />'), enabledSelector, defaultSelector]);
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