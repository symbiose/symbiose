/**
 * A terminal command.
 * @param {Object} options The command's options.
 * @since 1.0alpha1
 * @constructor
 */
Webos.Cmd = function (options, term) {
	if (typeof options === 'string') {
		options = Webos.Terminal.parseCmd(cmd)[0];
	}

	if (term) {
		options.terminal = term;
	}
	if (!options.terminal) {
		options.terminal = Webos.Terminal.create();
	}

	if (!options.cmd) {
		options.cmd = options.executable;
	}

	this._options = options;

	/*!
	 * Compatibility shim.
	 * @deprecated
	 */
	this.fullCmd = options.cmd; //Commande complete
	this.cmdText = this.fullCmd;

	this.cmd = options.executable; //Nom de la commande
	this.terminal = options.terminal; //Terminal d'ou la commande sera lancee

	//On appelle la classe parente
	Webos.Process.call(this, {
		args: Webos.Arguments.parse(options.args)
	});
};
/**
 * Webos.Cmd's prototype.
 */
Webos.Cmd.prototype = {
	/**
	 * Get this command's terminal.
	 * @return {Webos.Terminal} The terminal.
	 */
	getTerminal: function() {
		return this.terminal;
	},
	/**
	 * Run this command.
	 * @param {Webos.Callback} callback The callback.
	 * @return {Webos.Operation} The operation.
	 */
	run: function(callback) {
		var that = this, op = Webos.Operation.create().addCallbacks(callback);

		var writeOutputs = function (outputs, contents) {
			var op = Webos.Operation.create(), completedOutputs = 0;

			if (!outputs) {
				outputs = [];
			}

			var outputCompleted = function (output) {
				completedOutputs++;

				if (completedOutputs >= outputs.length) {
					op.setCompleted();
				}
			};

			var handleOutput = function (output) {
				if (output.type === 'file') {
					var file = Webos.File.get(that._options.terminal.absolutePath(output.file));
					if (!file) {
						outputCompleted(output);
						return;
					}

					var writeFile = function (contents) {
						file.writeAsText(contents, [function () {
							outputCompleted(output);
						}, function (resp) {
							outputCompleted(output);
						}]);
					};

					if (output.append) {
						file.readAsText([function (fileContents) {
							writeFile(fileContents+contents);
						}, function (resp) {
							if (resp.getStatusCode() === 404) { // Non-existing file
								writeFile(contents);
							} else {
								outputCompleted(output);
							}
						}]);
					} else {
						writeFile(contents);
					}
				} else if (output.type === 'function') {
					output.callback(contents);
					outputCompleted(output);
				} else {
					outputCompleted(output);
				}
			};

			for (var i = 0; i < outputs.length; i++) {
				handleOutput(outputs[i]);
			}

			return op;
		};

		new Webos.ServerCall({
			'class': 'CmdController',
			'method': 'execute',
			'arguments': { 'cmd': this._options.cmd, 'terminal': this._options.terminal.getId() }
		}).load([function(response) {
			var out = response.getAllChannels();
			if (out) {
				that.getTerminal().echo(out);
				writeOutputs(that._options.outputs, out);
			}

			var data = response.getData();
			if (data.script) { //Si il y a du code JS a executer, on l'execute
				var auth = new Webos.Authorizations();
				for (var index in data.authorizations) {
					auth.add(data.authorizations[index]);
				}

				Webos.Process.call(that, {
					pid: data.pid,
					key: data.key,
					authorizations: auth,
					fn: data.script
				});

				// Cannot write files dynamically
				// If writing just before a process is stopped, callbacks won't be called
				// And cache won't be updated
				/*var echoEventName = 'echo.'+that.getPid()+'.cmd';
				that._options.terminal.on(echoEventName, function (eventData) {
					writeOutputs(that._options.outputs, eventData.text);
				});

				that.one('stop', function () {
					that._options.terminal.off(echoEventName);
				});*/

				out = '';
				var echoEventName = 'echo.'+that.getPid()+'.cmd';
				that._options.terminal.on(echoEventName, function (eventData) {
					out += eventData.text;
				});
				that.one('stop', function () {
					that._options.terminal.off(echoEventName);
					writeOutputs(that._options.outputs, out);
				});

				Webos.Process.prototype.run.call(that);

				op.setCompleted();
			} else {
				that.stop();

				op.setCompleted();
			}
		}, function(response) {
			var out = response.getAllChannels();
			if (out) {
				that.getTerminal().echo(out);
			}

			op.setCompleted(response);
		}]);

		return op;
	}
};
Webos.inherit(Webos.Cmd, Webos.Process);

