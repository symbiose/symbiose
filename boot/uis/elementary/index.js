(function () {

var booter = W.UserInterface.Booter.current(),
	done = booter.async();

Webos.require({
	path: '/usr/lib/gnome/ini.js',
	optionnal: true
});

//On definit la hauteur du bureau
var resizeDesktopFn = function() {
	$('#desktop').height($(window).height() - $('#header').outerHeight());
	$('#desktop .nautilus').height($(window).height() - $('#header').outerHeight() - 20);
};
$(window).resize(resizeDesktopFn);

//On cree 1 espace de travail
new $.w.window.workspace();

//On definit la fonction de gestion des erreurs
Webos.Error.setErrorHandler(function(error) {
	var shortMessage, message, details, isReportable = true;
	if (error instanceof Webos.Error) {
		shortMessage = error.html.message;
		message = error.html.text.replace('<br />', ' - ');
		details = error.toString();
		isReportable = (error.code === 0 || String(error.code).substr(0, 1) == 5);
	} else {
		shortMessage = error.message;
		message = error.name + ' : ' + error.message;
		process = (error.process) ? 'Process : '+error.process.getPid()+'; command : <em>'+error.process.cmdText+'</em><br />' : '';
		details = error.name + ' : ' + error.message + "<br />"+process+"Stack trace :<br />" + error.stack;
	}

	var errorWindow = $();

	var reportErrorFn = function() {
		Webos.require('/usr/lib/apport/apport.js', function() {
			Apport.askDescriptionAndReportError(error);
			errorWindow.window('close');
		});
	};

	var openWindowFn = function() {
		errorWindow = $.webos.window({
			title: 'Error',
			resizable: false,
			width: 400,
			icon: 'status/error'
		});

		var img = $('<img />', { 'src': new W.Icon('status/error'), 'alt': 'error' }).css('float', 'left');
		errorWindow.window('content').append(img);

		errorWindow.window('content').append('<strong>An error occured.</strong><br />'+message);

		var spoiler = $.w.spoiler('Show details').appendTo(errorWindow.window('content'));

		$('<pre></pre>')
			.html(details)
			.css('height','150px')
			.css('overflow','auto')
			.css('background-color','white')
			.css('padding','2px')
			.appendTo(spoiler.spoiler('content'));

		var buttonContainer = $.webos.buttonContainer();
		if (isReportable) {
			$.webos.button('Report this bug...').click(function() {
				reportErrorFn();
			}).appendTo(buttonContainer.buttonContainer('content'));
		}
		$.webos.button('Close').click(function() {
			errorWindow.window('close');
		}).appendTo(buttonContainer.buttonContainer('content'));
		errorWindow.window('content').append(buttonContainer);

		errorWindow.window('open');
	};

	var notifBtns = [
		$.w.button('Details').click(function() { openWindowFn(); })
	];
	if (isReportable) {
		notifBtns.push($.w.button('Report this bug...').click(function() { reportErrorFn(); }));
	}
	
	$.w.notification({
		title: 'An error occured',
		icon: 'status/error',
		shortMessage: shortMessage,
		message: message,
		widgets: notifBtns
	});
});

Webos.require('/usr/lib/webos/theme.js', function () {
	Webos.Theme.once('load', function() {
		Elementary.init();

		resizeDesktopFn();
		done();
	});
});

})();