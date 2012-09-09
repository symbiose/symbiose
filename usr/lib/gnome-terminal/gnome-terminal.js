/**
 * Terminal de GNOME.
 * @version 1.1
 * @author $imon
 */

var terminalProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'terminal',
	options: {
		callback: function() {},
		_history: []
	},
	_create: function() {
		this.options.callback = W.Callback.toCallback(this.options.callback);
		
		var that = this;
		var callback = this.options.callback;
		
		this.options._terminal = new W.Terminal();
		
		that._displayPrompt(); //On affiche l'invite de commande
		
		that.element.one('terminalready', function() {
			callback.success(that.element);
		});
		
		Webos.Translation.load(function(t) {
			that.options._translations = t;
			that._trigger('translationsloaded');
		}, 'gnome-terminal');
	},
	terminal: function() {
		return this.options._terminal;
	},
	prompt: function() {
		return this.options._components.prompt;
	},
	_displayPrompt: function() { //Affiche l'invite de commande
		var that = this;
		
		this.options._terminal.refreshData(new W.Callback(function() {
			var data = that.options._terminal.data();
			
			if (data.username === false) {
				var displayErrorFn = function() {
					W.Error.trigger(that.options._translations.get('You are disconnected (the idle time is possibly exceeded)'));
				};
				if (!that.options._translations) {
					that.element.bind('terminaltranslationsloaded', function() {
						displayErrorFn();
					});
				} else {
					displayErrorFn();
				}
				return;
			}
			
			var historyPos = that.options._history.length, typpedCmd = '';
			that.options._components.prompt = $.w.textEntry(data.username+'@'+data.host+':'+data.location+'$ ')
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
	_displayResponse: function(response) { //Afficher la reponse d'une commande
		$('<p></p>')
			.html(response.getAllChannels())
			.appendTo(this.element);
		
		this._trigger('finished');
		
		this._displayPrompt();
	},
	enterCmd: function(cmd) { //Entrer une commande
		var that = this;
		
		if (typeof this.options._terminal == 'undefined' || typeof that.options._runningCmd != 'undefined') {
			this.element.bind('terminalready', function() {
				that.enterCmd(cmd);
			});
			return;
		}
		
		var lastCmd = $('<div></div>').html(this.options._components.prompt.textEntry('label').text()+' '+cmd);
		this.options._components.prompt.after(lastCmd);
		this.options._components.prompt.remove();
		
		if (cmd == '' || typeof cmd == 'undefined') {
			this._displayPrompt();
			return;
		}
		
		this._trigger('execute');
		
		var callback = new W.Callback(function(response) {
			that.options._runningCmd = undefined;
			that.options._history.push(cmd);
			that._displayResponse(response);
		}, function(response) {
			that.options._runningCmd = undefined;
			that._displayResponse(response);
		});
		that.options._runningCmd = this.options._terminal.enterCmd(cmd, callback);
	}
});
$.webos.widget('terminal', terminalProperties);

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
		this._window = $.w.window({
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
			that._terminal.terminal('prompt').textEntry('content')
				.width(that._terminal.terminal('prompt').innerWidth() - that._terminal.terminal('prompt').textEntry('label').outerWidth() - 5)
				.focus();
		});
		
		//Lors du clic sur le terminal
		scrollPane.scrollPane('content').click(function(e) {
			if ($(e.target).is(this)) {
				that._terminal.terminal('prompt').textEntry('content').focus();
			}
		});
		
		this._terminal.bind('terminalexecute terminalready', function() {
			scrollPane.scrollPane('reload');
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