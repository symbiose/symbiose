/**
 * Terminal de GNOME.
 * @version 1.1
 * @author $imon
 */

$.webos.widget('terminal', 'container', {
	_name: 'terminal',
	options: {
		callback: function() {},
		_history: [],
		_runningCmd: null
	},
	_translationsName: 'gnome-terminal',
	_create: function () {
		this._super('_create');

		this.options.callback = W.Callback.toCallback(this.options.callback);

		var that = this;
		var callback = this.options.callback;

		this.options._terminal = new W.Terminal();

		this.terminal().bind('echo', function(data) {
			that._print(data.contents);
		});

		that._displayPrompt(); //On affiche l'invite de commande

		that.element.one('terminalready', function() {
			callback.success(that.element);
		});
	},
	terminal: function () {
		return this.options._terminal;
	},
	promptStr: function() {
		var data = this.options._terminal.data();

		var promptStr = '';
		if (data.username) {
			promptStr +=  data.username+'@';
		}

		promptStr += data.host+':'+data.location+((data.root) ? '#' : '$');

		return promptStr;
	},
	prompt: function () {
		return this.options._components.prompt;
	},
	outputContainer: function() {
		return $(this.options._components.out);
	},
	_displayPrompt: function () { //Affiche l'invite de commande
		var that = this;

		this.options._components.out = $();
		this.options._components.prompt = $();

		this.options._terminal.refreshData(function() {
			var data = that.options._terminal.data();

			var historyPos = that.options._history.length, typpedCmd = '';
			that.options._components.prompt = $.w.textEntry(that.promptStr()+' ')
				.appendTo(that.element)
				.keydown(function(e) {
					switch (e.keyCode) {
						case 9: //Tab
							var valueArray = $(this).textEntry('value').split(' ');
							var lastWord = valueArray.pop();
							var rest = valueArray.join(' ');
							var results = [];
							for (var path in Webos.File._cache) {
								var foundPath = null;
								if (path.indexOf(lastWord) == 0 && !/.+\/.+/.test(path.substr(lastWord.length))) {
									foundPath = path;
								}
								if (path.indexOf(data.location+'/'+lastWord) == 0 && !/.+\/.+/.test(path.substr((data.location+'/'+lastWord).length))) {
									foundPath = path.substr(data.location.length).replace(/^\//, '');
								}
								if (foundPath) {
									if (Webos.File._cache[path].get('is_dir')) {
										foundPath += '/';
									}
									results.push(foundPath);
									$(this).textEntry('value', rest+' '+foundPath);
									break;
								}
							}
							e.preventDefault();
							break;
						case 13: //Enter
							var cmd = $(this).textEntry('value');
							that.enterCmd(cmd);

							that.options._components.out = $();
							that.options._components.prompt = $();

							e.preventDefault();
							break;
						case 38: //Up
							if (historyPos > 0) {
								if (historyPos == that.options._history.length) {
									typpedCmd = $(this).textEntry('value');
								}
								historyPos--;
								$(this).textEntry('value', that.options._history[historyPos]);
							}
							e.preventDefault();
							break;
						case 40: //Down
							if (historyPos < that.options._history.length) {
								historyPos++;
								var cmd = '';
								if (historyPos == that.options._history.length) {
									cmd = typpedCmd;
								} else {
									cmd = that.options._history[historyPos];
								}
								$(this).textEntry('value', cmd);
							}
							e.preventDefault();
							break;
					}
				});
			
			that.options._components.prompt.textEntry('content')
				.width(that.options._components.prompt.innerWidth() - that.options._components.prompt.textEntry('label').outerWidth() - 5)
				.focus();
			
			that._trigger('ready');
		});
	},
	_print: function (contents) {
		var out = $();
		if (!this.options._components.out.length) {
			this.options._components.out = out = $('<p></p>');

			if (this.options._components.prompt.length) {
				out.insertBefore(this.options._components.prompt);
			} else {
				out.appendTo(this.element);
			}
		} else {
			out = this.options._components.out;
		}

		var $input = this.options._components.out.find('input');
		if ($input.length) {
			$input.before(contents);
		} else {
			out.append(contents);
		}

		if (out.find('input').length) {
			out.find('input').last().focus();
		}
	},
	enterCmd: function (cmd) { //Entrer une commande
		var that = this;
		
		if (!this.options._terminal || that.options._runningCmd) {
			this.element.bind('terminalready', function() {
				that.enterCmd(cmd);
			});
			return;
		}
		
		var lastCmd = $('<div></div>').html(this.options._components.prompt.textEntry('label').text()+' '+cmd);
		this.options._components.prompt.after(lastCmd);
		this.options._components.prompt.remove();
		this.options._components.prompt = $();
		
		if (!cmd) {
			this._displayPrompt();
			return;
		}
		
		this._trigger('execute');
		
		that.options._runningCmd = this.options._terminal.enterCmd(cmd, [function(response) {
			var onStopFn = function() {
				that.options._runningCmd = null;
				that._trigger('finished');
				that._displayPrompt();
			};

			that.options._history.push(cmd);

			if (that.options._runningCmd.isRunning()) {
				that.options._runningCmd.bind('stop', function() {
					onStopFn();
				});
			} else {
				onStopFn()
			}
		}, function(response) {
			that.options._runningCmd = null;
			that._trigger('finished');
			that._displayPrompt();
		}]);
	},
	getRunningCmd: function () {
		return this.options._runningCmd;
	}
});
$.webos.terminal = function(callback) {
	return $('<div></div>').terminal({
		callback: callback
	});
};

/**
 * GTerminalWindow represente la fenetre d'un terminal.
 * @param cmd La commande a executer juste apres l'ouverture du terminal.
 * @author $imon
 * @version 1.1
 */
var GTerminalWindow = function (callback) { //La fenetre du terminal
	callback = W.Callback.toCallback(callback);

	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var t = this._translations;
		
		//On initialise la fenetre
		this._window = $.w.window.main({
			title: t.get('Terminal'),
			icon: new W.Icon('apps/terminal'),
			width: 400,
			height: 250,
			stylesheet: '/usr/share/css/gnome-terminal/main.css'
		});

		var that = this;

		this._tabs = $.w.dynamicNotebook().appendTo(this._window.window('content'));
		var tabs = this._tabs;

		tabs.on('dynamicnotebooknewtab', function () {
			var $newTab = tabs.dynamicNotebook('tab', t.get('Terminal'));
			tabs.dynamicNotebook('option', 'selectedTab', $newTab);
		}).on('dynamicnotebooktabadd', function (e, data) {
			that._initTerminal(data.content);
		}).on('dynamicnotebookselect', function (e, data) {
			that._terminal = that._terminals[data.content.data('terminal-index')];

			if (that._terminal) {
				that._updateTerminalTitle(null, data.index);
				that._focusTerminal();
			}
		}).on('dynamicnotebooktabremove', function (e, data) {
			that._terminals[data.content.data('terminal-index')] = $();
			if (tabs.dynamicNotebook('option', 'selectedTab') == data.index) {
				that._terminal = $();
			}

			if (tabs.dynamicNotebook('countTabs') == 0) {
				that._window.window('close');
			}
		});

		tabs.trigger('dynamicnotebooknewtab');

		//Lors du redimentionnement de la fenetre
		this._window.bind('windowresize', function() {
			var prompt = that._terminal.terminal('prompt');
			if (prompt.length) {
				that._terminal.terminal('prompt').textEntry('content')
					.width(that._terminal.terminal('prompt').innerWidth() - that._terminal.terminal('prompt').textEntry('label').outerWidth() - 5)
					.focus();
			} else {
				var lastInput = that._terminal.terminal('outputContainer').find('input').last();
				if (lastInput.length) {
					lastInput.focus();
				}
			}
		}).bind('windowbeforeclose', function(e) { //Avant la fermeture d'une fenetre
			if (that._terminal.length && that._terminal.terminal('getRunningCmd')) {
				$.w.window.confirm({
					title: t.get('Close the terminal ?'),
					label: t.get('A process is still running in the terminal. Close the terminal will kill it.'),
					confirm: function() {
						that._terminal.terminal('getRunningCmd').stop();
						that._window.window('close');
					},
					confirmLabel: t.get('Close the terminal'),
					parentWindow: that._window
				}).window('open');
				e.preventDefault();
			}
		});

		this._window.one('terminalready', function() {
			callback.success(that._terminal);
		});

		//On ouvre la fenetre
		this._window.window('open');
	});
	
	Webos.TranslatedLibrary.call(this);
};
GTerminalWindow.prototype = {
	_version: '1.1',
	_translationsName: 'gnome-terminal',
	_terminal: $(),
	_terminals: [],
	terminal: function() {
		return this._terminal;
	},
	_updateTerminalTitle: function (term, tabIndex) {
		term = term || this._terminal;

		if (!term || !$(term).length) {
			return;
		}

		var promptStr = term.terminal('promptStr');
		if (typeof promptStr == 'string' && promptStr) {
			this._window.window('option', 'title', promptStr);

			if (typeof tabIndex == 'number') {
				this._tabs.dynamicNotebook('tab', tabIndex, promptStr, null);
			}
		}
	},
	_focusTerminal: function () {
		if (!this._terminal || !this._terminal.length) {
			return;
		}

		var prompt = this._terminal.terminal('prompt');
		if (prompt.length) {
			prompt.textEntry('content').focus();
		} else {
			var lastInput = this._terminal.terminal('outputContainer').find('input').last();
			if (lastInput.length) {
				lastInput.focus();
			}
		}
	},
	_initTerminal: function ($ctn) {
		var that = this;

		var scrollPane = $('<div></div>').appendTo($ctn).scrollPane({
			autoReload: true,
			expand: true
		});
		var scrollPaneCtn = scrollPane.scrollPane('content');

		scrollPaneCtn.addClass('terminal-ctn');

		var term = $.w.terminal().appendTo(scrollPaneCtn);
		var termIndex = this._terminals.push(term) - 1;
		$ctn.data('terminal-index', termIndex);

		//Lors du clic sur le terminal
		scrollPaneCtn.click(function(e) {
			if ($(e.target).is(this)) {
				that._focusTerminal();
			}
		});

		term.on('terminalexecute terminalready', function() {
			scrollPane.scrollPane('reload');

			that._updateTerminalTitle(null, that._tabs.dynamicNotebook('tabIndexFromContent', $ctn));
		});
	}
};
Webos.inherit(GTerminalWindow, Webos.Observable);
Webos.inherit(GTerminalWindow, Webos.TranslatedLibrary);

window.GTerminalWindow = GTerminalWindow;