var confWindow = args.getParam(0);
confWindow
	.window('stylesheet', '/usr/share/css/gconf/categories/softwarerepositories.css')
	.window('dialog', true);

Webos.require([
	'/usr/lib/apt/apt.js',
	'/usr/lib/confiture/webos.js'
], function() {
	var selectedRepo = null;

	var content = $.w.container().addClass('softwarerepositories').appendTo(confWindow.window('content'));

	var repositoriesList = $.w.list(['Name', 'URL', 'Maintainer']).appendTo(content);

	var addButton = $.w.button('Add a repository...').click(function() {
		var addRepositoryWindow = $.w.window.dialog({
			title: 'Add a repository',
			parentWindow: confWindow
		});

		var form = $.w.entryContainer().appendTo(addRepositoryWindow.window('content'));

		var sourceEntry = $.w.textEntry('Repository URL: ').appendTo(form);
		var nameEntry = $.w.textEntry('Repository name: ').appendTo(form);

		var buttonContainer = $.w.buttonContainer().appendTo(form);
		$.w.button('Cancel').click(function() {
			addRepositoryWindow.window('close');
		}).appendTo(buttonContainer);
		$.w.button('Add', true).appendTo(buttonContainer);
		
		form.submit(function() {
			var repoData = {
				name: nameEntry.textEntry('value'),
				url: sourceEntry.textEntry('value')
			};

			addRepositoryWindow.window('close');
			confWindow.window('loading', true);

			Webos.Confiture.Package.insertRepository(repoData, [function() {
				confWindow.window('loading', false);
				confirmPackageUpdate();
			}, function(res) {
				confWindow.window('loading', false);
				res.triggerError();
			}]);
		});
		
		addRepositoryWindow.window('open');
	});
	repositoriesList.list('addButton', addButton);
	var removeButton = $.w.button('Remove').click(function() {
		if (!selectedRepo) {
			return;
		}
		
		confWindow.window('loading', true);

		Webos.Confiture.Package.deleteRepository(selectedRepo.name, [function() {
			selectedRepo.element.remove();
			confWindow.window('loading', false);
			confirmPackageUpdate();
		}, function(res) {
			confWindow.window('loading', false);
			res.triggerError();
		}]);
	});
	repositoriesList.list('addButton', removeButton);

	var displayRepositoriesFn = function() {
		repositoriesList.list('content').empty();
		removeButton.button('disabled', true);

		confWindow.window('loading', true);

		Webos.Confiture.Package.listRepositories([function(repos) {
			confWindow.window('loading', false);

			for (var i in repos) {
				(function(repoData) {
					var item = $.w.listItem(['<strong>'+repoData.name+'</strong>', repoData.url, '-']);
					
					item.bind('listitemselect', function() {
						selectedRepo = repoData;
						selectedRepo.element = item;
						removeButton.button('disabled', false);
					}).bind('listitemunselect', function() {
						selectedRepo = null;
						removeButton.button('disabled', true);
					});
					
					item.appendTo(repositoriesList.list('content'));
				})(repos[i]);
			}
		}, function(res) {
			confWindow.window('loading', false);
			res.triggerError();
		}]);
	};

	var confirmPackageUpdate = function() {
		var confirmWindow = $.webos.window.confirm({
			title: 'Update cache',
			label: 'Les informations sur les paquets sont obsol&egrave;tes. Voulez-vous mettre &agrave; jour ces informations maintenant ?',
			parentWindow: confWindow,
			confirm: function() {
				var loadingWindow = $.w.window.dialog({
					title: 'Updating cache...',
					resizable : false,
					closeable: false,
					parentWindow: confWindow
				});

				loadingWindowContent = loadingWindow.window('content');

				$.w.image('actions/update').css('float', 'left').appendTo(loadingWindowContent);
				$('<strong></strong>').html('Mise &agrave; jour du cache').appendTo(loadingWindowContent);
				$.w.label('Le cache est en cours de mise &agrave; jour, veuillez patienter quelques instants...').appendTo(loadingWindowContent);

				loadingWindow.window('open');

				Webos.Confiture.Package.updateCache([function(response) {
					loadingWindow.window('close');
					confWindow.window('loading', false);
					displayRepositoriesFn();
				}, function(response) {
					loadingWindow.window('close');
					confWindow.window('loading', false);
					response.triggerError();
				}]);
			},
			confirmLabel: 'Update cache',
			cancelLabel: 'Later'
		});
		confirmWindow.window('open');
	};

	displayRepositoriesFn();
});