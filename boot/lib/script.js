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

	if (js) {
		js = 'try { '+js+' \n} catch(error) { W.Error.catchError(error); }';
	}

	//On execute le tout
	Webos.Script.run(js, {
		sourceUrl: url,
		arguments: {
			args: args || new Webos.Arguments()
		}
	});
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

	// Disabled: not good for debugging
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
	var onLoadFn = function(fileData, file, arg) {
		if (typeof fileData.afterProcess == 'function') {
			fileData.afterProcess(arg);
		}

		if (file && !Webos.require._cache[fileData.path]) { //Not cached
			Webos.require._cache[fileData.path] = file;
		}

		loadedFiles++;

		if (file) {
			console.log('  Loaded: '+file.get('path'));
		}

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
		 *  * `afterProcess`: a callback executed after the code execution. If it's a CSS file, the inserted tag is passed as argument.
		 *  * `type`: the file's MIME type, required if path is not provided
		 *
		 * CSS options:
		 *  * `styleContainer`: the CSS style container, on which teh rules will be applied
		 * 
		 * Javascript options:
		 *  * `context`: the context in which the script will be executed
		 *  * `arguments`: some arguments to provide to the script
		 *  * `exportApis`: APIs names to export to global scope
		 *  * `optionnal`: do not wait for the file to be fully loaded before continuing
		 *  * `forceExec`: force the script execution, even if it has been already executed
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
			afterProcess: null,
			optionnal: false,
			forceExec: false,
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
		} else if (requiredFile.path) {
			var path = requiredFile.path;

			//Check if the file is in the cache
			if (Webos.require._cache[path]) {
				file = Webos.require._cache[path];
				console.log('  Loading from cache: '+path);
			} else {
				file = W.File.get(path, { is_dir: false });
				console.log('Loading from network: '+path);
			}
		} else {
			onLoadFn(requiredFile);
			return;
		}

		var checkCache = function () {
			if (requiredFile.path && typeof requiredFile.process != 'function') {
				if (Webos.require._cache[requiredFile.path]) { //Cached
					if (!requiredFile.forceExec && file.matchesMimeType('text/javascript')) {
						console.info('Not re-executing script: '+requiredFile.path);
						onLoadFn(requiredFile, file);
						return true;
					} else if (requiredFile.forceExec) {
						console.warn('Re-executing script: '+requiredFile.path);
					}
				}
			}
		};

		if (checkCache()) {
			return;
		}

		var processFile = function (contents) {
			if (requiredFile.process === false) {
				onLoadFn(requiredFile, file);
				return;
			}
			if (typeof requiredFile.process == 'function') {
				var result = requiredFile.process(contents, requiredFile);
				if (result === true) {
					requiredFile.process = true;
					processFile(contents);
				}
				onLoadFn(requiredFile, file);
				return;
			}

			if (checkCache()) {
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
					onLoadFn(requiredFile, file);
				} else {
					var stack = Webos.require._stacks[file.get('path')];
					var group = Webos.Operation.group(stack);
					if (group.observables().length > 0 && !group.completed()) {
						group.one('success', function() {
							onLoadFn(requiredFile, file);
						});
						group.oneEach('error', function() {
							callback.error();
						});
					} else {
						onLoadFn(requiredFile, file);
					}
				}
			} else if (file.get('extension') == 'css' || file.matchesMimeType('text/css')) {
				var stylesheet = Webos.Stylesheet.insertCss(contents, requiredFile.styleContainer);
				onLoadFn(requiredFile, file, stylesheet);
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
	this._args = args || [];

	this._schema = {};
};
Webos.Arguments.prototype = {
	all: function () {
		return this._args;
	},
	getOptions: function () {
		var args = this._args, opts = {};

		for (var i = 0; i < args.length; i++) {
			var arg = args[i];

			if (typeof arg === 'string' && arg[0] === '-') { // Option
				if (arg[1] === '-') { // --abc=def
					var items = arg.substr(2).split('=');
					opts[items[0]] = items[1] || '';
				} else { // -larth
					arg = arg.substr(1);

					for (var j = 0; j < arg.length; j++) {
						opts[arg[j]] = '';
					}

					var nextArg = args[i + 1];
					if (arg.length === 1 && (typeof nextArg !== 'string' || nextArg[0] !== '-')) { // -p password
						opts[arg] = nextArg;
						i++;
					}
				}
			}
		}

		return opts;
	},
	getOption: function (opt) {
		var opts = this.getOptions();

		return opts[opt];
	},
	isOption: function (opt) {
		return (typeof this.getOption(opt) !== 'undefined');
	},
	getParams: function () {
		var args = this._args, params = [];

		for (var i = 0; i < args.length; i++) {
			if (typeof args[i] !== 'string') {
				if (args[i][0] !== '-') {
					params.push(args[i]);
				} else {
					if (args[i][1] !== '-' && args[i].length === 2) { // -p password
						i++;
					}
				}
			} else {
				params.push(args[i]);
			}
		}

		return params;
	},
	countNbrParams: function () {
		return this.getParams().length;
	},
	getParam: function (paramIndex) {
		var params = this.getParams();

		return params[paramIndex];
	},
	isParam: function (paramIndex) {
		return (typeof this.getParam(paramIndex) !== 'undefined');
	}
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
	if (fullCmd instanceof Array) {
		return new Webos.Arguments(fullCmd);
	}

	var parsedCmd = Webos.Terminal.parseCmd(fullCmd)[0];
	return new Webos.Arguments(parsedCmd.args);
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
