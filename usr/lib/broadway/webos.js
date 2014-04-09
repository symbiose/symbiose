var proc = this, term = proc.getTerminal();

Webos.require('/usr/lib/broadway/broadway-3.10.js', function () {
	if (Webos.broadway) {
		return;
	}

	var grab = {};
	grab.window = null;
	grab.ownerEvents = false;
	grab.implicit = false;
	var surfaces = {};

	var sendConfigureNotify = function (surface) {
		broadway.sendInput("w", [surface.id, surface.x, surface.y, surface.width, surface.height]);
	};

	var getFrameOffset = function (surface) {
		var x = 0;
		var y = 0;
		var el = surface.canvas;
		while (el && el != surface.frame) {
			x += el.offsetLeft;
			y += el.offsetTop;

			/* For some reason the border is not includes in the offsets.. */
			x += parseOffset(getStyle(el, "border-left-width"));
			y += parseOffset(getStyle(el, "border-top-width"));

			el = el.offsetParent;
		}

		/* Also include frame border as per above */
		x += parseOffset(getStyle(el, "border-left-width"));
		y += parseOffset(getStyle(el, "border-top-width"));

		return {x: x, y: y};
	};

	var resizeCanvas = function (canvas, w, h) {
		/* Canvas resize clears the data, so we need to save it first */
		var tmpCanvas = canvas.ownerDocument.createElement("canvas");
		tmpCanvas.width = canvas.width;
		tmpCanvas.height = canvas.height;
		var tmpContext = tmpCanvas.getContext("2d");
		tmpContext.globalCompositeOperation = "copy";
		tmpContext.drawImage(canvas, 0, 0, tmpCanvas.width, tmpCanvas.height);

		canvas.width = w;
		canvas.height = h;

		var context = canvas.getContext("2d");

		context.globalCompositeOperation = "copy";
		context.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height);
	};

	var $lastWin = $(), tempSurfacesQueue = [];
	var cmds = {
		createSurface: function (id, x, y, width, height, isTemp) {
			console.log('createSurface', arguments);

			var surface = {
				id: id,
				x: x,
				y:y,
				width: width,
				height: height,
				isTemp: isTemp,
				positioned: isTemp,
				drawQueue: [],
				transientParent: 0,
				visible: false,
				frame: null,
				$win: $()
			};

			var canvas = document.createElement("canvas");
			canvas.style.position = 'absolute';
			canvas.style.outline = 'none';
			canvas.width = width;
			canvas.height = height;
			canvas.tabIndex = 1;
			canvas.surface = surface;
			surface.canvas = canvas;

			/*var toplevelElement;

			if (isTemp) {
				toplevelElement = canvas;
				document.body.appendChild(canvas);
			} else {
				var frame = document.createElement("div");
				frame.frameFor = surface;
				frame.className = "frame-window";
				surface.frame = frame;

				var button = document.createElement("center");
				button.closeFor = surface;
				var X = document.createTextNode("\u00d7");
				button.appendChild(X);
				button.className = "frame-close";
				frame.appendChild(button);

				var contents = document.createElement("div");
				contents.className = "frame-contents";
				frame.appendChild(contents);

				canvas.style["display"] = "block";
				contents.appendChild(canvas);

				toplevelElement = frame;
				document.body.appendChild(frame);
			}*/

			//surface.toplevelElement = toplevelElement;
			//toplevelElement.style["position"] = "absolute";
			/* This positioning isn't strictly right for apps in another topwindow,
			* but that will be fixed up when showing. */
			//toplevelElement.style["left"] = surface.x + "px";
			//toplevelElement.style["top"] = surface.y + "px";
			//toplevelElement.style["display"] = "inline";

			/* We hide the frame with visibility rather than display none
			* so getFrameOffset still works with hidden windows. */
			//toplevelElement.style["visibility"] = "hidden";

			$(canvas).on('mousemove mouseover mouseout mousedown mouseup keydown keypress keyup mousewheel contextmenu', function (e) {
				//e.preventDefault();

				Webos.broadway._trigger(surface, e.type, e);
			});

			var setSurfaceWin = function (surface, $parentWin) {
				var surfacePos = Webos.broadway._webosPosition(surface, {
					x: $parentWin.window('option', 'left'),
					y: $parentWin.window('option', 'top')
				});
				$(canvas).css({
					left: x - surfacePos.x,
					top: y - surfacePos.y
				});

				$parentWin.window('content').append(canvas);

				surface.$win = $parentWin;
			};

			if (isTemp) {
				var $parentWin = $.webos.window.getActive();
				if ($parentWin.length) {
					setSurfaceWin(surface, $parentWin);
				} else if ($lastWin.length) {
					setSurfaceWin(surface, $lastWin);
				} else {
					tempSurfacesQueue.push(surface);
				}

				canvas.style.visibility = 'hidden';
			} else {
				var $win = $.w.window({
					title: ' ',
					top: x,
					left: y,
					width: width,
					height: height,
					resizable: true
				});
				$win.window('content').css('overflow', 'hidden').append(canvas);
				surface.$win = $win;

				$win.on('windowmove', function () {
					surface.x = $win.window('option', 'left');
					surface.y = $win.window('option', 'top');

					sendConfigureNotify(surface);
				}).on('windowresize', function () {
					var winDim = $win.window('contentDimentions');
					surface.width = winDim.width;
					surface.height = winDim.height;

					resizeCanvas(surface.canvas, surface.width, surface.height);
					sendConfigureNotify(surface);
				}).on('windowtoforeground', function () {
					canvas.focus();
				}).on('windowclose', function () {
					broadway.sendInput("W", [surface.id]);
				});

				if (tempSurfacesQueue.length) {
					for (var i = 0; i < tempSurfacesQueue.length; i++) {
						var surf = tempSurfacesQueue[i];

						setSurfaceWin(surf, $win);
					}
					tempSurfacesQueue = [];
				}

				$lastWin = $win;
			}

			surfaces[id] = surface;
			//stackingOrder.push(surface);

			sendConfigureNotify(surface);

			return surface;
		},
		showSurface: function (id) {
			console.log('showSurface', arguments);

			var surface = surfaces[id];

			if (surface.visible) {
				return;
			}

			surface.visible = true;

			/*var xOffset = surface.x;
			var yOffset = surface.y;

			if (surface.frame) {
				var offset = getFrameOffset(surface);
				xOffset -= offset.x;
				yOffset -= offset.y;
			}

			surface.toplevelElement.style["left"] = xOffset + "px";
			surface.toplevelElement.style["top"] = yOffset + "px";
			surface.toplevelElement.style["visibility"] = "visible";

			restackWindows();*/

			if (surface.isTemp) {
				surface.canvas.style.visibility = 'visible';
			} else {
				surface.$win.window('open');
				surface.canvas.focus();
			}
		},
		hideSurface: function (id) {
			console.log('hideSurface', arguments);

			if (grab.window == id) {
				doUngrab();
			}

			var surface = surfaces[id];

			if (!surface.visible) {
				return;
			}

			surface.visible = false;

			/*var element = surface.toplevelElement;

			element.style["visibility"] = "hidden";*/

			if (surface.isTemp) {
				surface.canvas.style.visibility = 'hidden';
			} else {
				surface.$win.window('close');
			}
		},
		setTransientFor: function (id, parentId) {
			console.log('setTransientFor', arguments);

			var surface = surfaces[id];

			if (surface.transientParent == parentId)
				return;

			surface.transientParent = parentId;
			if (parentId && surfaces[parentId]) {
				var parentSurface = surfaces[parentId];

				if (surface.isTemp) {
					//TODO
				} else {
					surface.$win.window('option', 'parentWindow', parentSurface.$win);
				}
			}
		},
		deleteSurface: function (id) {
			console.log('deleteSurface', arguments);

			if (grab.window == id)
				doUngrab();

			var surface = surfaces[id];

			if (surface.isTemp) {
				surface.canvas.remove();
			} else {
				surface.$win.window('close').window('destroy');
			}

			//var i = stackingOrder.indexOf(surface);
			//if (i >= 0)
			//	stackingOrder.splice(i, 1);

			/*var canvas = surface.canvas;
			canvas.parentNode.removeChild(canvas);
			var frame = surface.frame;
			if (frame)
				frame.parentNode.removeChild(frame);*/

			delete surfaces[id];
		},
		moveResizeSurface: function (id, has_pos, x, y, has_size, w, h) {
			console.log('moveResizeSurface', arguments);

			var surface = surfaces[id];
			if (has_pos) {
				surface.positioned = true;
				surface.x = x;
				surface.y = y;
			}
			if (has_size) {
				surface.width = w;
				surface.height = h;

				if (!surface.isTemp) {
					surface.$win.window('option', {
						width: surface.width,
						height: surface.height
					});
				}
			}

			/* Flush any outstanding draw ops before (possibly) changing size */
			broadway.flushSurface(surface);

			if (has_size)
				resizeCanvas(surface.canvas, w, h);

			//if (surface.visible) {
			if (has_pos) {
				var xOffset = surface.x;
				var yOffset = surface.y;

				var element = surface.canvas;
				if (surface.frame) {
					element = surface.frame;
					var offset = getFrameOffset(surface);
					xOffset -= offset.x;
					yOffset -= offset.y;
				}

				if (surface.isTemp) {
					var surfacePos = Webos.broadway._webosPosition(surface, {
						x: surface.$win.window('option', 'left'),
						y: surface.$win.window('option', 'top')
					});
					$(surface.canvas).css({
						left: x - surfacePos.x,
						top: y - surfacePos.y
					});
				} else {
					surface.$win.window('option', {
						left: xOffset,
						top: yOffset
					});
				}
			}
			//}

			sendConfigureNotify(surface);
		},
		flushSurface: function (id) {
			broadway.flushSurface(surfaces[id]);
		}
	};

	Webos.broadway = {};

	Webos.broadway._doc = document.createElement('div');

	Webos.broadway._$appIndicator = $();

	Webos.broadway.connect = function (opts) {
		opts = $.extend({
			host: 'http://localhost:8080'
		}, opts);

		term.echo('Connecting to '+opts.host+'...');

		if (/^[a-z0-9]+:\/\/[a-zA-Z0-9-.]+(:[0-9]+)?$/.test(opts.host)) {
			opts.host += '/';
		}

		broadway.connect({
			cmd: cmds,
			host: opts.host,
			document: Webos.broadway._doc
		});

		if ($.webos.appIndicator) {
			$indicator = $.webos.appIndicator({
				title: 'Broadway',
				icon: 'actions/interface'
			});
			Webos.broadway._$appIndicator = $indicator;

			$.w.menuItem('Disconnect')
				.click(function() {
					broadway.disconnect();
					Webos.broadway._$appIndicator.appIndicator('hide');
				})
				.appendTo($indicator.appIndicator('content'));

			$indicator.appIndicator('show');
		}
	};

	Webos.broadway.disconnect = function () {
		broadway.disconnect();
	};

	var desktopOffset = $('#desktop').offset();

	Webos.broadway._webosPosition = function (surface, broadwayPos) {
		var webosPos = {};
		var winOuterDim = surface.$win.window('dimentions'),
			winInnerDim = surface.$win.window('contentDimentions');

		if (typeof broadwayPos.x == 'number') {
			webosPos.x = broadwayPos.x - (winOuterDim.width - winInnerDim.width);
		}
		if (typeof broadwayPos.y == 'number') {
			webosPos.y = broadwayPos.y - (winOuterDim.height - winInnerDim.height);
		}

		return webosPos;
	};

	Webos.broadway._broadwayPosition = function (surface, webosPos) {
		var broadwayPos = {};
		var winOuterDim = surface.$win.window('dimentions'),
			winInnerDim = surface.$win.window('contentDimentions');

		if (typeof webosPos.x == 'number') {
			broadwayPos.x = webosPos.x + (winOuterDim.width - winInnerDim.width);
		}
		if (typeof webosPos.y == 'number') {
			broadwayPos.y = webosPos.y + (winOuterDim.height - winInnerDim.height);
		}

		return broadwayPos;
	};

	Webos.broadway._trigger = function (surface, eventName, eventData) {
		if (eventData) {
			if (typeof eventData.pageX == 'number') {
				eventData.pageX -= Webos.broadway._broadwayPosition(surface, { x: desktopOffset.left }).x;
			}
			if (typeof eventData.pageY == 'number') {
				eventData.pageY -= Webos.broadway._broadwayPosition(surface, { y: desktopOffset.top }).y;
			}
		}

		$(Webos.broadway._doc).trigger(jQuery.Event(eventName, eventData));
	};
});