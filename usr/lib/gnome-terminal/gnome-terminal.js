/**
 * Terminal de GNOME.
 * @version 1.1
 * @author $imon
 */

$.webos.widget('terminal', 'container', {
	_name: 'terminal',
	options: {
		callback: function() {},
		_history: []
	},
	_translationsName: 'gnome-terminal',
	_create: function() {
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
	terminal: function() {
		return this.options._terminal;
	},
	prompt: function() {
		return this.options._components.prompt;
	},
	_displayPrompt: function() { //Affiche l'invite de commande
		var that = this;

		this.options._components.out = $();
		this.options._components.prompt = $();
		
		this.options._terminal.refreshData(new W.Callback(function() {
			var data = that.options._terminal.data();
			
			if (data.username === false) {
				W.Error.trigger(that.translations().get('You are disconnected (the idle time is possibly exceeded)'));
				return;
			}
			
			var historyPos = that.options._history.length, typpedCmd = '';
			that.options._components.prompt = $.w.textEntry(data.username+'@'+data.host+':'+data.location+((data.root) ? '#' : '$')+' ')
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
		}));
	},
	_print: function(contents) {
		if (!this.options._components.out.length) {
			this.options._components.out = $('<p></p>').appendTo(this.element);
		}

		this.options._components.out.append(contents);
	},
	enterCmd: function(cmd) { //Entrer une commande
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
 * @version 1.0
 */
GTerminalWindow = function GTerminalWindow(callback) { //La fenetre du terminal
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var t = this._translations;
		
		//On initialise la fenetre
		this._window = $.w.window.main({
			title: t.get('Terminal'),
			icon: new W.Icon('apps/terminal'),
			width: 400,
			height: 250,
			stylesheet: 'usr/share/css/gnome-terminal/main.css'
		});
		
		var that = this;
		
		var scrollPane = $('<div></div>').appendTo(this._window.window('content')).scrollPane({
			autoReload: true,
			expand: true
		});
		
		//On initialise le terminal
		this._terminal = $.w.terminal(callback).appendTo(scrollPane.scrollPane('content'));
		
		//Lors du redimentionnement de la fenetre
		this._window.bind('windowresize', function() {
			var prompt = that._terminal.terminal('prompt');
			if (prompt.length) {
				that._terminal.terminal('prompt').textEntry('content')
					.width(that._terminal.terminal('prompt').innerWidth() - that._terminal.terminal('prompt').textEntry('label').outerWidth() - 5)
					.focus();
			}
		});
		
		//Lors du clic sur le terminal
		scrollPane.scrollPane('content').click(function(e) {
			var prompt = that._terminal.terminal('prompt');
			if ($(e.target).is(this) && prompt.length) {
				prompt.textEntry('content').focus();
			}
		});
		
		this._terminal.bind('terminalexecute terminalready', function() {
			scrollPane.scrollPane('reload');
			
			var data = that._terminal.terminal('terminal').data();
			if (data.username !== false) {
				that._window.window('option', 'title', data.username + '@' + data.host + ': ' + data.location);
			} else {
				that._window.window('option', 'title', t.get('Terminal'));
			}
		});
		
		//On ouvre la fenetre
		this._window.window('open');
	});
	
	Webos.TranslatedLibrary.call(this);
};
GTerminalWindow.prototype = {
	_translationsName: 'gnome-terminal',
	terminal: function() {
		return this._terminal;
	}
};
Webos.inherit(GTerminalWindow, Webos.Observable);
Webos.inherit(GTerminalWindow, Webos.TranslatedLibrary);