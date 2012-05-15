//Le terminal en lui-meme
var terminalProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'terminal',
	options: {
		callback: function() {},
		_history: []
	},
	_create: function() {
		this.options.callback = W.Callback.toCallback(this.options.callback);
		
		var that = this;
		var userCallback = this.options.callback;
		
		var callback = new W.Callback(function() {
			that._displayPrompt(); //On affiche l'invite de commande
			
			that.element.one('terminalready', function() {
				userCallback.success(that.element);
			});
		}, function(response) {
			that.element.remove();
			
			userCallback.error(response);
		});
		
		this.options._terminal = new W.Terminal(callback);
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
				W.Error.trigger('Vous &ecirc;tres d&eacute;connect&eacute; (il est possible que le temps d\'inactivit&eacute; soit d&eacute;pass&eacute;)');
				return;
			}
			
			var historyPos = that.options._history.length, typpedCmd = '';
			that.options._components.prompt = $.w.textEntry(data.username+'@'+data.host+':'+data.location+'$ ')
				.appendTo(that.element)
				.keydown(function(e) {
					switch (e.keyCode) {
						case 13: //Enter
							var cmd = $(this).textEntry('value');
							that.enterCmd(cmd);
							break;
						case 38: //Up
							if (historyPos > 0) {
								if (historyPos == that.options._history.length) {
									typpedCmd = $(this).textEntry('value');
								}
								historyPos--;
								$(this).textEntry('value', that.options._history[historyPos]);
							}
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
function GTerminalWindow(callback) { //La fenetre du terminal
	//On initialise la fenetre
	this.window = $.w.window({
		title: 'Terminal',
		icon: new SIcon('apps/terminal'),
		width: 400,
		height: 250,
		stylesheet: 'usr/share/css/gnome-terminal/main.css'
	});
	
	var that = this;
	
	//On initialise le terminal
	this.terminal = $.w.terminal(callback);
	
	//On ajoute le terminal a la fenetre
	this.window.window('content').append(this.terminal);
	
	//Lors du redimentionnement de la fenetre
	this.window.bind('windowresize', function() {
		that.terminal.terminal('prompt').textEntry('content')
			.width(that.terminal.terminal('prompt').innerWidth() - that.terminal.terminal('prompt').textEntry('label').outerWidth() - 5)
			.focus();
	});
	
	//On ouvre la fenetre
	this.window.window('open');
}