/**
 * Run a command.
 * @param {String} cmd The command to execute.
 * @param {Webos.Callback} callback The callback.
 * @static
 */
Webos.Cmd.execute = function(cmd, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var terminal = Webos.Terminal.create();
	terminal.enterCmd(cmd, callback);
};

/**
 * A terminal.
 * @since 1.0alpha1
 * @constructor
 */
Webos.Terminal = function () {
	this._data = {
		location: '~'
	};
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
	 * Set this terminal's location.
	 * @param {String} path The new location.
	 */
	setLocation: function (path) {
		this._data.location = path;
	},
	/**
	 * Recuperer un chemin absolu depuis un chemin relatif par rapport au dossier courant.
	 * @param {String} path Le chemin relatif par rapport au dossier courant.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que le chemin sera converti.
	 * @deprecated Use absolutePath().
	 */
	relativePath: function(path, callback) {
		callback.success(this.get('location')+'/'+path);
	},
	/**
	 * Recuperer un chemin absolu depuis un chemin relatif par rapport au dossier courant.
	 * @param {String} path Le chemin relatif par rapport au dossier courant.
	 */
	absolutePath: function(path) {
		var absPath = path;
		if (path.substr(0, 1) != '/' && path.substr(0, 2) != '~/' && path != '~') { //Relative path
			absPath = this.get('location')+'/'+path;
		}

		return absPath;
	},
	/**
	 * Output some content.
	 * @param  {string} output The content.
	 */
	echo: function(output) {
		output = String(output);

		contents = output.replace(/\n/g, '<br />').replace(/(^ | $)/g, '&nbsp;');
		text = $('<div></div>').html(output).text();

		this._output += contents;
		this.notify('echo', {
			contents: contents,
			text: text,
			output: this._output,
			cmd: this.cmd
		});
	},
	/**
	 * Prompt some question.
	 * @param  {Function} callback The callback.
	 * @param  {object}   options  Options, which are mainly "label" and "type".
	 */
	prompt: function(callback, options) {
		var that = this;

		if (this._promptCallback) {
			return;
		}

		var originalOptions = options;
		options = $.extend({
			label: '',
			type: 'text'
		}, options);

		if (options.type == 'yn') {
			options.label += ' [Y/n] ';
		}

		var triggerResult = function (val) {
			callback(val);
		};

		this._promptCallback = function(e, el) {
			if (e.type == 'keydown') {
				if (e.keyCode == 13) {
					e.preventDefault();
					that._promptCallback = null;

					var val = $(el).val();
					$(el).replaceWith(val);

					that.echo('\n');

					switch (options.type) {
						case 'yn':
							if (val == 'Y' || val == 'n') {
								triggerResult(val);
							} else {
								if (originalOptions.label.indexOf('\n') !== 0) {
									originalOptions.label = '\n' + originalOptions.label;
								}
								that.prompt(callback, originalOptions);
							}
							break;
						//case 'text':
						default:
							triggerResult(val);
					}
				}
			}
		};

		var callbackName = 'Webos.Terminal._list['+this.getId()+']._promptCallback';
		options.label += '<input type="text" onkeydown="'+callbackName+'(event || window.event, this);"';

		if (options.type == 'yn') {
			options.label += ' size="2" maxlength="1"';
		}

		options.label += '/>';

		this.echo(options.label);
	},
	/**
	 * Executer une commande dans le terminal.
	 * @param {String|Object} cmd La commande a executer, ou les options a passer au constructeur de `Webos.Cmd`.
	 * @param {Webos.Callback} callback La fonction de rappel qui sera appelee une fois que la commande aura ete executee.
	 * @return {Webos.Cmd} La commande.
	 */
	enterCmd: function(cmd, callback) {
		var that = this;
		callback = Webos.Callback.toCallback(callback);

		this._output = '';

		var stack = [],
			i;

		if (typeof cmd == 'string') {
			stack = Webos.Terminal.parseCmd(cmd);
		} else if (typeof cmd === 'object') {
			if (!(cmd instanceof Array)) {
				cmd = [cmd];
			}

			for (i = 0; i < cmd.length; i++) {
				stack.push(cmd[i]);
			}
		}

		var current;
		i = -1;

		var nextCmd = function () {
			i++;
			current = stack[i];

			if (i >= stack.length) { // Finished!
				callback.success();
				return;
			}

			var cmd = new Webos.Cmd(current, that);
			that.cmd = cmd;

			cmd.run([function () {
				nextCmd();
			}, callback.error]);
		};

		nextCmd();

		return this.cmd;
	},
	_refreshUserData: function(username, callback) {
		callback = Webos.Callback.toCallback(callback);

		if (!username) {
			callback.success({
				root: false
			});
			return;
		}

		Webos.User.getByUsername(username, [function(user) {
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
		}, callback.error]);
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
			}).load([function(response) {
				var data = response.getData();
				if (!data.host) {
					data.host = window.location.host;
				}
				that._data = data;

				that._refreshUserData(that._data.username, [function(data) {
					that._data = $.extend({}, that._data, data);
					callback.success(that);
				}, function() {
					callback.success(that);
				}]);
			}, callback.error]);
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
		}).load([function(response) {
			var data = response.getData();
			if (!data.host) {
				data.host = window.location.host;
			}
			that._data = data;

			that._initialized = true;
			
			that._refreshUserData(that._data.username, [function(data) {
				that._data = $.extend({}, that._data, data);
				callback.success(that);
			}, function() {
				callback.success(that);
			}]);
		}, callback.error]);
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

