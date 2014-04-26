/**
 * Execute a script in a sandbox.
 * @param {String}           js     The Javascript code.
 * @param {Webos.Arguments}  [args] Arguments to provide to the script.
 * @constructor
 * @deprecated  Use Webos.Script.create() instead.
 */
Webos.Script = function (js, args, url) {
	this.js = js;
	this.args = args;

	if (!args) { //Si les arguments sont vides
		args = new Webos.Arguments({});
	}
	
	var options = args.getOptions(), params = args.getParams();

	if (js !== '' && js !== null) {
		js = 'try { '+js+' \n} catch(error) { W.Error.catchError(error); }';
	}

	//On ajoute la sandbox
	js = '(function(args) { '+js+"\n"+' })(new W.Arguments({ options: '+JSON.stringify(options)+', params: '+JSON.stringify(params)+' }));';

	Webos.Script.run(js, url); //On execute le tout
};

/**
 * Execute a script in a sandbox.
 * @param {String}           js     The Javascript code.
 * @param {Webos.Arguments}  [args] Arguments to provide to the script.
 */
Webos.Script.create = function (js, args, url) {
	return new Webos.Script(js, args, url);
};

/**
 * Run a script.
 * @param  {String} js  The Javascript code.
 * @param  {String|Object} options The script URL (for debugging), or options.
 * @static
 */
Webos.Script.run = function (js, options) {
	if (typeof options == 'string') {
		options = { sourceUrl: options };
	}
	options = $.extend({
		sourceUrl: '',
		context: null,
		arguments: null
	}, options);

	//Not good for debugging
	//js = js.replace(/\/\*([\s\S]*?)\*\//g, ''); //Remove comments

	//Set source URL for debugging
	if (options.sourceUrl && /^\s*(\S*?)\s*$/m.test(options.sourceUrl)) {
		js += '\n//# sourceURL='+options.sourceUrl;
	}

	if (options.context || options.arguments) {
		Webos.Script.run._ctx = options.context || window;
		Webos.Script.run._args = options.arguments || [];

		var argsNames = '';
		if (!(options.arguments instanceof Array)) {
			argsNames = Object.keys(options.arguments).join(', ');

			var argsValues = [];
			for (var arg in options.arguments) {
				argsValues.push(options.arguments[arg]);
			}
			Webos.Script.run._args = argsValues;
		}

		js = '(function ('+argsNames+') { '+js+'\n }).apply(Webos.Script.run._ctx, Webos.Script.run._args);';
	}

	var s = document.createElement('script');
	s.innerHTML = '\n'+js+'\n';

	if (document.head) {
		document.head.appendChild(s);
	} else {
		document.appendChild(s);
	}
};

/**
 * Load a script from a Javascript file.
 * The script is loaded synchronously.
 * @param  {String} path The file's path.
 * @static
 */
Webos.Script.load = function (path) {
	$.ajax({
		url: path,
		dataType: "script",
		cache: true,
		async: false
	});
};

/**
 * A Javascript file.
 * @param {String} path The file's path.
 * @constructor
 */
Webos.ScriptFile = function (path) { //Permet d'inclure un fichier Javascript
	if (!/^(\/|~\/)/.test(path)) {
		path = '/'+path;
	}
	
	this.run = function() {
		Webos.ScriptFile._cache[this.path] = this._js;
		if (this._js) {
			var js = 'try {'+this._js+"\n"+'} catch(error) { W.Error.catchError(error); }';

			Webos.Script.run(js, path);
		}
	};
	
	this._js = null;
	this.path = path;
	
	if (typeof W.ScriptFile._cache[path] != 'undefined') {
		this._js = W.ScriptFile._cache[path];
		this.run();
		return;
	}
	
	var that = this;
	
	new Webos.ServerCall({
		'class': 'FileController',
		'method': 'getContents',
		'arguments': {
			file: path
		},
		async: false
	}).load(function(response) {
		var js = response.getStandardChannel();
		if (js) {
			that._js = js;
			that.run();
		}
	});
};

/**
 * Cache for Javascript files.
 * @type {Object}
 * @private
 */
Webos.ScriptFile._cache = {};

/**
 * Load multiple scripts.
 * Arguments are strings containing file's path.
 * @returns {Webos.ServerCall.Group}
 */
Webos.ScriptFile.load = function () {
	var group = new Webos.ServerCall.Group([], { async: false });

	var handlePath = function (path) {
		group.add(new Webos.ServerCall({
			'class': 'FileController',
			'method': 'getContents',
			'arguments': {
				file: path
			},
			async: false
		}), function(response) {
			var js = response.getStandardChannel();

			if (js) {
				js = 'try {'+js+"\n"+'} catch(error) { W.Error.catchError(error); }';
				Webos.Script.run(js, path);
			}
		});
	};

	for (var i = 0; i < arguments.length; i++) {
		handlePath(arguments[i]);
	}
	
	group.load();
	
	return group;
};

