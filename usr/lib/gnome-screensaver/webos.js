//Load dependencies
Webos.require('/usr/share/css/gnome-screensaver/main.css', function() {
	if (window.GnomeScreenSaver) { //If library is already loaded
		return;
	}

	var GnomeScreenSaver = {};

	GnomeScreenSaver._status = false;
	GnomeScreenSaver._locked = false;
	GnomeScreenSaver._$screensaver = $();
	GnomeScreenSaver._$screenlocker = $();
	GnomeScreenSaver._screenlockerClockInterval = null;

	/**
	 * Get the screensaver's status.
	 * @returns {Boolean} True if the screensaver is activated, false if not.
	 */
	GnomeScreenSaver.activated = function activated() {
		return GnomeScreenSaver._status;
	};
	GnomeScreenSaver.setStatus = function setStatus(value) {
		value = (value) ? true : false;

		if (!Webos.UserInterface.Booter.current()) { //No interface loaded
			return false;
		}

		if (value == GnomeScreenSaver.activated()) { //If we don't want to change the screensaver's status
			return;
		}

		var booter = Webos.UserInterface.Booter.current();

		if (value) { //Activate the screensaver
			GnomeScreenSaver._$screensaver = $('<div></div>', { id: 'gnome-screensaver' })
				.hide()
				.one('mousemove', function() {
					GnomeScreenSaver.deactivate();
				})
				.appendTo(booter.element())
				.fadeIn();
		} else { //Desactivate the screensaver
			GnomeScreenSaver._$screensaver.stop().fadeOut('fast', function() {
				$(this).remove();
			});
		}

		GnomeScreenSaver._status = value;
	};
	GnomeScreenSaver.activate = function activate() {
		GnomeScreenSaver.setStatus(true);
	};
	GnomeScreenSaver.deactivate = function deactivate() {
		GnomeScreenSaver.setStatus(false);
	};

	GnomeScreenSaver.locked = function locked() {
		return GnomeScreenSaver._locked;
	};
	GnomeScreenSaver.lock = function lock() {
		if (!Webos.UserInterface.Booter.current()) { //No interface loaded
			return false;
		}

		if (GnomeScreenSaver.locked()) {
			return;
		}

		Webos.Translation.load(function(t) {
			GnomeScreenSaver._$screenlocker = $('<div></div>', { id: 'gnome-screenlocker' });

			var $prompt = $('<div></div>', { 'class': 'screenlocker-prompt' }).hide().appendTo(GnomeScreenSaver._$screenlocker),
				$overlay = $('<div></div>', { 'class': 'screenlocker-overlay' }).hide().appendTo(GnomeScreenSaver._$screenlocker),
				$desktopBar = $('<div></div>', { 'class': 'desktop-bar' }).appendTo(GnomeScreenSaver._$screenlocker);

			if (Webos.Theme && Webos.Theme.current()) {
				Webos.Theme.current().applyBackgroundOn($overlay);
			}

			var $clockContainer = $('<div></div>', { 'class': 'clock-container' }).appendTo($overlay),
				$clock = $('<div></div>', { 'class': 'clock' }).appendTo($clockContainer),
				$time = $('<div></div>', { 'class': 'clock-time' }).appendTo($clock),
				$date = $('<div></div>', { 'class': 'clock-date' }).appendTo($clock);
			
			var showTimeFn = function() {
				var locale = Webos.Locale.current();

				var time = locale.time(new Date()), date = locale.date(new Date());

				$time.html(time);
				$date.html(date);
			};

			setTimeout(function() { //Quand la minute actuelle est passee
				GnomeScreenSaver._screenlockerClockInterval = setInterval(function() { //On rafraichit l'heure toutes les minutes
					showTimeFn();
				}, 60000);
				
				showTimeFn();
			}, (60 - new Date().getSeconds()) * 1000);

			showTimeFn(); //On affiche l'heure

			$('<div></div>', { 'class': 'arrow-up' }).appendTo($overlay);

			var $barRealname = $('<span></span>').html('User');
			$('<ul></ul>', { 'class': 'menu' }).append(
				$('<li></li>').append(
					$.webos.image(new Webos.Icon('status/lock-symbolic', 16)).addClass('icon'),
					$barRealname
				)
			).appendTo($desktopBar);

			//Now insert element in the DOM
			if (GnomeScreenSaver.activated()) {
				GnomeScreenSaver._$screenlocker.insertBefore(GnomeScreenSaver._$screensaver);
			} else {
				var booter = Webos.UserInterface.Booter.current();
				GnomeScreenSaver._$screenlocker.appendTo(booter.element());
			}

			var height = GnomeScreenSaver._$screenlocker.height(), width = GnomeScreenSaver._$screenlocker.width();

			$overlay.ui_draggable({
				containment: [ 0, - height, 0, 0 ],
				axis: 'y'
			});
			$overlay.css('top', - height).show().animate({
				top: 0
			});

			var $formContainer = $('<div></div>', { 'class': 'form-container' }).appendTo($prompt),
				$form = $.w.entryContainer().addClass('form').appendTo($formContainer);
			$.webos.image(new Webos.Icon('stock/person')).addClass('form-avatar').appendTo($form);
			var $realname = $('<div></div>', { 'class': 'form-realname' }).html('User').appendTo($form),
				$password = $.w.passwordEntry(t.get('Password :')).addClass('form-passwordentry').appendTo($form),
				$error = $('<div></div>', { 'class': 'form-error' }).appendTo($form),
				$buttons = $.w.buttonContainer().appendTo($form);
			$.w.button(t.get('Cancel')).click(function() {
				$overlay.animate({
					top: 0
				});
			}).appendTo($buttons);
			var $submitButton = $.w.button(t.get('Unlock'), true).addClass('form-submit').appendTo($buttons);

			Webos.User.get([function(user) {
				$overlay.bind('dragstop', function(event, ui) {
					var ratio = - ui.position.top / height;

					if (ratio > 0.2) {
						$overlay.animate({
							top: - height
						}, 'normal', 'linear', function() {
							if (!user) {
								GnomeScreenSaver._unlock();
							} else {
								$password.passwordEntry('content').focus();
							}
						});
					} else {
						$overlay.animate({
							top: 0
						});
					}
				});
				$overlay.bind('dragstart', function(event, ui) {
					if (user) {
						$prompt.show();
					}
				});

				$form.submit(function() {
					$submitButton.button('option', 'disabled', true);
					Webos.User.login(user.get('username'), $password.passwordEntry('value'), [function() {
						GnomeScreenSaver._unlock();
					}, function(response) {
						$error.html(response.getErrorsChannel());
						$password.passwordEntry('content').focus();
						$submitButton.button('option', 'disabled', false);
					}]);
				});

				if (user) {
					$realname.html(user.get('realname'));
					$barRealname.html(user.get('realname'));

					Webos.User.logout([function() {}, function() {}]);
				} else {
					$prompt.hide();
				}
			}, function() {}]);
		}, 'gnome-screensaver');

		GnomeScreenSaver._locked = true;
	};
	GnomeScreenSaver._unlock = function() {
		if (!GnomeScreenSaver.locked()) {
			return;
		}

		GnomeScreenSaver._$screenlocker.fadeOut('fast', function() {
			$(this).remove();
		});

		clearInterval(GnomeScreenSaver._screenlockerClockInterval);

		GnomeScreenSaver._locked = false;
	};

	GnomeScreenSaver.autoActivate = function $_GnomeScreenSaver_autoActivate(time, lock, lockTime) {
		if (typeof GnomeScreenSaver.autoActivate._timer != 'undefined') {
			clearInterval(GnomeScreenSaver.autoActivate._timer);
			delete GnomeScreenSaver.autoActivate._timer;
		}

		if (!(time > 0)) {
			return;
		}

		var mouseMoved = false;
		$(document).off('mousemove.gnomescreensaver').on('mousemove.gnomescreensaver', function() {
			mouseMoved = true;
		});

		GnomeScreenSaver.autoActivate._timer = setInterval(function() {
			if (!mouseMoved) {
				if (lock) {
					if (lockTime > 0) {
						if (typeof GnomeScreenSaver.autoActivate._lockTimer == 'undefined') {
							GnomeScreenSaver.autoActivate._lockTimer = setTimeout(function() {
								delete GnomeScreenSaver.autoActivate._lockTimer;
								GnomeScreenSaver.lock();
							}, lockTime * 1000);
						}
						GnomeScreenSaver.activate();
					} else {
						GnomeScreenSaver.lock();
						GnomeScreenSaver.activate();
					}
				} else {
					GnomeScreenSaver.activate();
				}
			} else {
				mouseMoved = false;
				if (typeof GnomeScreenSaver.autoActivate._lockTimer != 'undefined') {
					clearInterval(GnomeScreenSaver.autoActivate._lockTimer);
					delete GnomeScreenSaver.autoActivate._lockTimer;
				}
			}
		}, time * 1000);
	};

	GnomeScreenSaver.loadConfig = function $_GnomeScreenSaver_loadConfig(callback) {
		callback = Webos.Callback.toCallback(callback);

		Webos.ConfigFile.loadUserConfig('~/.config/exiting.xml', null, [function(configFile) {
			var shutdownScreenTime = 0, lockScreen = false, lockTime = 0;
			if (configFile.get('shutdownScreen') > 0) {
				shutdownScreenTime = parseFloat(configFile.get('shutdownScreen')) * 60;
				lockScreen = (configFile.get('lockScreenEnabled') == 1);

				if (lockScreen) {
					lockTime = parseFloat(configFile.get('lockScreenTime')) * 60;
				}
			}

			GnomeScreenSaver.autoActivate(shutdownScreenTime, lockScreen, lockTime);

			callback.success();
		}, callback.error]);
	};

	window.GnomeScreenSaver = GnomeScreenSaver; //Export library
});