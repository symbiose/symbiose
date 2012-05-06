W.UserInterface.current.callLoaded = false;

//On empeche de faire defiler la page
$(document).scroll(function() {
	$('body').scrollTop(0);
});

//Chargement du theme
STheme.getConfig(new W.Callback(function(theme) {
	theme.load();
}, function(response) {
	response.triggerError('Impossible de r&eacute;cup&eacute;rer les pr&eacute;f&eacute;rences d\'affichage');
}));

//On definit la hauteur du bureau
$(window).resize(function() {
	$('#desktop').height($(window).height() - $('#header').outerHeight());
	$('#desktop .nautilus').height($(window).height() - $('#header').outerHeight() - 20);
});

//On cree 2 espaces de travail
var workspaceId = new SWorkspace().id;
new SWorkspace();
SWorkspace.switchTo(workspaceId);

W.User.defineLogged(new W.Callback(function(user) {
	//Si l'utilisateur n'est pas connecte, on n'affiche pas son bureau
	if (typeof user == 'undefined') {
		return;
	}
	
	//On charge le contenu du bureau
	var desktopFiles = $.w.nautilus({
		multipleWindows: true,
		directory: '~/Bureau/'
	}).one('nautilusreadcomplete', function() {
		$(window).trigger('resize');
	});
	$('#desktop-files').replaceWith(desktopFiles);
}, function() {}));

//On initialise les tableaux de bord
SDashboard.userConfigFile = '~/.gnome-shell/dashboards.xml';
SDashboard.defaultConfigFile = '/usr/etc/uis/gnome-shell/dashboards.xml';
SDashboard.init();

//On definit la fonction de gestion des erreurs
Webos.Error.setErrorHandler(function(error) {
	var message, details;
	if (error instanceof Webos.Error) {
		message = error.html.message;
		details = error.toString();
	} else {
		message = details = error.name + ' : ' + error.message;
	}
	
	var openWindowFn = function() {
		var errorWindow = $.webos.window({
			title: 'Erreur',
			resizable: false,
			width: 400,
			icon: new SIcon('status/error')
		});
		
		var img = $('<img />', { 'src': new SIcon('status/error'), 'alt': 'erreur' }).css('float', 'left');
		errorWindow.window('content').append(img);
		
		errorWindow.window('content').append('<strong>Une erreur est survenue.</strong><br />'+message);
		
		var spoiler = $.w.spoiler('Voir plus d\'informations').appendTo(errorWindow.window('content'));
		
		$('<pre></pre>')
			.html(details)
			.css('height','150px')
			.css('overflow','auto')
			.css('background-color','white')
			.css('padding','2px')
			.appendTo(spoiler.spoiler('content'));
		
		var buttonContainer = $.webos.buttonContainer();
		var closeButton = $.webos.button('Fermer');
		closeButton.click(function() {
			errorWindow.window('close');
		});
		buttonContainer.buttonContainer('content').append(closeButton);
		errorWindow.window('content').append(buttonContainer);
		
		errorWindow.window('open');
	};
	
	$.w.notification({
		title: 'Une erreur est survenue',
		message: message,
		buttons: [$.w.button('D&eacute;tails').click(function() { openWindowFn(); })]
	});
});

$(window).bind('servercallstop', function() {
	W.UserInterface.current.loaded();
});