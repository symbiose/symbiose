//Le terminal en lui-meme
var terminalProperties = $.webos.extend($.webos.properties.get('container'), {
	_name: 'terminal',
	options: {
		callback: function() {}
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
		
		var callback = new W.Callback(function(response) {
			var data = response.getData();
			
			if (data.username === false) {
				W.Error.trigger('Vous &ecirc;tres d&eacute;connect&eacute; (il est possible que le temps d\'inactivit&eacute; soit d&eacute;pass&eacute;)');
				return;
			}
			
			that.options._components.prompt = $.w.textEntry(data.username+'@'+data.host+':'+data.location+'$ ')
				.appendTo(that.element)
				.bind('keypress', function(e) {
					if(e.keyCode == 13) {
						var cmd = $(this).textEntry('content').val();
						that.enterCmd(cmd);
					}
				});
			
			that.options._components.prompt.textEntry('content')
				.width(that.options._components.prompt.innerWidth() - that.options._components.prompt.textEntry('label').outerWidth() - 5)
				.focus();
			
			that._trigger('ready');
		});
		
		new W.ServerCall({
			'class': 'TerminalController',
			method: 'getPromptData',
			arguments: { 'terminal': that.options._terminal.getId() }
		}).load(callback);
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
		
		if (typeof this.options._terminal == 'undefined' || typeof that._runningCmd != 'undefined') {
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
			that._runningCmd = undefined;
			that._displayResponse(response);
		}, function(response) {
			that._runningCmd = undefined;
			that._displayResponse(response);
		});
		this._runningCmd = this.options._terminal.enterCmd(cmd, callback);
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
	this.window.bind('resize', function() {
		that.terminal.terminal('prompt').textEntry('content')
			.width(that.terminal.terminal('prompt').innerWidth() - that.terminal.terminal('prompt').textEntry('label').outerWidth() - 5)
			.focus();
	});
	
	//On ouvre la fenetre
	this.window.window('open');
}