Webos.require([
	'/usr/lib/webos/font-detector.js',

	//Bootstrap
	/*'/usr/lib/bootstrap/bootstrap.min.js',
	'/usr/share/css/bootstrap/bootstrap.min.css'*/

	//JSPDF
	{
		path: '/usr/lib/jspdf/jspdf.js',
		exportApis: 'jsPDF'
	},
	'/usr/lib/jspdf/jspdf.standard_fonts_metrics.js',
	'/usr/lib/jspdf/jspdf.split_text_to_size.js',
	'/usr/lib/jspdf/jspdf.from_html.js'
], function () {
	var Writer = function () {
		Webos.Observable.call(this);

		this.initialize();
	};
	Writer.prototype = {
		_$win: $(),
		_$docInner: $(),
		_file: null,
		_saved: false,
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/writer/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');

				var $win = that._$win;
				that._$docInner = $win.find('.writer-inner');

				$win.window('open');

				that._initUi();

				if (!that.supports()) {
					W.Error.trigger('Your browser is not supported, falling back to "read only" mode.', 'The support of the "contenteditable" HTML5 property is required to edit the documents.');
				}
			});
		},
		_initUi: function () {
			var that = this;
			var $win = this._$win;

			var btnsHandlers = {
				'btn-document-new': function () {
					W.Cmd.execute('writer');
				},
				'btn-document-open': function () {
					that.openFile();
				},
				'btn-edit-undo': function () {
					that.command('undo');
				},
				'btn-edit-redo': function () {
					that.command('redo');
				},

				'btn-document-save': function () {
					that.saveFile();
				},
				'btn-document-export': function () {
					that.exportToPdf();
				},
				'btn-settings': function () {},

				'btn-format-text-bold': function () {
					that.command('bold');
				},
				'btn-format-text-italic': function () {
					that.command('italic');
				},
				'btn-format-text-underline': function () {
					that.command('underline');
				},
				'btn-format-align-left': function () {
					that.command('justifyleft');
				},
				'btn-format-align-center': function () {
					that.command('justifycenter');
				},
				'btn-format-align-right': function () {
					that.command('justifyright');
				},
				'btn-format-align-justify': function () {
					that.command('justifyfull');
				},
				'btn-format-list-unordered': function () {
					that.command('insertUnorderedList');
				},
				'btn-format-list-ordered': function () {
					that.command('insertOrderedList');
				}
			};

			for (var btnName in btnsHandlers) {
				$win.find('.'+btnName).click(btnsHandlers[btnName]);
			}

			/*$win.find('.btns-font').popover({
				html: true,
				placement: 'bottom',
				trigger: 'click',
				title: '',
				content: '<div class="fonts"></div>'
			});*/

			$win.find('.writer-page').click(function (evt) {
				if (!$(evt.target).is('.writer-page')) {
					return;
				}

				that._$docInner.focus();
			});

			this._$docInner.focus();
		},
		command: function (cmd, arg) {
			if (!document.execCommand) {
				return false;
			}

			this._$docInner.focus();
			var isSuccess = document.execCommand(cmd, false, arg || null);

			if (!isSuccess) {
				if (document.queryCommandSupported && document.queryCommandSupported(cmd)) {
					return;
				}

				return false;
			}
		},
		supports: function () {
			return (typeof $('body')[0].contentEditable != 'undefined');
		},
		_openFile: function (file) {
			var that = this;

			if (!file) {
				W.Error.trigger('Cannot open file: no file specified');
				return;
			}
			file = W.File.get(file);

			var openers = {
				'text/html': function (contents) {
					var pageContents = '';
					try {
						var xmlDoc = $.parseXML(contents), $xml = $(xmlDoc), $body = $xml.find('body');

						if ($body.length == 1) {
							pageContents = $body.html();
						} else {
							pageContents = $xml;
						}
					} catch (e1) {
						try {
							$xml = $(contents);
							pageContents = $xml;
						} catch (e2) {
							Webos.Error.trigger('Cannot open "'+file.get('basename')+'": corrupted file', e2.getMessage());
							return false;
						}
					} finally {
						that._$win.window('loading', false);

						$pageContents = $(pageContents);
						$pageContents.find('script').remove();
						$pageContents.find('style').prop('scoped', true);
						$pageContents.find('link').each(function () {
							$(this).replaceWith($('<style></style>').prop('scoped', true).html('@import "'+$(this).attr('href')+'";'));
						});

						that._$docInner.html($pageContents);
					}
				}
			};

			var fileType = file.get('mime_type');
			if (!openers[fileType]) {
				W.Error.trigger('Cannot open "'+file.get('basename')+'": unsupported file type', 'File type "'+fileType+'" isn\'t supported yet');
				return;
			}

			this._$win.window('loading', true, {
				message: 'Opening "'+file.get('basename')+'"...'
			});
			file.readAsText([function(contents) {
				that._file = file;
				that._saved = true;

				openers[fileType](contents);
			}, function(resp) {
				that._$win.window('loading', false);
				resp.triggerError('Cannot open "'+file.get('basename')+'": error while reading file');
			}]);
		},
		_saveFile: function (file) {
			var that = this;

			if (!file) {
				W.Error.trigger('Cannot save file: no file specified');
				return;
			}
			file = W.File.get(file);

			this._$win.window('loading', true, {
				message: 'Saving "'+file.get('basename')+'"...',
				lock: false
			});
			file.writeAsText(that._$docInner.html(), [function () {
				that._$win.window('loading', false);

				if (file.can('read')) {
					that._file = file;
					that._saved = true;
				}
			}, function (resp) {
				that._$win.window('loading', false);
				resp.triggerError('Cannot save "'+file.get('basename')+'": error while writing file');
			}]);
		},
		openFile: function (file) {
			var that = this;

			if (file) {
				that._openFile(file);
				return;
			}

			new NautilusFileSelectorWindow({
				parentWindow: this._$win
			}, function(files) {
				if (files.length) {
					that._openFile(files[0]);
				}
			});
		},
		saveFile: function (file) {
			var that = this;

			if (file) {
				this._saveFile(file);
				return;
			}

			if (that._file && that._file.can('write')) {
				this._saveFile(that._file);
				return;
			}

			new NautilusFileSelectorWindow({
				parentWindow: this._$win,
				exists: false
			}, function(paths) {
				if (paths.length) {
					var path = paths[0];

					if (typeof path == 'string') {
						if (!/\.(html|htm)$/.test(path)) {
							path += '.html';
						}
						file = W.File.get(path);
					} else {
						file = path;
					}

					that._saveFile(file);
				} else {
					//Operation aborded
				}
			});
		},
		detectFont: function(fontName) {
			var detector = new FontDetector();
			return detector.detect(fontName);
		},
		_exportToPdf: function () {
			var pdf = new jsPDF('p','in','letter');
			pdf.fromHTML(this._$docInner[0], 0.5, 0.5, {
				width: 7.5,
				elementHandlers: {}
			});
			return pdf.output('datauristring');
		},
		exportToPdf: function () {
			var that = this;

			new NautilusFileSelectorWindow({
				parentWindow: this._$win,
				title: 'Export to PDF',
				exists: false,
				mime_type: 'application/pdf'
			}, function(paths) {
				if (paths.length) {
					var path = paths[0], file;

					if (typeof path == 'string') {
						if (!/\.pdf$/.test(path)) {
							path += '.pdf';
						}
						file = W.File.get(path);
					} else {
						file = path;
					}
					
					that._$win.window('loading', true, {
						message: 'Converting to PDF...'
					});

					var pdfContents = that._exportToPdf();

					that._$win.window('loading', true, {
						message: 'Saving file...'
					});

					file.writeAsDataUrl(pdfContents, [function() {
						that._$win.window('loading', false);
					}, function(response) {
						that._$win.window('loading', false);
						response.triggerError('Can\'t export file to "'+file.get('path')+'"');
					}]);
				} else {
					//Operation aborded
				}
			});
		}
	};
	Webos.inherit(Writer, Webos.Observable);

	Writer.open = function () {
		return new Writer();
	};

	Writer.open();
});