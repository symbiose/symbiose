//Initialize logout window
var logoutWindow = $.w.window.main({
	icon: new W.Icon('actions/logout'),
	title: 'Logout',
	width: 320,
	resizable: false
});

//Open the window
logoutWindow.window('open').window('loading', true);

Webos.Translation.load(function(t) {
	logoutWindow.window('loading', false);
	
	logoutWindow.window('option', 'title', t.get('Logout'));
	
	var logoutWindowContents = logoutWindow.window('content');

	//Window's contents
	$('<img />').attr('src', new W.Icon('actions/logout'))
		.css('float', 'left')
		.appendTo(logoutWindowContents);

	logoutWindowContents.append(t.get('Do you want to leave all applications and logout ?'));
	var buttonContainer = $.w.buttonContainer().appendTo(logoutWindowContents);
	$.w.button(t.get('Cancel'))
		.appendTo(buttonContainer)
		.click(function() {
			logoutWindow.window('close');
		});
	$.w.button(t.get('Logout'))
		.click(function() {
			logoutWindow.window('loading', true);
			Webos.User.logout(new W.Callback(function() {
				logoutWindow.window('close');
			}));
		})
		.appendTo(buttonContainer);
}, 'gnome');