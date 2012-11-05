/**
 * Crée une instance de Webos.Cmd, representant une commande.
 * @param {Object} options Les options de la commande.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.Cmd = function WCmd(options) {
	this.cmdText = options.cmd; //Commande complete
	this.cmd = this.cmdText.split(' ').shift(); //Nom de la commande
	this.terminal = options.terminal; //Terminal d'ou la commande sera lancee
	
	//On appelle la classe parente
	Webos.Process.call(this, {
		args: Webos.Arguments.parse(options.cmd)
	});
};
Webos.Cmd.prototype = {
	/**
	 * Recuperer le terminal d'ou la commande est lancee.
	 * @returns {Webos.Terminal} Le terminal.
	 */
	getTerminal: function() {
		return this.terminal;
	},
	/**
	 * Lancer la commande.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que la commande aura ete executee.
	 */
	run: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this;
		
		new Webos.ServerCall({
			'class': 'CmdController',
			'method': 'execute',
			'arguments': { 'cmd': this.cmdText, 'terminal': this.terminal.getId() }
		}).load(new Webos.Callback(function(response) {
			var out = response.getAllChannels();
			if (out) {
				that.getTerminal().echo(out);
			}

			if (!response.isJavascriptEmpty()) { //Si il y a du code JS a executer, on l'execute
				var data = response.getData();

				var auth = new Webos.Authorizations();
				for (var index in data.authorizations) {
					auth.add(data.authorizations[index]);
				}

				Webos.Process.call(that, {
					pid: data.pid,
					key: data.key,
					authorizations: auth,
					fn: response.getJavascript()
				});
				Webos.Cmd.uber.run.call(that);

				callback.success(that);
			} else {
				this.stop();

				callback.success(that);
			}
		}, function(response) {
			var out = response.getAllChannels();
			if (out) {
				that.getTerminal().echo(out);
			}

			callback.error(response);
		}));
	}
};
Webos.inherit(Webos.Cmd, Webos.Process); //Heritage de Webos.Process

/**
 * Executer une commande.
 * @param {String} cmd La commande a executer.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que la commande aura ete executee.
 * @static
 */
Webos.Cmd.execute = function(cmd, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var terminal = new Webos.Terminal();
	terminal.enterCmd(cmd, callback);
};

/**
 * Crée une instance de Webos.Terminal, representant un terminal.
 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que le terminal aura ete initialise.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.Terminal = function WTerminal() {
	this._data = {};
	this._initialized = false;
	this._output = '';
	
	this.id = Webos.Terminal.register(this);

	Webos.Observable.call(this);
};
Webos.Terminal.prototype = {
	/**
	 * Recuperer l'identifiant du terminal.
	 * @returns {Number} L'identifiant du terminal.
	 */
	getId: function() {
		return this.id;
	},
	/**
	 * Recuperer toutes les donnees du terminal.
	 * @returns Toutes les donnees.
	 */
	data: function() {
		return this._data;
	},
	/**
	 * Recuperer une donnee du terminal.
	 * @param {String} key La clef de la donnee.
	 * @returns La valeur correspondant a la clef.
	 */
	get: function(key) {
		return this._data[key];
	},
	/**
	 * Recuperer un chemin absolu depuis un chemin relatif par rapport au dossier courant.
	 * @param {String} path Le chemin relatif par rapport au dossier courant.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que le chemin sera converti.
	 */
	relativePath: function(path, callback) {
		callback.success(this.get('location')+'/'+path);
	},
	/**
	 * 
	 */
	echo: function(contents) {
		contents = String(contents).replace(/\n/g, '<br />');
		this._output += contents;
		this.notify('echo', {
			contents: contents,
			output: this._output,
			cmd: this.cmd
		});
	},
	/**
	 * Executer une commande dans le terminal.
	 * @param {String} cmd La commande a executer.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que la commande aura ete executee.
	 * @returns {Webos.Cmd} La commande.
	 */
	enterCmd: function(cmd, callback) {
		this._output = '';
		this.cmd = new Webos.Cmd({
			cmd: cmd,
			terminal: this
		});
		this.cmd.run(Webos.Callback.toCallback(callback));
		return this.cmd;
	},
	_refreshUserData: function(username, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.User.get([function(user) {
			if (!user) {
				var data = {
					root: false
				};
				callback.success(data);
				return;
			}
			
			user.authorizations([function(auth) {
				var model = auth.model();
				var data = {
					root: (model == 'admin')
				};
				callback.success(data);
			}, callback.error]);
		}, callback.error], username);
	},
	/**
	 * Rafraichir les donnees sur le terminal.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que les donnees auront ete rafraichies.
	 */
	refreshData: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		if (!this._initialized) {
			this.init(callback);
		} else {
			new Webos.ServerCall({
				'class': 'TerminalController',
				method: 'getPromptData',
				arguments: { 'terminal': this.getId() }
			}).load(new Webos.Callback(function(response) {
				that._data = response.getData();
				
				that._refreshUserData(that._data.username, [function(data) {
					that._data = $.extend({}, that._data, data);
					callback.success(that);
				}, function() {
					callback.success(that);
				}]);
			}, callback.error));
		}
	},
	/**
	 * Initialiser le terminal.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que le terminal aura ete initialise.
	 */
	init: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		var that = this;
		
		new Webos.ServerCall({
			'class': 'TerminalController',
			method: 'register',
			arguments: { terminal: this.getId() }
		}).load(new Webos.Callback(function(response) {
			that._data = response.getData();
			that._initialized = true;
			
			that._refreshUserData(that._data.username, [function(data) {
				that._data = $.extend({}, that._data, data);
				callback.success(that);
			}, function() {
				callback.success(that);
			}]);
		}, callback.error));
	}
};
Webos.inherit(Webos.Terminal, Webos.Observable);

/**
 * La liste des terminaux.
 * @private
 * @static
 */
Webos.Terminal._list = [];
/**
 * Ajouter un terminal a la liste interne des terminaux.
 * @param {Webos.Terminal} terminal Le terminal a ajouter.
 * @returns {Number} L'identifiant du terminal dans la liste.
 * @static
 */
Webos.Terminal.register = function(terminal) {
	return Webos.Terminal._list.push(terminal) - 1;
};
/**
 * Recuperer un terminal a partir de son identifiant.
 * @param {Number} id L'identifiant du terminal.
 * @returns {Webos.Terminal} Le terminal.
 * @static
 */
Webos.Terminal.get = function(id) {
	return Webos.Terminal._list[id];
};