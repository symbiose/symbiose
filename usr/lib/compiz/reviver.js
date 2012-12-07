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

					callback.success();
				}, callback.error]);
			} else {
				callback.error();
			}
		}, callback.error]);
	};

	Reviver.save = function $_WCompiz_Reviver_save(callback) {
		callback = Webos.Callback.toCallback(callback);

		var data = {
			windowsDisplay: $.webos.window.main.windowsDisplay()
		};

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

	Webos.Compiz.Reviver = Reviver;
})();