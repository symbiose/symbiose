Webos.require(['/usr/lib/ympress/impress.js','/usr/lib/webos/fullscreen.js'], function() {
	if (window.Ympress) {
		return;
	}

	var Ympress = function() {
		this._init();
	};
	Ympress.prototype = {
		_mode: 'present',
		_init: function() {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/ympress/main.html', function(mainWindow) {
				that._window = $(mainWindow);

				that._initControls();

				that._refreshTitle();

				that._window
					.window('option', 'stylesheet', '/usr/share/css/ympress/impress.css')
					.window('open');

				that._initImpress();

				that._initEvents();
				
				that.switchMode('edit');
			});
		},
		_initImpress: function() {
			if (!this._impress) {
				var containerId = 'impress-' + this._window.window('id');

				var $impress = this._window.find('.impress-container .impress').attr('id', containerId);
				this._impress = impress(containerId, this._window.find('.impress-container')[0]);
			}
			
			this._impress.init();
		},
		_initControls: function() {
			var that = this;

			var controls = {
				new: function() {
					that.newFile();
				},
				quit: function() {
					that.quit();
				},
				open: function() {
					that.showOpenDialog();
				},
				save: function() {
					that.save();
				},
				saveAs: function() {
					that.saveAs();
				},
				present: function() {
					that.switchMode('present');
					that.toggleFullscreen(true);
					$(window).on(Webos.fullscreen.eventName+'.present.ympress', function() {
						if (!Webos.fullscreen.isFullScreen()) {
							$(window).off(Webos.fullscreen.eventName+'.present.ympress');
							that.switchMode('edit');
						}
					});
				}
			};

			for (var action in controls) {
				(function(action) {
					that._window.find('.actions-'+action).click(function() {
						controls[action]();
					});
				})(action);
			}
		},
		_initEvents: function() {
			var that = this;

			var $windowContainer = this._window.window('content'),
				$container = this._window.find('.impress-container');

			$windowContainer.dblclick(function(e) {
				if ($(e.target).is($windowContainer)) {
					var containerPos = $container.offset();

					var currentState = that._impress.stepData(that._impress.currentStep());
console.log(currentState.translate.y);
					var divState = $.extend({}, currentState, {
						translate: {
							x: (e.pageX - containerPos.left) * currentState.scale,
							y: (e.pageY - containerPos.top) * currentState.scale,
							z: 0
						},
						rotate: {
							x: 0,
							y: 0,
							z: 0
						},
						scale: currentState.scale
					});

					var newStep = that._impress.addStep(divState, 'Start typing text here...');
					that._impress.goto($(newStep).index());

					$(newStep).focus();

					console.log('new',newStep,divState);
				}
			});
			$windowContainer.mousedown(function(e) {
				var containerPos = $container.offset();
				var currentState = $.extend(true, {}, that._impress.stepData(that._impress.currentStep()));
				var target = $.extend({}, currentState, {
					scale: 1 / currentState.scale
				});
				var diff = {
					x: e.pageX - containerPos.left,
					y: e.pageY - containerPos.top
				};

				$(window).on('mousemove.movecanvas.ympress', function(e) {
					target.translate.x = (e.pageX - diff.x) * currentState.scale;
					target.translate.y = (e.pageY - diff.y) * currentState.scale;

					that._impress.setView(target, 0);
					e.preventDefault();
				});
				$(window).one('mouseup', function(e) {
					$(window).off('mousemove.movecanvas.ympress');
					e.preventDefault();
				});
				$windowContainer.one('click', function(e) {
					return false;
				});

				e.preventDefault();
			});

			$container.keyup(function(e) {
				e.stopPropagation();
			});
			$container.keydown(function(e) {
				e.stopPropagation();
			});
		},
		switchMode: function(newMode) {
			var $impress = this._window.find('.impress-container .impress');
			switch (newMode) {
				case 'present':
					$impress.removeAttr('contenteditable');
					break;
				case 'edit':
					$impress.attr('contenteditable', 'true');
					break;
				default:
					return false;
			}
		},
		toggleFullscreen: function(value) {
			if (typeof value != 'boolean') {
				value = !Webos.fullscreen.isFullScreen();
			}

			if (value) {
				var $container = this._window.find('.impress-container');
				Webos.fullscreen.request($container);
			} else {
				Webos.fullscreen.cancel();
			}
		},
		_refreshTitle: function() {
			var filename;
			if (this._file) {
				filename = this._file.get('basename');
			} else {
				filename = 'New presentation';
			}
			this._window.window('option', 'title', filename+' - Ympress');
		},
		_setContents: function (contents) {
			this._window.find('.impress-container .impress').html(contents);
			this._initImpress();
		},
		_contents: function() {
			//TODO: remove "style" attributes
			return this._window.find('.impress-container .impress').html();
		},
		open: function(path) {
			var that = this;

			if (!path) {
				return;
			}

			file = W.File.get(path);

			if (jQuery.inArray(file.get('extension'), Ympress.supportedExtensions) == -1) {
				W.Error.trigger(t.get('Incorrect file type'));
				return;
			}

			that._window.window('loading', true);

			file.readAsText([function(contents) {
				var impressContent = $();
				try {
					var xmlDoc = $.parseXML(contents), $xml = $(xmlDoc), $impress = $xml.find('#impress');

					if ($impress.length == 1) {
						impressContent = $impress.html();
						that._file = file;
						that._saved = true;
						that._refreshTitle();
					} else {
						Webos.Error.trigger('Can\'t open "'+file.get('basename')+'" : not an Impress.js file');
					}
				} catch (e) {
					Webos.Error.trigger('Can\'t open "'+file.get('basename')+'" : the file is corrupted');
				} finally {
					that._window.window('loading', false);

					that._refreshTitle();

					that._setContents(impressContent);
				}
			}, function(response) {
				that._window.window('loading', false);
				response.triggerError();
			}]);
		},
		showOpenDialog: function() {
			var that = this;

			new NautilusFileSelectorWindow({
				parentWindow: that._window,
				title: 'Open...'
			}, function(files) {
				if (files.length) {
					that.open(files[0]);
				}
			});
		},
		save: function(callback) {
			callback = W.Callback.toCallback(callback);
			var that = this;
			
			var contents = this._contents();
			var saveFn = function(file) {
				if (jQuery.inArray(file.get('extension'), Ympress.supportedExtensions) == -1) {
					callback.error(W.Callback.Result.error('Invalid file type'));
					return;
				}

				that._window.window('loading', true);
				file.writeAsText(contents, [function() {
					that._file = file;
					that._saved = true;
					that._refreshTitle();
					that._window.window('loading', false);
					callback.success(file);
				}, function(response) {
					that._window.window('loading', false);
					callback.error(response);
				}]);
			};
			
			if (this._file) {
				saveFn(this._file);
			} else {
				this.saveAs(callback);
			}
		},
		saveAs: function(callback) {
			var that = this;

			new NautilusFileSelectorWindow({
				parentWindow: that._window,
				title: 'Save as...',
				exists: false
			}, function(paths) {
				if (paths.length) {
					W.File.load(paths[0], [function(file) {
						that._file = file;
						that.save(callback);
					}, function(response) {
						if (!(new RegExp('\.('+Ympress.supported.join('|')+')$')).test(path)) {
							path += '.html';
						}
						W.File.createFile(path, [function(file) {
							that._file = file;
							that.save(callback);
						}, callback.error]);
					}]);
				}
			});
		},
		newFile: function(contents) {
			var that = this;

			if (typeof contents == 'undefined') {
				contents = '';
			}
			
			this.closeFile([function() {
				that._file = null;
				that._saved = false;
				that._refreshTitle();
				that._setContents(contents);
			}, function() {}]);
		},
		closeFile: function(callback) {
			callback = W.Callback.toCallback(callback);

			if (!this._file) {
				callback.success();
				return;
			}

			//TODO
			callback.success();
		},
		quit: function() {
			var that = this;

			this.closeFile([function() {
				that._window.window('close');
			}, function() {}]);
		}
	};

	Ympress.open = function(fileToOpen) {
		var ympress = new Ympress();
		ympress.open(fileToOpen);
		return ympress;
	};

	Ympress.supportedExtensions = ['html', 'htm'];

	window.Ympress = Ympress; //Export API
});