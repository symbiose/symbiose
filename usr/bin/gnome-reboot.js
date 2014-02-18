//On initialise la fenetre de deconnexion
var rebootWindow = $.w.window.main({
	icon: new W.Icon('actions/reload'),
	title: 'Reboot',
	width: 320,
	resizable: false
});

//On ouvre la fenetre
rebootWindow.window('open').window('loading', true);

Webos.Translation.load(function(t) {
	rebootWindow.window('loading', false);
	rebootWindow.window('option', 'title', t.get('Reboot'));

	//Window's contents
	var rebootWindowContents = rebootWindow.window('content');

	$('<img />').attr('src', new W.Icon('actions/reload'))
		.css('float', 'left')
		.appendTo(rebootWindowContents);

	rebootWindowContents.append(t.get('Do you want to leave all applications and reboot ?'));
	var buttonContainer = $.w.buttonContainer().appendTo(rebootWindowContents);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.click(function() {
			rebootWindow.window('close');
		});
	$.w.button(t.get('Reboot'))
		.click(function() {
			W.Cmd.execute('halt', function() {
				window.location.reload();
			});
		})
		.appendTo(buttonContainer);
}, 'gnome');