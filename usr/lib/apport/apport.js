(function() {
	if (window.Apport) {
		return;
	}

	//W.ScriptFile.load('/usr/lib/webos/applications.js');

	var Apport = {};

	Apport._repo = 'symbiose/symbiose';
	Apport.report = function(title, body) {
		title = title || '';
		body = body || '';

		var url = 'https://github.com/'+Apport._repo+'/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body)+'&labels=bug';

		//Webos.Application.getByType('web-browser', function(browser) {
		//	if (browser) {
		//		Webos.Cmd.execute(browser.get('command')+' "'+url+'"');
		//	} else {
				window.open(url);
		//	}
		//});
	};
	Apport.reportError = function(error, description) {
		var title = ((error.process) ? error.process.cmd+' - ' : '') + error.message, message, stack, process, body;
		if (error instanceof Webos.Error) {
			message = error.name + ': ' + error.text;
			stack = error.stack.join("\n");
			process = error.processText;
		} else {
			message = error.name + ': ' + error.message;
			stack = 'Stack trace :'+"\n"+error.stack;
			process = (error.process) ? 'Command : "'+error.process.cmdText+'"' : '';
		}

		if (!description) {
			description = 'Enter a description of the bug here...';
		}

		var clientData = 'Browser : "'+navigator.appName+'", version : "'+navigator.appVersion+'", platform : "'+navigator.platform+'", user agent : "'+navigator.userAgent+'"';

		body = description+"\n"+'* * *'+"\n"+'```'+"\n"+message+"\n"+process+"\n"+stack+"\n"+clientData+"\n"+'```';

		return Apport.report(title, body);
	};
	Apport.askDescriptionAndReportError = function(error) {
		var errorWindow = $.webos.window({
			title: 'Error',
			resizable: false,
			width: 400,
			icon: new W.Icon('status/error')
		});
		
		var img = $('<img />', { 'src': new W.Icon('status/error'), 'alt': 'error' }).css('float', 'left');
		errorWindow.window('content').append(img);

		errorWindow.window('content').append('<strong>An error occured.</strong><br />Please enter the description of the bug here (e.g. when did it happened, if you did something special, ...) :');

		var $form = $.w.entryContainer().appendTo(errorWindow.window('content'));

		var $description = $.w.textAreaEntry().appendTo($form);
		$description.textAreaEntry('content').css({
			width: '100%',
			height: 100
		}).focus();

		var buttonContainer = $.webos.buttonContainer();
		$.webos.button('Cancel').click(function() {
			errorWindow.window('close');
		}).appendTo(buttonContainer.buttonContainer('content'));
		$.webos.button('Submit', true).click(function() {
			Apport.reportError(error, $description.textAreaEntry('value'));
			errorWindow.window('close');
		}).appendTo(buttonContainer.buttonContainer('content'));
		$form.append(buttonContainer);
		
		errorWindow.window('open');
	};

	//Export library
	window.Apport = Apport;
})();