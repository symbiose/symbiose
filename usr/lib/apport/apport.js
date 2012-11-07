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
	Apport.reportError = function(error) {
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

		body = 'Enter a description of the bug here...'+"\n"+'* * *'+"\n"+'```'+"\n"+message+"\n"+process+"\n"+stack+"\n"+'```';

		return Apport.report(title, body);
	};

	//Export library
	window.Apport = Apport;
})();