/**
 * Include a script.
 * @param  {String} path    The file's path.
 * @param  {Array} [args]    Arguments to provide to the script.
 * @param  {Object} [thisObj] The scope in which the script will be executed.
 * @deprecated Use Webos.ScriptFile.load() or Webos.require() instead.
 */
function include(path, args, thisObj) {
	thisObj = thisObj || window;
	this.ajax = $.ajax({
		url: path,
		method: 'get',
		async: false,
		dataType: 'text',
		success: function(contents, textStatus, jqXHR) {
			if (typeof args == 'undefined') { //Si les arguments sont vides
				args = new W.Arguments({});
			}

			Webos.Script.run(contents, {
				arguments: {
					args: args
				},
				sourceUrl: path
			});
		}
	});
}

/**
 * Include Javascript files and CSS stylesheets.
 * @param  {Array|String}   files      File(s).
 * @param  {Webos.Callback} callback   The callback.
 * @param  {Object}         [options]  Global options.
 * @static
 */
Webos.require = function (files, callback, options) {
	callback = Webos.Callback.toCallback(callback);

	if (!files) { //No file to load
		callback.success();
		return;
	}

	var list = [];
	if (files instanceof Array) {
		if (!files.length) {
			callback.success();
			return;
		}
		list = files;
	} else {
		list = [files];
	}

	var loadOperation = new Webos.Operation();

	var loadedFiles = 0;
	var onLoadFn = function(file) {
		loadedFiles++;

		if (file && Webos.require._stacks[file.get('path')]) {
			delete Webos.require._stacks[file.get('path')];
		}

		if (loadedFiles == list.length) {
			callback.success();
			loadOperation.setCompleted(true);
		}
	};

	var handleFile = function (i, requiredFile) {
		if (typeof requiredFile != 'object') {
			requiredFile = { path: requiredFile };
		}

		/*!
		 * Options:
		 *  * `path`: the file path
		 *  * `contents`: alternatively, you can specify the file's contents
		 *  * `process`: if false, the file will just be loaded, not processed. If a function, will be called to process the file with the file's contents as first parameter.
		 *
		 * CSS options:
		 *  * `styleContainer`: the CSS style container, on which teh rules will be applied
		 * 
		 * Javascript options:
		 *  * `context`: the context in which the script will be executed
		 *  * `arguments`: some arguments to provide to the script
		 *  * `exportApis`: APIs names to export to global scope
		 *  * `optionnal`: do not wait for the file to be fully loaded before continuing
		 * 
		 * @type {Object}
		 */
		requiredFile = $.extend({
			path: '',
			contents: null,
			context: null,
			arguments: [],
			styleContainer: null,
			exportApis: [],
			process: true,
			optionnal: false,
			type: 'text/javascript'
		}, options, requiredFile);

		if (!requiredFile.context && Webos.Process && Webos.Process.current()) {
			requiredFile.context = Webos.Process.current();
		}

		if (typeof requiredFile.path == 'string') {
			requiredFile.path = requiredFile.path.replace(/^\.\//, '/'); //Compatibility with old scripts
			requiredFile.path = Webos.File.beautifyPath(requiredFile.path);
		}

		var file;
		if (typeof requiredFile.contents == 'string') {
			file = Webos.VirtualFile.create(requiredFile.contents, {
				mime_type: requiredFile.type,
				path: requiredFile.path
			});

			if (requiredFile.path) {
				Webos.require._cache[requiredFile.path] = file;
			}
		} else if (requiredFile.path) {
			var path = requiredFile.path;

			//Check if the file is in the cache
			if (Webos.require._cache[path]) {
				file = Webos.require._cache[path];
				console.log('... loading from cache: '+path);
			} else {
				file = W.File.get(path, { is_dir: false });
				console.log('loading from network: '+path);
			}
		} else {
			onLoadFn();
			return;
		}

		var processFile = function (contents) {
			if (requiredFile.process === false) {
				onLoadFn(file);
				return;
			}
			if (typeof requiredFile.process == 'function') {
				var result = requiredFile.process(contents, requiredFile);
				if (result === true) {
					requiredFile.process = true;
					processFile(contents);
				}
				onLoadFn(file);
				return;
			}

			if (file.get('extension') == 'js' || file.matchesMimeType('text/javascript')) {
				var previousFile = Webos.require._currentFile;
				Webos.require._stacks[file.get('path')] = [];
				Webos.require._currentFile = file.get('path');

				if (typeof requiredFile.exportApis != 'undefined') {
					if (!(requiredFile.exportApis instanceof Array)) {
						requiredFile.exportApis = [requiredFile.exportApis];
					}

					var exportApiCode = '';
					for (var i = 0; i < requiredFile.exportApis.length; i++) {
						var apiName = requiredFile.exportApis[i];
						exportApiCode += 'if (typeof '+apiName+' != "undefined") { window.'+apiName+' = '+apiName+'; }\n';
					}

					contents += '\n'+exportApiCode;
				}

				contents = 'try { '+contents+' \n} catch(error) { W.Error.catchError(error); }';
				Webos.Script.run(contents, {
					scourceUrl: file.get('path'),
					context: requiredFile.context,
					arguments: requiredFile.arguments
				});

				Webos.require._currentFile = previousFile;

				if (requiredFile.optionnal) {
					onLoadFn(file);
				} else {
					var stack = Webos.require._stacks[file.get('path')];
					var group = Webos.Operation.group(stack);
					if (group.observables().length > 0 && !group.completed()) {
						group.one('success', function() {
							onLoadFn(file);
						});
						group.oneEach('error', function() {
							callback.error();
						});
					} else {
						onLoadFn(file);
					}
				}
			} else if (file.get('extension') == 'css' || file.matchesMimeType('text/css')) {
				Webos.Stylesheet.insertCss(contents, requiredFile.styleContainer);
				onLoadFn(file);
			} else {
				callback.error(Webos.Callback.Result.error('Unknown file type: "'+file.get('extension')+'" (file path: "'+file.get('path')+'")'));
			}
		};

		if (requiredFile.contents) {
			processFile(requiredFile.contents);
		} else if (requiredFile.path) {
			var call = file.readAsText([function(contents) {
				processFile(contents);
			}, callback.error]);
		}
	};

	for (var i = 0; i < list.length; i++) {
		handleFile(i, list[i]);
	}

	if (Webos.require._currentFile) {
		Webos.require._stacks[Webos.require._currentFile].push(loadOperation);
	}

	return loadOperation;
};

/**
 * Stack for included Javascript files.
 * @type {Object}
 * @static
 * @private
 */
Webos.require._stacks = {};

/**
 * Current Javascript file which is included.
 * @type {Webos.ServerCall}
 * @static
 * @private
 */
Webos.require._currentFile = null;

Webos.require._currentOperation = null;

/**
 * Cache for files with explicit contents
 * @type {Object}
 */
Webos.require._cache = {};

/**
 * Arguments to be provided to a script.
 * @param {Object} args The arguments' structure.
 * @constructor
 * @deprecated  The use of this class is deprecated.
 * @todo Simplify argument's management.
 */
Webos.Arguments = function (args) {
	this.args = args || {};
	if (typeof this.args.options == 'undefined') { this.args.options = {}; }
	if (typeof this.args.params == 'undefined') { this.args.params = []; }
	
	this.isOption = function(name) { //Une option est-elle definie ?
		return (typeof this.args.options[name] != 'undefined');
	};
	this.getOption = function(name) { //Recuperer le contenu de l'option
		return this.args.options[name];
	};
	this.getOptions = function() { //Recuperer ttes les options
		return this.args.options;
	};
	this.countNbrParams = function() { //Compter le nbr de parametres
		return this.args.params.length;
	};
	this.isParam = function(no) { //Un parametre existe-t-il ?
		return (typeof this.args.params[no] != 'undefined');
	};
	this.getParam = function(no) { //Recuperer un parametre
		return this.args.params[no];
	};
	this.getParams = function() { //Recuperer ts les parametres
		return this.args.params;
	};
};

/**
 * Parse a command.
 * @param   {String} fullCmd  The command.
 * @returns {Webos.Arguments} The parsed arguments.
 * @static
 * @deprecated  The use of Webos.Arguments is deprecated.
 */
Webos.Arguments.parse = function(fullCmd) {
	if (Webos.isInstanceOf(fullCmd, Webos.Arguments)) {
		return fullCmd;
	}
	if (typeof fullCmd == 'object') {
		return new Webos.Arguments(fullCmd);
	}

	var parsedCmd = Webos.Arguments._parseFullCmd(fullCmd),
		argsStr = parsedCmd.args;
	
	var parsed = {
		options: {},
		params: [],
		cmd: parsedCmd.cmd
	};
	var cacheBase = {
		strStarted: false,
		strType: '',
		strIndex: '',
		strContent: '',
		previous: '',
		strOptionType: '',
		strStage: 'index'
	};
	var cache = $.extend({}, cacheBase);
	
	for (var i = 0; i < argsStr.length; i++) { //Pour chaque caractere char
		var char = argsStr[i];
		
		if (char == '"') { //Delimiteur de chaine
			if (cache.previous == '\\') { //Si on a echappe le delimiteur
				if (cache.strStage == 'content') { //Si on remplit le contenu
					cache.strContent = cache.strContent.substr(0, -1); //On enleve le \
					cache.strContent += char; //On ajoute le "
				} else { //Sinon on remplit l'index
					cache.strIndex = cache.strIndex.substr(0, -1); //on enleve le \
					cache.strIndex += char; //On ajoute le "
				}
			} else {
				if (cache.strStarted === false) { //Si c'est le premier
					cache.strStarted = true; //On le sauvegarde
				} else { //Sinon, fin de chaine
					cache.strStarted = false;
				}
			}
		} else if (char == ' ' && cache.strStarted !== true) { //Si c'est un espace et qu'on n'est pas dans une chaine
			if (cache.strType == 'options') { //Si c'est une option
				if (cache.strOptionType == 'short') { //Option courte
					cache.strStage = 'content';
				} else {
					parsed.options[cache.strIndex] = cache.strContent; //On sauvegarde
					cache = $.extend({}, cacheBase); //On remet le cache a zero
				}
			} else { //Sinon, c'est un argument
				parsed.params.push(cache.strIndex); //On sauvegarde
				cache = $.extend({}, cacheBase); //On remet le cache a zero
			}
		} else if (char == '-') { //Si c'est un tiret
			if (cache.previous == '-') { //Si le caractere precedant etait aussi un tiret, c'est une option type --fruit=abricot
				cache.strOptionType = 'long'; //Type de l'option
			} else if (cache.previous == ' ' || !cache.previous) { //Si c'etait un espace blanc, c'est une option type -aBv
				cache.strType = 'options'; //C'est une option
				cache.strOptionType = 'short'; //Type de l'option
				cache.strStage = 'index'; //On remplit l'index
			} else { //Sinon, ce n'est pas une option (e.g. fruit-de-mer)
				if (cache.strStage == 'content') { //Si on remplit le contenu
					cache.strContent += char; //On ajoute le -
				} else { //Sinon, on remplit l'index
					cache.strIndex += char; //On ajoute le -
				}
			}
		} else if (char == '=') { //Si c'est un =
			if (cache.strType == 'options' && cache.strOptionType == 'long') { //Si c'est une option type --fruit=abricot
				cache.strStage = 'content'; //On remplit maintenant le contenu
			}
		} else { //Autre caractere
			if (cache.strStage == 'content') { //Si on remplit le contenu
				cache.strContent += char; //On ajoute le caractere
			} else { //Sinon on remplit l'index
				if (cache.strType == 'options') { //Si c'est une option
					if (cache.strOptionType == 'long') { //Si c'est une option type --fruit=abricot
						cache.strIndex += char; //On remplit l'index
					} else { //Sinon, c'est une option type -aBv
						parsed.options[char] = ''; //On ajoute l'option
						//On definit les parametres au cas ou il y a une autre option apres
						cache = $.extend({}, cacheBase); //On reinitialise le cache
						cache.strType = 'options'; //C'est une option
						cache.strOptionType = 'short'; //C'est une option type -aBv
						cache.strStage = 'index'; //On remplit l'index
						cache.strIndex = char;
					}
				} else { //Sinon c'est un argument
					cache.strIndex += char; //On ajoute le caractere
				}
			}
		}
		cache.previous = char; //On definit le caractere precedant
	}

	//On vide le cache du dernier caractere
	if (cache.strIndex) {
		if (cache.strType == 'options') {
			parsed.options[cache.strIndex] = cache.strContent;
		} else {
			parsed.params.push(cache.strIndex);
		}
	}

	return new Webos.Arguments(parsed);
};

Webos.Arguments._parseFullCmd = function (fullCmd) {
	var parsed = {
		cmd: '',
		args: ''
	};

	var firstSep = fullCmd.indexOf(' ');
	if (~firstSep) {
		parsed.cmd = fullCmd.substr(0, firstSep);
		parsed.args = fullCmd.substr(firstSep + 1);
	} else {
		parsed.cmd = fullCmd;
	}

	return parsed;
};

Webos.Arguments.getCommand = function (fullCmd) {
	var parsedCmd = Webos.Arguments._parseFullCmd(fullCmd);

	return parsedCmd.cmd;
};