/**
 * Create a new terminal.
 * @return {Webos.Terminal} The terminal.
 */
Webos.Terminal.create = function() {
	return new Webos.Terminal();
};

/**
 * Parse a terminal command.
 * Inspired from _Javascript: the good parts_ by Douglas Crockford
 */
Webos.Terminal.parseCmd = (function () {
	var at, // The index of the current character
		ch, // The current character
		text, // The command to parse

		error = function (msg) { // Call error when something is wrong
			throw {
				name: 'SyntaxError',
				message: msg,
				at: at,
				text: text,
				toString: function () {
					return this.name+': '+this.message+' (at character '+this.at+')';
				}
			};
		},

		next = function (c) {
			//If c is provided, check that it matches the cuirrent character
			if (c && c !== ch) {
				error('Expected "'+c+'" instead of "'+ch+'"');
			}

			// Get the next character
			// When there are no more characters, return an empty string
			ch = text.charAt(at);
			at += 1;
			return ch;
		},

		string = function () { // Parse a string value
			var string = '', delimiter = '';

			if (ch == '\'' || ch == '"') {
				delimiter = ch;
			} else {
				string = ch;
			}

			while (next()) {
				if ((delimiter && ch === delimiter) || (!delimiter && ch <= ' ')) {
					next();
					return string;
				} else if (ch === '\\') {
					next();

					if ((delimiter && ch !== delimiter) || (!delimiter && ch > ' ')) {
						string += '\\';
					}

					string += ch;
				} else {
					string += ch;
				}
			}

			if (delimiter) {
				error('Bad string');
			}

			return string;
		},

		white = function () { // Skip whitespace
			while (ch && ch <= ' ') {
				next();
			}
		},

		args = function () {
			var args = [];

			while (ch && ch !== '>' && ch !== '<' && ch !== '|' && ch !== ';') {
				args.push(string());
				white();
			}

			return args;
		},

		cmd = function () {
			var fromIndex = at - 1, cmd = {
				args: []
			};

			cmd.executable = string();
			white();
			cmd.args = args();

			cmd.cmd = text.substr(fromIndex, at - 1).trim();

			return cmd;
		},

		writeOutput = function () { // > and >>
			var opts = {
				type: 'file',
				append: false,
				channel: 1
			};

			next();
			if (ch === '>') {
				opts.append = true;
				next();
			}
			white();

			opts.file = string();

			return opts;
		},

		parse = function () {
			var output = [];

			while (ch) {
				var c = cmd();
				c.input = null;
				c.outputs = [];

				output.push(c);

				while (true) {
					if (ch === '>') {
						c.outputs.push(writeOutput());
					} else if (ch === ';') {
						next();
					} else {
						break;
					}
				}
			}

			return output;
		};

	return function (input) {
		var output;

		text = input;
		at = 0;
		ch = ' ';

		white();
		output = parse();
		white();

		if (ch) {
			error('Syntax error');
		}

		return output;
	};
})();