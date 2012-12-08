var confWindow = args.getParam(0);

new W.ScriptFile('usr/lib/apt/apt.js'); //On charge la bibliotheque JS d'APT

confWindow.window('stylesheet', 'usr/share/css/gconf/categories/softwarerepositories.css').window('dialog', true);

var selectedRepo;

var content = $.w.container().addClass('softwarerepositories').appendTo(confWindow.window('content'));

var repositoriesList = $.w.list(['Nom', 'Source', 'Propri&eacute;taire']).appendTo(content);

var addButton = $.w.button('Ajouter un d&eacute;p&ocirc;t...').click(function() {
	var addRepositoryWindow = $.w.window.dialog({
		title: 'Ajouter un d&eacute;p&ocirc;t',
		parentWindow: confWindow
	});
	
	var form = $.w.entryContainer().appendTo(addRepositoryWindow.window('content'));
	
	var sourceEntry = $.w.textEntry('URL du d&eacute;p&ocirc;t : ').appendTo(form);
	
	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.w.button('Annuler').click(function() {
		addRepositoryWindow.window('close');
	}).appendTo(buttonContainer);
	$.w.button('Valider', true).appendTo(buttonContainer);
	
	form.submit(function() {
		var source = sourceEntry.textEntry('value');
		
		addRepositoryWindow.window('close');
		confWindow.window('loading', true);
		
		new W.ServerCall({
			'class': 'PackageController',
			'method': 'addRepository',
			'arguments': {
				'source': source
			}
		}).load(new W.Callback(function() {
			confWindow.window('loading', false);
			confirmPackageUpdate();
		}, function(response) {
			confWindow.window('loading', false);
			response.triggerError('Impossible d\'ajouter le d&eacute;p&ocirc;t "'+source+'"');
		}));
	});
	
	addRepositoryWindow.window('open');
});
repositoriesList.list('addButton', addButton);
var removeButton = $.w.button('Supprimer').click(function() {
	if (typeof selectedRepo == 'undefined') {
		return;
	}
	
	confWindow.window('loading', true);
	
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'removeRepository',
		'arguments': {
			'source': selectedRepo.source
		}
	}).load(new W.Callback(function() {
		selectedRepo.element.remove();
		confWindow.window('loading', false);
		confirmPackageUpdate();
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de supprimer le d&eacute;p&ocirc;t "'+selectedRepo.source+'"');
	}));
});
repositoriesList.list('addButton', removeButton);

var displayRepositoriesFn = function() {
	repositoriesList.list('content').empty();
	removeButton.button('disabled', true);

	confWindow.window('loading', true);

	var callback = new W.Callback(function(response) {
		var data = response.getData();
		
		for (var index in data) {
			(function(data) {
				var item = $.w.listItem(['<strong>'+data.name+'</strong>', data.source, data.owner]);
				
				item.bind('listitemselect', function() {
					selectedRepo = data;
					selectedRepo.element = item;
					removeButton.button('disabled', false);
				}).bind('listitemunselect', function() {
					selectedRepo = undefined;
					removeButton.button('disabled', true);
				});
				
				item.appendTo(repositoriesList.list('content'));
			})(data[index]);
		}
		
		confWindow.window('loading', false);
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations sur les d&eacute;p&ocirc;ts');
	});
	new W.ServerCall({
		'class': 'PackageController',
		'method': 'getRepositories'
	}).load(callback);
};

var confirmPackageUpdate = function() {
	var confirmWindow = $.webos.window.confirm({
		title: 'Mise &agrave; jour du cache',
		label: 'Les informations sur les paquets sont obsol&egrave;tes. Voulez-vous mettre &agrave; jour ces informations maintenant ?',
		parentWindow: confWindow,
		confirm: function() {
			var loadingWindow = $.w.window.dialog({
				title: 'Mise &agrave; jour du cache',
				resizable : false,
				closeable: false,
				parentWindow: confWindow
			});
			
			loadingWindowContent = loadingWindow.window('content');
			
			$.w.image(new W.Icon('actions/update')).css('float', 'left').appendTo(loadingWindowContent);
			$('<strong></strong>').html('Mise &agrave; jour du cache').appendTo(loadingWindowContent);
			$.w.label('Le cache est en cours de mise &agrave; jour, veuillez patienter quelques instants...').appendTo(loadingWindowContent);
			
			loadingWindow.window('open');
			
			W.Package.updateCache(new W.Callback(function(response) {
				loadingWindow.window('close');
				confWindow.window('loading', false);
				displayRepositoriesFn();
			}, function(response) {
				loadingWindow.window('close');
				confWindow.window('loading', false);
				response.triggerError('Impossible de mettre &agrave; jour le cache');
			}));
		},
		confirmLabel: 'Mettre &agrave; jour les informations',
		cancelLabel: 'Plus tard'
	});
	confirmWindow.window('open');
};

displayRepositoriesFn();