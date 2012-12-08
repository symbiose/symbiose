(function() {
	if (!Webos.Compiz) {
		Webos.Compiz = {};
	}

	if (Webos.Compiz.Reviver) {
		return;
	}

	var Reviver = {};

	Reviver.revive = function $_WCompiz_Reviver_revive(callback) {
		callback = Webos.Callback.toCallback(callback);

		Webos.User.get([function(user) {
			if (user) {
				Webos.File.get('~/.cache/compiz/saved-session.json').readAsText([function(json) {
					var data = JSON.parse(json);

					$.webos.window.main.windowsDisplay(data.windowsDisplay);

					if (data.openedWindows) {
						for (var i = 0; i < data.openedWindows.length; i++) {
							W.Cmd.execute(data.openedWindows[i].cmd);
						}
					}

					callback.success();
				}, callback.error]);
			} else {
				callback.error();
			}
		}, callback.error]);
	};

	Reviver._getSessionData = function $_WCompiz_Reviver__getSessionData() {
		var $openedWindows = $.webos.window.main.list();
		var openedWindows = [];
		$openedWindows.each(function() {
			var $mainWindow = $(this);
			if ($mainWindow.length && $.webos.widget.is($mainWindow, 'window') && $mainWindow.window('is', 'opened') && typeof $mainWindow.window('pid') == 'number') {
				var process = Webos.Process.get($mainWindow.window('pid'));
				if (Webos.isInstanceOf(process, Webos.Cmd)) {
					openedWindows.push({
						cmd: process.cmdText
					});
				}
			}
		});

		return {
			windowsDisplay: $.webos.window.main.windowsDisplay(),
			openedWindows: openedWindows
		};
	};
	Reviver.save = function $_WCompiz_Reviver_save(callback) {
		callback = Webos.Callback.toCallback(callback);

		var data = Reviver._getSessionData();

		Webos.User.get([function(user) {
			if (user) {
				Webos.File.get('~/.cache/compiz/saved-session.json').writeAsText(JSON.stringify(data), [function() {
					callback.success();
				}, callback.error]);
			} else {
				callback.error();
			}
		}, callback.error]);
	};
	Reviver.saveSync = function $_WCompiz_Reviver_save(callback) {
		callback = Webos.Callback.toCallback(callback);

		var data = Reviver._getSessionData();

		Webos.User.get([function(user) {
			if (user) {
				var call = Webos.File.get('~/.cache/compiz/saved-session.json')._writeAsText(JSON.stringify(data));
				call.options.async = false;
				call.load([function() {
					callback.success();
				}, callback.error]);
			} else {
				callback.error();
			}
		}, callback.error]);
	};

	Webos.Compiz.Reviver = Reviver;
})();