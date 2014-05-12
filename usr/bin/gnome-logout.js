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
			Webos.User.logout([function() {
				W.UserInterface.getList([function(list) {
					logoutWindow.window('close');

					var guestUi,
						currentUi = Webos.UserInterface.Booter.current().name();
					for (var i = 0; i < list.length; i++) {
						var ui = list[i];

						if (~ui.get('labels').indexOf('guestInterface') && ui.get('default')) {
							if (!guestUi || !guestUi.get('default')) {
								guestUi = ui;
							} else if (currentUi == ui.get('name')) {
								guestUi = null;
								return;
							}
						}
					}

					if (guestUi && currentUi != guestUi.get('name')) {
						W.UserInterface.load(guestUi.get('name'));
					}
				}, function() {
					logoutWindow.window('close');
				}]);
			}, function (resp) {
				logoutWindow.window('loading', false);
				resp.triggerError();
			}]);
		})
		.appendTo(buttonContainer);
}, 'gnome');