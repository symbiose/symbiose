/**
 * Execute a script in a sandbox.
 * @param {String}           js     The Javascript code.
 * @param {Webos.Arguments}  [args] Arguments to provide to the script.
 * @constructor
 */
Webos.Script = function WScript(js, args) {
	this.js = js;
	this.args = args;
	
	if (typeof args == 'undefined') { //Si les arguments sont vides
		args = new Webos.Arguments({});
	}
	
	var options = args.getOptions(), params = args.getParams(), paramsString;
	
	if (params.length > 0) { //On transfore les parametres envoyes au script en chaine de caracteres
		paramsString = '"'+params.join('", "')+'"';
	} else {
		paramsString = '';
	}
	
	if (js != '' && js != null) {
		js = 'try {'+js+"\n"+'} catch(error) { W.Error.catchError(error); }';
	}
	
	//On ajoute la sandbox
	js = '(function(args) { '+js+' })(new W.Arguments({ options: '+JSON.stringify(options)+', params: ['+paramsString+'] }));';
	Webos.Script.run(js); //On execute le tout
};

/**
 * Run a script.
 * @param  {String} js The Javascript code.
 * @static
 */
Webos.Script.run = function $_WScript_run(js) {
	js = js.replace(/\/\*([\s\S]*?)\*\//g, ''); //On enleve les commentaires
	$.globalEval(js);
};

/**
 * Load a script from a Javascript file.
 * The script is loaded synchronously.
 * @param  {String} path The file's path.
 * @static
 */
Webos.Script.load = function $_WScript_load(path) {
	$.ajax({
		url: path,
		dataType: "script",
		async: false
	});
};

/**
 * A Javascript file.
 * @param {String} path The file's path.
 * @constructor
 */
Webos.ScriptFile = function WScriptFile(path) { //Permet d'inclure un fichier Javascript
	if (!/^(\/|~\/)/.test(path)) {
		path = '/'+path;
	}
	
	this.run = function() {
		Webos.ScriptFile._cache[this.path] = this._js;
		if (this._js) {
			var js = 'try {'+this._js+"\n"+'} catch(error) { W.Error.catchError(error); }';
			Webos.Script.run(js);
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
Webos.ScriptFile.load = function $_WScriptFile_load() {
	var group = new Webos.ServerCall.Group([], { async: false });
	for (var i = 0; i < arguments.length; i++) {
		group.add(new Webos.ServerCall({
			'class': 'FileController',
			'method': 'getContents',
			'arguments': {
				file: arguments[i]
			}
		}), function(response) {
			var js = response.getStandardChannel();
			
			if (js) {
				js = 'try {'+js+"\n"+'} catch(error) { W.Error.catchError(error); }';
				Webos.Script.run(js);
			}
		});
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
		success: function(data, textStatus, jqXHR) {
			if (typeof args == 'undefined') { //Si les arguments sont vides
				args = new W.Arguments({});
			}
			
			var fn = new Function('args', data);
			fn.call(thisObj, args);
		}
	});
}

/**
 * Include Javascript files and CSS stylesheets.
 * @param  {Array|String}   files      File(s).
 * @param  {Webos.Callback} callback   The callback.
 * @param  {Object}         [options]  Options.
 * @static
 */
Webos.require = function Wrequire(files, callback, options) {
	callback = Webos.Callback.toCallback(callback);
	options = $.extend({
		styleContainer: null
	}, options);

	if (!files) { //No file to load
		callback.success();
		return;
	}

	var list = [];
	if (files instanceof Array) {
		if (files.length == 0) {
			callback.success();
			return;
		}
		list = files;
	} else {
		list = [String(files)];
	}

	var loadOperation = new Webos.Operation();

	var loadedFiles = 0;
	var onLoadFn = function(file) {
		loadedFiles++;
		delete Webos.require._stacks[file.get('path')];

		if (loadedFiles == list.length) {
			callback.success();
			loadOperation.setCompleted(true);
		}
	};

	for (var i = 0; i < list.length; i++) {
		(function(path) {
			var file = W.File.get(path);

			var call = file.readAsText([function(contents) {
				if (file.get('extension') == 'js') {
					var previousFile = Webos.require._currentFile;
					Webos.require._stacks[file.get('path')] = [];
					Webos.require._currentFile = file.get('path');

					try {
						var fn = new Function(contents);
						fn();
					} catch(error) {
						W.Error.catchError(error);
					}

					Webos.require._currentFile = previousFile;

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
				} else if (file.get('extension') == 'css') {
					Webos.Stylesheet.insertCss(contents, options.styleContainer);
					onLoadFn(file);
				} else {
					callback.error(Webos.Callback.Result.error('Unknown file type : "'+file.get('extension')+'" (file path: "'+file.get('path')+'")'));
				}
			}, callback.error]);
		})(list[i]);
	}

	if (Webos.require._currentFile) {
		Webos.require._stacks[Webos.require._currentFile].push(loadOperation);
	}
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
 * Evaluate Javascript scripts.
 * @param  {Array|String}   scripts    Script(s).
 * @param  {Webos.Callback} callback   The callback.
 * @param  {Object}         [options]  Options.
 * @static
 */
Webos.eval = function Weval(scripts, callback, options) {
	callback = Webos.Callback.toCallback(callback);
	options = $.extend({
		styleContainer: null
	}, options);

	if (!scripts) { //No file to load
		callback.success();
		return;
	}

	var list = [];
	if (scripts instanceof Array) {
		if (files.length == 0) {
			callback.success();
			return;
		}
		list = scripts;
	} else {
		list = [String(scripts)];
	}

	var loadedFiles = 0;
	var onLoadFn = function() {
		loadedFiles++;
		if (loadedFiles == list.length) {
			callback.success();
		}
	};

	for (var i = 0; i < list.length; i++) {
		(function(contents) {
			var id = new Date().getTime();

			var previousFile = Webos.require._currentFile;
			Webos.require._stacks[id] = [];
			Webos.require._currentFile = id;

			var fn = new Function(contents);
			try {
				fn();
			} catch(error) {
				W.Error.catchError(error);
			}

			Webos.require._currentFile = previousFile;

			var stack = Webos.require._stacks[id];
			var group = Webos.Observable.group(stack);
			if (group.observables().length > 0) {
				group.one('success', function() {
					onLoadFn();
				});
				group.oneEach('error', function() {
					callback.error();
				});
			} else {
				onLoadFn();
			}

			if (Webos.require._currentFile) {
				Webos.require._stacks[Webos.require._currentFile].push(call);
			}
		})(list[i]);
	}
};

/**
 * Arguments to be provided to a script.
 * @param {Object} args The arguments' structure.
 * @constructor
 * @deprecated  The use of this class is deprecated.
 * @todo Simplify argument's management.
 */
Webos.Arguments = function WArguments(args) {
	this.args = $.extend({}, args);
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
 * @param   {String} cmd The command.
 * @returns {Webos.Arguments} The parsed arguments.
 * @static
 * @deprecated  The use of Webos.Arguments is deprecated.
 */
Webos.Arguments.parse = function(cmd) {
	var cmdArray = cmd.split(' ');
	cmdArray.shift(); //On enleve le premier element : c'est la commande
	var argsStr = cmdArray.join(' ');
	
	var args = {
		options: {},
		params: []
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
				if (cache.strStarted == false) { //Si c'est le premier
					cache.strStarted = true; //On le sauvegarde
				} else { //Sinon, fin de chaine
					cache.strStarted = false;
				}
			}
		} else if (char == ' ' && cache.strStarted != true) { //Si c'est un espace et qu'on n'est pas dans une chaine
			if (cache.strType == 'options') { //Si c'est une option
				args.options[cache.strIndex] = cache.strContent; //On sauvegarde
			} else { //Sinon, c'est un argument
				args.params.push(cache.strIndex); //On sauvegarde
			}
			cache = $.extend({}, cacheBase);; //On remet le cache a zero
		} else if (char == '-') { //Si c'est un tiret
			if (cache.previous == '-') { //Si le caractere precedant etait aussi un tiret, c'est une option type --fruit=abricot
				cache.strOptionType = 'long'; //Type de l'option
			} else if (cache.previous == ' ' || cache.previous == '') { //Si c'etait un espace blanc, c'est une option type -aBv
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
						args.options[char] = ''; //On ajoute l'option
						//On definit les parametres au cas ou il y a une autre option apres
						cache = cacheBase; //On reinitialise le cache
						cache.strType = 'options'; //C'est une option
						cache.strOptionType = 'short'; //C'est une option type -aBv
						cache.strStage = 'index'; //On remplit l'index
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
			args.options[cache.strIndex] = cache.strContent;
		} else {
			args.params.push(cache.strIndex);
		}
	}

	return new Webos.Arguments(args);
};
