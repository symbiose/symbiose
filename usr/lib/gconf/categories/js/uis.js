var confWindow = args.getParam(0);

var uisList = $.w.list(['Nom', 'Type', 'Activ&eacute;e', 'Par d&eacute;faut']).appendTo(confWindow.window('content'));

var uisTypes = {
	'ui': 'Environnement de bureau',
	'lm': 'Gestionnaire de connexion'
};
var _generatedUIItems = [];
var generateUIItemFn = function(data, enabled) {
	if (!enabled && $.inArray(data.name, _generatedUIItems) != -1) {
		return $();
	}
	
	_generatedUIItems.push(data.name);
	
	var enabledSelector = $.w.switchButton('', enabled).bind('switchbuttonchange', function() {
		confWindow.window('loading', true);
		var selector = $(this);
		selector.switchButton('disabled', true);
		var enabled = selector.switchButton('value');
		W.UserInterface.setEnabled(data.name, (enabled) ? 1 : 0, new W.Callback(function() {
			confWindow.window('loading', false);
			selector.switchButton('disabled', false);
			if (!enabled) {
				defaultSelector.switchButton('value', false).switchButton('disabled', true);
			} else {
				defaultSelector.switchButton('disabled', false);
			}
		}, function(response) {
			confWindow.window('loading', false);
			selector.switchButton('toggle').switchButton('disabled', false);
			response.triggerError('Impossible de modifier les param&egrave;tres sur les interfaces');
		}));
	});
	var defaultIsChanging = false;
	var defaultSelector = $.w.switchButton('', data['default']).bind('switchbuttonchange', function() {
		if (defaultIsChanging) {
			return;
		}
		
		defaultIsChanging = true;
		confWindow.window('loading', true);
		var selector = $(this);
		W.UserInterface.setDefault(data.name, (selector.switchButton('value')) ? 1 : 0, new W.Callback(function() {
			confWindow.window('loading', false);
			defaultIsChanging = false;
		}, function(response) {
			confWindow.window('loading', false);
			selector.switchButton('toggle');
			defaultIsChanging = false;
			response.triggerError('Impossible de modifier les param&egrave;tres sur les interfaces');
		}));
	});
	
	if (!enabled) {
		defaultSelector.switchButton('disabled', true);
	}
	
	return $.w.listItem([(typeof data.attributes.displayname != 'undefined') ? '<strong>'+data.attributes.displayname+'</strong> (<em>'+data.name+'</em>)' : '<strong>'+data.name+'</strong>', uisTypes[data.type], enabledSelector, defaultSelector]);
};
var displayUIsFn = function() {
	uisList.list('content').empty();

	confWindow.window('loading', true);
	
	W.UserInterface.getList(new W.Callback(function(data) {
		for (var index in data) {
			(function(data) {
				var item = generateUIItemFn(data, true);
				
				item.appendTo(uisList.list('content'));
			})(data[index]);
		}
		
		confWindow.window('loading', false);
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur les interfaces utilisateur');
	}));
	
	W.UserInterface.getInstalled([function(data) {
		for (var index in data) {
			(function(attributes) {
				var item = generateUIItemFn({
					name: index,
					type: 'ui',
					attributes: attributes
				}, false);
				
				item.appendTo(uisList.list('content'));
			})(data[index]);
		}
	}, function(response) {
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur le interfaces install&eacute;s');
	}]);
};

displayUIsFn();