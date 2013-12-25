(function () {
	var showError = function (err) {
		$('#slym-inner .slym-error').hide().html(err.message).slideDown();
		$('#slym-password').val('').focus();
	};

	var setLoading = function (value) {
		if (value) {
			$('#slym-inner .slym-loading').slideDown();
			$('#slym-username, #slym-password, #slym-login-btn').prop('disabled', true);
		} else {
			$('#slym-inner .slym-loading').slideUp();
			$('#slym-username, #slym-password, #slym-login-btn').prop('disabled', false);
		}
	};

	var login = function() {
		setLoading(true);
		W.User.login($('#slym-username').val(), $('#slym-password').val(), [function() {
			getDesktopUi(function(ui) {
				W.UserInterface.load(ui.get('name'));
			});
		}, function(res) {
			setLoading(false);
			showError(res.getError());
		}]);
	};

	var getDesktopUi = function (callback) {
		callback = Webos.Callback.toCallback(callback);

		W.UserInterface.getList([function(list) {
			var desktopUi;
			for (var i = 0; i < list.length; i++) {
				var ui = list[i];
				if (jQuery.inArray('userInterface', ui.get('labels')) != -1) {
					if (ui.get('default') || !desktopUi) {
						desktopUi = ui;
					}
				}
			}
			callback.success(desktopUi);
		}, callback.error]);
	};

	var launchApp = function (app, callback) {
		callback = Webos.Callback.toCallback(callback);

		getDesktopUi([function(ui) {
			window.location.href = Webos.buildWebosUrl({
				ui: ui.get('name'),
				app: app
			});
		}, callback.error]);
	};

	var register = function(callback) {
		launchApp('gnome-register', callback);
	};
	var forgotPassword = function(callback) {
		launchApp('gnome-forgot-password', callback);
	};

	$('#slym-inner').submit(function (e) {
		e.preventDefault();
		login();
	})

	$('#slym-username').keyup(function () {
		if ($('#slym-username').val().length > 0) {
			$('#slym-inner').removeClass('slym-nosubmit');
		}
	});

	$('#slym-register-btn').click(function (e) {
		e.preventDefault();
		register();
	});
	$('#slym-forgot-password-btn').click(function (e) {
		e.preventDefault();
		forgotPassword();
	});

	Webos.User.canResetPassword([function(data) {
		if (!data.enabled) {
			$('#slym-forgot-password-btn').hide();
			$('#slym-inner .slym-links-separator').hide();
		}
	}, function() {}]);
	Webos.User.canRegister([function(data) {
		if (!data.register) {
			$('#slym-register-btn').hide();
			$('#slym-inner .slym-links-separator').hide();
		}
	}, function() {}]);

	Webos.Translation.load(function(t) {
		$('#slym-username').attr('placeholder', t.get('Username'));
		$('#slym-password').attr('placeholder', t.get('Password'));
		$('#slym-inner .slym-loading .slym-loading-inner').html(t.get('Loading...'));
		$('#slym-forgot-password-btn').html(t.get('Forgot password ?'));
		$('#slym-register-btn').html(t.get('Register'));
	}, 'slym');

	$('#slym-username').focus();
})();