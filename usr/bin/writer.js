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

			var sel = null;
			var saveSel = function () {
				var newSel = that._saveSelection();
				if (newSel) {
					sel = newSel;
				}
			};
			var restoreSel = function () {
				that._restoreSelection(sel);
			};

			var refreshUi = function () {
				if (!that._$docInner.is(':focus')) {
					return;
				}

				$win.find('.format-font-size:not(:focus)').val(that.commandValue('fontSize') || 2);

				var fontFamilies = that.commandValue('fontName').split(','), fontFamily = '';
				for (var i = 0; i < fontFamilies.length; i++) {
					var font = fontFamilies[i].replace(/(^[ '"]+|[ '"]+$)/g, '');
					if (that._detectFont(font)) {
						fontFamily = font;
						break;
					}
				}
				$win.find('.font-family').html(fontFamily);
				$win.find('.font-family-input:not(:focus)').val(fontFamily.toLowerCase());

				var fontColor = that.commandValue('foreColor') || 'black';
				$win.find('.font-color').css('background-color', fontColor);
				$win.find('.font-color-input:not(:focus)').val(fontColor);

				var align = {
					left: that.commandValue('justifyleft'),
					center: that.commandValue('justifycenter'),
					right: that.commandValue('justifyright'),
					justify: that.commandValue('justifyfull')
				};
				for (var alignType in align) {
					var alignVal = align[alignType];

					if (alignVal === 'true' || alignVal === alignType) {
						alignVal = true;
					} else {
						alignVal = false;
					}

					$win.find('.btn-format-align-'+alignType).button('option', 'activated', alignVal);
				}

				var isBold = that.commandValue('bold');
				$win.find('.btn-format-text-bold').button('option', 'activated', (isBold && isBold != 'false'));
				var isItalic = that.commandValue('italic');
				$win.find('.btn-format-text-italic').button('option', 'activated', (isItalic && isItalic != 'false'));
				var isUnderline = that.commandValue('underline');
				$win.find('.btn-format-text-underline').button('option', 'activated', (isUnderline && isUnderline != 'false'));

				var isUnorderedList = that.commandValue('insertUnorderedList');
				$win.find('.btn-format-list-unordered').button('option', 'activated', (isUnorderedList && isUnorderedList != 'false'));
				var isOrderedList = that.commandValue('inserOrderedList');
				$win.find('.btn-format-list-ordered').button('option', 'activated', (isOrderedList && isOrderedList != 'false'));
			};

			for (var btnName in btnsHandlers) {
				(function (btnName, btnHandler) {
					$win.find('.'+btnName).click(function () {
						restoreSel();
						btnHandler();
						refreshUi();
					});
				})(btnName, btnsHandlers[btnName]);
			}

			$win.find('.writer-inner').on('mouseup keyup', function () {
				if (typeof document.onselectstart == 'undefined') {
					$(this).trigger('selectstart', { emulated: true }); //Not all browsers support the "select" event
				}
			}).on('selectstart', function (evt, data) {
				if (data && data.emulated) {
					refreshUi();
				} else { //This is an original event, we have to wait the selection to be changed
					setTimeout(function () {
						refreshUi();
					}, 0);
				}
			});

			$win.find('.writer-toolbar').mousedown(function () {
				saveSel();
			});

			$win.find('.format-font-size').on('keyup mouseup input', function (evt) {
				restoreSel();

				that.command('fontSize', $(this).val());
				$(this).focus();
			});
			$win.find('.font-color-input').on('keyup input', function (evt) {
				restoreSel();

				that.command('foreColor', $(this).val());
				$(this).focus();
			});
			$win.find('.font-family-input').children('option').each(function () {
				var font = $(this).text();

				if (!that._detectFont(font)) {
					$(this).remove();
				} else {
					$(this).attr('value', font.toLowerCase());
				}
			});
			$win.find('.font-family-input').on('change', function (evt) {
				restoreSel();

				that.command('fontName', $(this).val());
				refreshUi();
			});

			$win.find('.writer-page').click(function (evt) {
				if (!$(evt.target).is('.writer-page')) {
					return;
				}

				that._$docInner.focus();
			});

			that.command('styleWithCSS');
			that.command('enableInlineTableEditing');
			that.command('enableObjectResizing');
			this._$docInner.focus();
		},
		//From http://jsfiddle.net/timdown/gEhjZ/4/
		_saveSelection: function () { 
			var containerEl = this._$docInner[0];

			if (window.getSelection && document.createRange) {
				var doc = containerEl.ownerDocument, win = doc.defaultView;

				if (!win.getSelection().rangeCount) {
					return null;
				}

				var range = win.getSelection().getRangeAt(0);

				if (!range.intersectsNode(containerEl)) {
					return null;
				}

				var preSelectionRange = range.cloneRange();
				preSelectionRange.selectNodeContents(containerEl);
				preSelectionRange.setEnd(range.startContainer, range.startOffset);
				var start = preSelectionRange.toString().length;

				return {
					start: start,
					end: start + range.toString().length
				};
			} else {
				var doc = containerEl.ownerDocument, win = doc.defaultView || doc.parentWindow;
				var selectedTextRange = doc.selection.createRange();
				var preSelectionTextRange = doc.body.createTextRange();
				preSelectionTextRange.moveToElementText(containerEl);
				preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
				var start = preSelectionTextRange.text.length;

				return {
					start: start,
					end: start + selectedTextRange.text.length
				};
			}
		},
		_restoreSelection: function (savedSel) {
			var containerEl = this._$docInner[0];

			if (!this._$docInner.is(':focus')) {
				this._$docInner.focus();
			}

			if (!savedSel) {
				return;
			}

			if (window.getSelection && document.createRange) {
				var doc = containerEl.ownerDocument, win = doc.defaultView;
				var charIndex = 0, range = doc.createRange();
				range.setStart(containerEl, 0);
				range.collapse(true);
				var nodeStack = [containerEl], node, foundStart = false, stop = false;

				while (!stop && (node = nodeStack.pop())) {
					if (node.nodeType == 3) {
						var nextCharIndex = charIndex + node.length;
						if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
							range.setStart(node, savedSel.start - charIndex);
							foundStart = true;
						}
						if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
							range.setEnd(node, savedSel.end - charIndex);
							stop = true;
						}
						charIndex = nextCharIndex;
					} else {
						var i = node.childNodes.length;
						while (i--) {
							nodeStack.push(node.childNodes[i]);
						}
					}
				}

				var sel = win.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
			} else {
				var doc = containerEl.ownerDocument, win = doc.defaultView || doc.parentWindow;
				var textRange = doc.body.createTextRange();
				textRange.moveToElementText(containerEl);
				textRange.collapse(true);
				textRange.moveEnd("character", savedSel.end);
				textRange.moveStart("character", savedSel.start);
				textRange.select();
			}
		},
		_detectFont: function(fontName) {
			var detector = new FontDetector();
			return detector.detect(fontName);
		},
		command: function (cmd, arg) {
			if (!document.execCommand) {
				return false;
			}

			if (!this._$docInner.is(':focus')) {
				this._$docInner.focus();
			}
			var isSuccess = document.execCommand(cmd, false, arg || null);

			if (!isSuccess) {
				if (document.queryCommandSupported && document.queryCommandSupported(cmd)) {
					return;
				}

				return false;
			}
		},
		commandValue: function (cmd) {
			if (!document.queryCommandValue) {
				return;
			}

			return document.queryCommandValue(cmd);
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
				parentWindow: this._$win,
				mime_type: 'text/html'
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