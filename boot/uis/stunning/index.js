W.UserInterface.Booter.current().disableAutoLoad();

(function() {
	var Stunning = {
		//Options
		_bordersGesturesTolerance: 30,

		//Elements
		_$tagsContainer: $('#tags-container'),
		_overlays: {
			top: $('#overlay-top'),
			bottom: $('#overlay-bottom')
		},
		_$appsContent: $('#apps-content'),
		_$welcomeContainer: $('#welcome-container'),

		//Private variables
		_openedOverlay: null,
		_layouts: {
			maximized: {
				addClient: function($clientFrame, options) {
					$clientFrame.css({
						width: '100%',
						height: '100%'
					});
				},
				removeClient: function($clientFrame, options) {}
			},
			rows: {
				options: {
					primaryRow: 'top'
				},
				addClient: function($clientFrame, options) {
					var nbrClients = $(this).children('.client-frame').length;

					var rules = {
						height: '50%'
					};

					if (nbrClients == 1) {
						rules.width = '100%';

						$clientFrame.css(rules);
					} else {
						rules.bottom = 0;

						var nbrSecondaryClients = nbrClients - 1;
						rules.width = (100 / nbrSecondaryClients) + '%';

						$(this).children('.client-frame').filter(function (index) {
							return (index >= 1);
						}).each(function () {
							var clientFrameRules = jQuery.extend({}, rules, {
								left: (100 - 100 / (nbrSecondaryClients / $(this).index())) + '%'
							});

							$(this).css(clientFrameRules);
						});
					}
				},
				removeClient: function($clientFrame, options) {}
			}
		},
		_tags: [],
		_currentTag: 0
	};

	Stunning._initPreventScrolling = function() {
		//Some mobile devices have default behaviors for touchmove, such as the classic iOS 
		//overscroll effect, which causes the view to bounce back when scrolling exceeds the 
		//bounds of the content.
		$('body').on('touchmove', 'body', function(event) {
			event.preventDefault();
		});
	};

	Stunning._initBordersGestures = function() {
		var startedGestures = [], gesturesData = {};
		var touchstartTimeStamp, touchmoveTimeStamp;

		var _docDimentions = null;
		var getDocDimentions = function() {
			if (!_docDimentions) {
				_docDimentions = {
					width: $(document).width(),
					height: $(document).height()
				};
			}

			return _docDimentions;
		};
		$(window).resize(function() {
			_docDimentions = null;
		});

		var gestureStarted = false;
		$(document).hammer().on('drag', function(e) {
			var gestureOriginBorder;
			var gestureOriginPos = e.gesture.startEvent.center;

			if (gestureOriginPos.pageY < Stunning._bordersGesturesTolerance) {
				gestureOriginBorder = 'top';
			} else if (gestureOriginPos.pageX < Stunning._bordersGesturesTolerance) {
				gestureOriginBorder = 'left';
			} else if (gestureOriginPos.pageY > getDocDimentions().height - Stunning._bordersGesturesTolerance) {
				gestureOriginBorder = 'bottom';
			} else if (gestureOriginPos.pageX > getDocDimentions().width - Stunning._bordersGesturesTolerance) {
				gestureOriginBorder = 'right';
			}

			if (!gestureOriginBorder) { //Not a border gesture
				return;
			}

			var borderGesturesOrigins = {
				up: 'bottom',
				down: 'top',
				left: 'right',
				right: 'left'
			};

			if (borderGesturesOrigins[e.gesture.direction] != gestureOriginBorder) { //Bad direction for origin border
				return;
			}

			var gestureCurrentPos = e.gesture.center;

			var eventData = {
				identifier: e.gesture.touches[0].identifier || 0,
				origin: gestureOriginBorder,
				direction: e.gesture.direction,
				x: gestureCurrentPos.pageX,
				y: gestureCurrentPos.pageY
			};
			if (!gestureStarted) {
				Stunning.trigger('bordergesturestart', eventData);
				gestureStarted = true;

				$(document).hammer().one('dragend', function(e) {
					gestureStarted = false;
					Stunning.trigger('bordergestureend', {
						identifier: e.gesture.touches[0].identifier || 0,
						origin: gestureOriginBorder,
						direction: e.gesture.direction,
						x: e.gesture.center.pageX,
						y: e.gesture.center.pageY
					});

					e.gesture.preventDefault();
					e.stopImmediatePropagation();
				});
			} else {
				Stunning.trigger('bordergesturemove', eventData);
			}

			e.gesture.preventDefault();
			e.stopImmediatePropagation();
		});
	};

	Stunning._initTopOverlay = function() {
		Stunning.on('bordergesturestart', function(eventData) {
			if (eventData.origin == 'top' && !Stunning.isOverlayOpened('top')) {
				Stunning.on('bordergesturemove.topoverlay.stunning', function(eventData) {
					Stunning._overlays.top.height(eventData.y);
				});

				Stunning.once('bordergestureend', function(eventData) {
					Stunning.off('bordergesturemove.topoverlay.stunning');

					if (eventData.direction == 'down') {
						Stunning.openOverlay('top');
					} else {
						Stunning.closeOverlay('top');
					}
				});
			} else if (eventData.origin == 'bottom' && Stunning.isOverlayOpened('top')) {
				Stunning.on('bordergesturemove.topoverlay.stunning', function(eventData) {
					Stunning._overlays.top.height(eventData.y);
				});

				Stunning.once('bordergestureend', function(eventData) {
					Stunning.off('bordergesturemove.topoverlay.stunning');

					Stunning.closeOverlay('top');
				});
			}
		});

		Webos.Application.list(function(apps) {
			var $apps = $();

			for (var key in apps) {
				(function(key, app) {
					if (typeof app.get('menu') != 'undefined' && app.get('menu') == 'places') {
						return;
					}

					var $item = $('<li></li>', { title: app.get('description') });

					$item.click(function() {
						Stunning.closeOverlay();
						Webos.Cmd.execute(app.get('command'));
					});

					var $img = $.w.image(new W.Icon(app.get('icon'), 48), app.get('description'))
						.addClass('app-icon')
						.appendTo($item);

					$('<span></span>', { 'class': 'app-title' })
						.html(app.get('title'))
						.appendTo($item);

					$apps = $apps.add($item);
				})(key, apps[key]);
			}

			Stunning._$appsContent.empty().html($apps);
		});
	};

	Stunning.isOverlayOpened = function(overlayName) {
		return (Stunning._openedOverlay == overlayName);
	};

	Stunning.openOverlay = function(overlayName) {
		if (Stunning._openedOverlay) {
			return;
		}

		Stunning._openedOverlay = 'top';

		Stunning._overlays[overlayName].animate({
			height: '100%'
		}, 'fast', function() {
			$(this).addClass('overlay-opened');

			Stunning.trigger('openoverlay', {
				name: overlayName
			});
		});
	};

	Stunning.closeOverlay = function(overlayName) {
		if (!overlayName) {
			overlayName = Stunning._openedOverlay;
		}

		Stunning._openedOverlay = null;

		Stunning.trigger('closeoverlay', {
			name: overlayName
		});

		Stunning._overlays[overlayName].removeClass('overlay-opened').animate({
			height: 0
		}, 'fast');
	};

	Stunning._initTheme = function() {
		var loadTheme = function() {
			W.Theme.get([function(theme) {
				theme.load();
			}, function(response) {
				response.triggerError('Cannot load theme');
			}]);
		};

		Webos.User.bind('login logout', function() {
			loadTheme();
		});

		loadTheme();
	};

	Stunning._initTags = function() {
		Stunning._tags = [
			{
				name: '1',
				layout: 'rows',
				options: jQuery.extend({}, Stunning._layouts.rows.options, { primaryRow: 'top' })
			},
			{
				name: '2',
				layout: 'rows',
				options: jQuery.extend({}, Stunning._layouts.rows.options, { primaryRow: 'bottom' })
			}
		];
	};

	Stunning.tagData = function(tagIndex) {
		if (typeof tagIndex == 'undefined') {
			tagIndex = Stunning._currentTag;
		}

		return Stunning._tags[tagIndex];
	};

	Stunning.tagFrame = function(tagIndex) {
		if (typeof tagIndex == 'undefined') {
			tagIndex = Stunning._currentTag;
		}

		return Stunning._$tagsContainer.children('.tag').filter(function (index) {
			return (index == tagIndex);
		});
	};

	Stunning.requestClientFrame = function(tagIndex) {
		var $tag = Stunning.tagFrame(tagIndex);
		var tagData = Stunning.tagData(tagIndex);

		var $clientFrame = $('<div></div>', { 'class': 'client-frame' }).appendTo($tag);

		var layout = Stunning._layouts[tagData.layout];
		layout.addClient.call($tag[0], $clientFrame, tagData.options);

		return $clientFrame;
	};

	Stunning._initErrorHandler = function() {
		Webos.Error.setErrorHandler(function(error) {});
	};

	Stunning._initWelcome = function() {
		var fullscreenBtn = $.w.button('Passer en plein &eacute;cran').click(function() {
			Webos.fullscreen.request('html');
		}).appendTo(Stunning._$welcomeContainer);

		$(window).on(Webos.fullscreen.eventName, function() {
			if (Webos.fullscreen.isFullScreen()) {
				fullscreenBtn.hide();
			} else {
				fullscreenBtn.show();
			}
		});

		var hint = $('<p></p>')
			.addClass('welcome-hint')
			.html('⇃ Faites glisser pour lancer une application')
			.appendTo(Stunning._$welcomeContainer);
	};

	Stunning._init = function() {
		Stunning._initPreventScrolling();
		Stunning._initBordersGestures();

		Stunning._initTopOverlay();
		Stunning._initTheme();
		Stunning._initTags();

		Stunning._initErrorHandler();

		Stunning._initWelcome();
	};

	Webos.Observable.build(Stunning);

	window.Stunning = Stunning; //Export API

	//Init UI
	Stunning._init();

	W.ServerCall.one('complete', function() {
		W.UserInterface.Booter.current().finishLoading();
	});
})();