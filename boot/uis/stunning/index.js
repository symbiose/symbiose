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
		_$notificationsContent: $('#notifications-content'),
		_$notificationsClearAll: $('#notifications-container .notifications-clear'),
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
			if (!e.gesture) {
				console.log(e);
				return;
			}

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
			if (eventData.origin == 'top' && !Stunning.isOverlayOpened()) {
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

	Stunning._initBottomOverlay = function() {
		Stunning.on('bordergesturestart', function(eventData) {
			if (eventData.origin == 'bottom' && !Stunning.isOverlayOpened()) {
				var docHeight = $(document).height();

				Stunning.on('bordergesturemove.bottomoverlay.stunning', function(eventData) {
					Stunning._overlays.bottom.css({
						top: eventData.y,
						height: docHeight - eventData.y
					});
				});

				Stunning.once('bordergestureend', function(eventData) {
					Stunning.off('bordergesturemove.bottomoverlay.stunning');

					if (eventData.direction == 'up') {
						Stunning.openOverlay('bottom');
					} else {
						Stunning.closeOverlay('bottom');
					}
				});
			} else if (eventData.origin == 'top' && Stunning.isOverlayOpened('bottom')) {
				var docHeight = $(document).height();

				Stunning.on('bordergesturemove.bottomoverlay.stunning', function(eventData) {
					Stunning._overlays.bottom.css({
						top: eventData.y,
						height: docHeight - eventData.y
					});
				});

				Stunning.once('bordergestureend', function(eventData) {
					Stunning.off('bordergesturemove.bottomoverlay.stunning');

					Stunning.closeOverlay('bottom');
				});
			}
		});

		Stunning._$notificationsClearAll.click(function() {
			Webos.Notification.clearAll();
		});
	};

	Stunning.isOverlayOpened = function(overlayName) {
		if (overlayName) {
			return (Stunning._openedOverlay == overlayName);
		} else {
			return (Stunning._openedOverlay) ? true : false;
		}
	};

	Stunning.openOverlay = function(overlayName) {
		if (Stunning._openedOverlay) {
			return;
		}

		Stunning._openedOverlay = overlayName;

		Stunning._overlays[overlayName].animate({
			top: 0,
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

		if (overlayName == 'bottom') {
			Stunning._overlays[overlayName].css({
				top: '',
				bottom: 0
			});
		}

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

		Stunning.on('bordergesturestart', function(eventData) {
			if ((eventData.origin == 'right' || eventData.origin == 'left') && !Stunning.isOverlayOpened()) {
				/*Stunning.on('bordergesturemove.topoverlay.stunning', function(eventData) {
					//...
				});*/

				Stunning.once('bordergestureend', function(eventData) {
					//Stunning.off('bordergesturemove.topoverlay.stunning');

					var tagIndex = Stunning.currentTagIndex();
					if (eventData.direction == 'left') {
						tagIndex++;
					} else if (eventData.direction == 'right') {
						tagIndex--;
					}

					if (Stunning.tagExists(tagIndex)) {
						Stunning.switchToTag(tagIndex);
					}
				});
			}
		});
	};

	Stunning.currentTagIndex = function () {
		return Stunning._currentTag;
	};

	Stunning.tagExists = function (tagIndex) {
		return (typeof Stunning._tags[tagIndex] != 'undefined');
	};

	Stunning.tagData = function(tagIndex) {
		if (typeof tagIndex == 'undefined') {
			tagIndex = Stunning.currentTagIndex();
		}

		return Stunning._tags[tagIndex];
	};

	Stunning.tagFrame = function(tagIndex) {
		if (typeof tagIndex == 'undefined') {
			tagIndex = Stunning.currentTagIndex();
		}

		return Stunning._$tagsContainer.children('.tag').filter(function (index) {
			return (index == tagIndex);
		});
	};

	Stunning.countClientFrames = function(tagIndex) {
		if (typeof tagIndex == 'undefined') {
			tagIndex = Stunning.currentTagIndex();
		}

		return Stunning.tagFrame().children().length;
	};

	Stunning.requestClientFrame = function(tagIndex) {
		var $tag = Stunning.tagFrame(tagIndex);
		var tagData = Stunning.tagData(tagIndex);

		var $clientFrame = $('<div></div>', { 'class': 'client-frame' }).appendTo($tag);

		var layout = Stunning._layouts[tagData.layout];
		layout.addClient.call($tag[0], $clientFrame, tagData.options);

		Stunning.trigger('addclient', {
			$frame: $clientFrame
		});

		return $clientFrame;
	};

	Stunning.switchToTag = function (tagIndex) {
		if (!Stunning.tagExists(tagIndex)) {
			return false; //Animation ?
		}

		var currentTag = Stunning.currentTagIndex(),
			$currentTagFrame = Stunning.tagFrame(),
			$tagFrame = Stunning.tagFrame(tagIndex);

		if (tagIndex == currentTag) { //Same tag as current
			return;
		}

		Stunning._currentTag = tagIndex;

		Stunning.trigger('switchtag', {
			previousTag: currentTag,
			currentTag: tagIndex
		});

		var direction = (tagIndex > currentTag) ? 'left' : 'right',
			currentFramePos = (direction == 'left') ? - $tagFrame.width() : $tagFrame.width(),
			tagFrameOriginPos = (direction == 'left') ? $currentTagFrame.width() : - $currentTagFrame.width(),
			tagFrameDestPos = 0;

		$tagFrame.css({
			position: 'absolute',
			left: tagFrameOriginPos
		}).show();

		$currentTagFrame.animate({
			left: currentFramePos
		}, 'fast', function() {
			$(this).hide();
		});
		$tagFrame.animate({
			left: tagFrameDestPos
		}, 'fast');
	};

	Stunning._initErrorHandler = function() {
		Webos.Error.setErrorHandler(function(error) {});
	};

	Stunning._initWelcome = function() {
		var fullscreenBtn = $.w.button('Switch to fullscreen').click(function() {
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
			.html('⇃ Drag down to launch an application<br /><br /><small>Drag right or left to switch between tags<br />Drag up to show notifications</small>')
			.appendTo(Stunning._$welcomeContainer);

		Stunning.on('addclient switchtag', function(eventData) {
			if (Stunning.countClientFrames()) {
				Stunning._$welcomeContainer.hide();
			} else {
				Stunning._$welcomeContainer.show();
			}
		});
	};

	Stunning._init = function() {
		Stunning._initPreventScrolling();
		Stunning._initBordersGestures();

		Stunning._initTopOverlay();
		Stunning._initBottomOverlay();
		Stunning._initTheme();
		Stunning._initTags();

		Stunning._initErrorHandler();

		Stunning._initWelcome();
	};

	Webos.Observable.build(Stunning);

	window.Stunning = Stunning; //Export API

	//Init UI
	Stunning._init();

	//Error handling
	Webos.Error.setErrorHandler(function(error) {
		var shortMessage, message, details;
		if (error instanceof Webos.Error) {
			shortMessage = error.html.message;
			message = error.html.text.replace('<br />', ' - ');
			details = error.toString();
		} else {
			shortMessage = error.message;
			message = error.name + ' : ' + error.message;
			process = (error.process) ? 'Process : '+error.process.getPid()+'; command : <em>'+error.process.cmdText+'</em><br />' : '';
			details = error.name + ' : ' + error.message + "<br />"+process+"Stack trace :<br />" + error.stack;
		}

		var errorWindow = $();

		var reportErrorFn = function() {
			Webos.require('/usr/lib/apport/apport.js', function() {
				Apport.askDescriptionAndReportError(error);
				errorWindow.window('close');
			});
		};

		var openWindowFn = function() {
			errorWindow = $.webos.window({
				title: 'Error',
				resizable: false,
				width: 400,
				icon: new W.Icon('status/error')
			});

			var img = $('<img />', { 'src': new W.Icon('status/error'), 'alt': 'error' }).css('float', 'left');
			errorWindow.window('content').append(img);

			errorWindow.window('content').append('<strong>An error occured.</strong><br />'+message);

			var spoiler = $.w.spoiler('Show details').appendTo(errorWindow.window('content'));

			$('<pre></pre>')
				.html(details)
				.css('height','150px')
				.css('overflow','auto')
				.css('background-color','white')
				.css('padding','2px')
				.appendTo(spoiler.spoiler('content'));

			var buttonContainer = $.webos.buttonContainer();
			$.webos.button('Report this bug...').click(function() {
				reportErrorFn();
			}).appendTo(buttonContainer.buttonContainer('content'));
			$.webos.button('Close').click(function() {
				errorWindow.window('close');
			}).appendTo(buttonContainer.buttonContainer('content'));
			errorWindow.window('content').append(buttonContainer);

			errorWindow.window('open');
		};
		
		$.w.notification({
			title: 'An error occured',
			icon: new W.Icon('status/error'),
			shortMessage: shortMessage,
			message: message,
			widgets: [
				$.w.button('Details').click(function() { openWindowFn(); }),
				$.w.button('Report this bug...').click(function() { reportErrorFn(); })
			]
		});
	});

	W.ServerCall.one('complete', function() {
		W.UserInterface.Booter.current().finishLoading();
	});
})();