Webos.require([], function () {
	W.xtag.loadUI('/usr/share/templates/symersion/main.html', function(mainWindow) {
		var $win = $(mainWindow);
		$win.window('open').window('loading', true);

		Webos.Translation.load(function (t) {
			$win
				.window('option', 'title', t.get('Welcome in Symbiose!'))
				.window('loading', false);

			var currentIndex = 0;
			var goToSlide = function(newIndex) {
				var $slides = $win.find('.slides > .slide');

				if (newIndex < 0) {
					newIndex = 0;
				}
				if (newIndex > $slides.length - 1) {
					newIndex = $slides.length - 1;
				}

				$win.find('.slides-ctn .slides').animate({
					left: - newIndex*100 + '%'
				});
				currentIndex = newIndex;
			};
			var goToSlideRelative = function(offset) {
				goToSlide(currentIndex + offset);
			};
			var previousSlide = function () {
				goToSlideRelative(-1);
			};
			var nextSlide = function () {
				goToSlideRelative(1);
			};

			var loginUser = function(callback) {
				callback = Webos.Callback.toCallback(callback);

				$win.window('loading', true);

				Webos.User.getLogged([function(user) {
					if (!user) {
						Webos.User.login('demo', 'demo', [function (user) {
							$win.window('loading', false);
							callback.success(user);
						}, function (resp) {
							$win.window('loading', false);
							callback.error(resp);
						}]);
					} else {
						$win.window('loading', false);
						callback.success(user);
					}
				}, function (resp) {
					$win.window('loading', false);
					callback.error(resp);
				}]);
			};
			var startTour = function() {
				loginUser(function () {
					nextSlide();
				});
			};
			var endTour = function() {
				$win.window('close');
			};

			$win.find('.slide-welcome .btn-start').click(function () {
				startTour();
			});
			$win.find('.slide-welcome .btn-close').click(function () {
				endTour();
			});
			$win.find('.btn-next').click(function () {
				nextSlide();
			});
			$win.find('.btn-previous').click(function () {
				previousSlide();
			});
			$win.find('.btn-restart').click(function () {
				goToSlide(0);
			});

			$win.find('.slide-customize .btn-customize').click(function () {
				W.Cmd.execute('gconf --category=appearance');
			});
			$win.find('.slide-accessories .btn-accessories').click(function () {
				if (window.Shell) { //GNOME Shell ?
					Shell.show();
					Shell.showAllApps();
				} else {
					W.Cmd.execute('software-center');
				}
			});
			$win.find('.slide-music .btn-music').click(function () {
				W.Cmd.execute('gnome-music');
			});
			$win.find('.slide-interfaces .btn-interfaces').click(function () {
				W.Cmd.execute('cameleon');
			});
			$win.find('.slide-cloud .btn-cloud').click(function () {
				W.Cmd.execute('nautilus-mounter');
			});
			$win.find('.slide-thanks .btn-register').click(function () {
				W.Cmd.execute('gnome-register');
			});
		}, 'symersion');
	});
});