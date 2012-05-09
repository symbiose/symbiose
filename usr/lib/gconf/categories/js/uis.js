var confWindow = args.getParam(0);

var uisList = $.w.list(['Nom', 'Type', 'Activ&eacute;e', 'Par d&eacute;faut']).appendTo(confWindow.window('content'));

var uisTypes = {
	'ui': 'Environnement de bureau',
	'lm': 'Gestionnaire de connexion'
};
var displayUIsFn = function() {
	uisList.list('content').empty();

	confWindow.window('loading', true);
	
	W.UserInterface.getList(new W.Callback(function(data) {
		for (var index in data) {
			(function(data) {
				var activatedSelector = $.w.switchButton('', true).switchButton('disabled', true);
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
				var item = $.w.listItem([(typeof data.attributes.displayname != 'undefined') ? '<strong>'+data.attributes.displayname+'</strong> (<em>'+data.name+'</em>)' : '<strong>'+data.name+'</strong>', uisTypes[data.type], activatedSelector, defaultSelector]);
				
				item.appendTo(uisList.list('content'));
			})(data[index]);
		}
		
		confWindow.window('loading', false);
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur les d&eacute;p&ocirc;ts');
	}));
};

displayUIsFn();