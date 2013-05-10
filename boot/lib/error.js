/**
 * An error.
 * @param {String} message The error message.
 * @param {String} [details] The error details.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.Error = function WError(message, details) {
	this.name = 'Webos.Error';
	this.stack = Webos.Error.getStackTrace();
	this.process = Webos.Process.current();
	
	var trim = function(str) {
		return str.replace(/^\s+/g,'').replace(/\s+$/g,'');
	};
	
	this.message = (typeof message != 'undefined' && message !== null && typeof message.toString == 'function') ? trim(message.toString()) : '';
	if (this.message === '') {
		this.message = 'An error occured while running program.';
	}
	this.details = (typeof details != 'undefined' && details !== null && typeof details.toString == 'function') ? trim(details.toString()) : '';

	this.html = {
		message: this.message.replace("\n",'<br />'),
		details: this.details.replace("\n",'<br />'),
		process: (this.process) ? 'Process : '+this.process.getPid()+'; command : "'+this.process.cmdText+'"' : '',
		text: (this.message + ((this.details != '') ? ("\n"+this.details) : '')).replace("\n",'<br />')
	};

	this.message = $('<span></span>').html(this.message).text(); //On enleve les tags HTML
	this.text = this.message + ((this.details != '') ? ("\n"+this.details) : '');
	this.processText = (this.process) ? 'Process : '+this.process.getPid()+'; command : "'+this.process.cmdText+'"' : '';

	this.toString = function() {
		return this.name+': '+this.html.text+'<br />'+this.html.process+'<br />'+this.stack.join('<br />');
	};
};
Webos.inherit(Webos.Error, Error);

/**
 * A list of all errors.
 * @type {Array}
 * @static
 * @private
 */
Webos.Error.list = [];

/**
 * The callback triggered when an error occurs.
 * @type {Function}
 */
Webos.Error.callback = function() {};

/**
 * Log an error.
 * @param {Error|Webos.Error} error The error.
 */
Webos.Error.logError = function(error) {
	if (!error.process) {
		error.process = Webos.Process.current();
	}

	Webos.Error.list.push(error);
	
	if (typeof console != 'undefined') {
		var consoleMsg;
		if (error instanceof W.Error) {
			consoleMsg = error.name+': '+error.text+"\n"+error.stack.join("\n");
		} else {
			consoleMsg = error.name + ' : ' + error.message + "\nStack trace :\n" + error.stack;
		}
		
		if (typeof console != 'undefined') {
			if (typeof console.warn != 'undefined') {
				console.warn(consoleMsg);
			} else {
				console.log(consoleMsg);
			}
		}
	}
	
	return error;
};

/**
 * Catch an error.
 * This method logs the error and triggers the error callback.
 * @param {Error|Webos.Error} error The error.
 */
Webos.Error.catchError = function(error) {
	if (!error.process) {
		error.process = Webos.Process.current();
	}

	Webos.Error.logError(error);

	if (typeof Webos.Error.callback == 'function') {
		Webos.Error.callback(error);
	}
};

/**
 * Build an error.
 * @param {String} message The error message.
 * @param {String} [details] The error details.
 * @returns {Webos.Error} The error.
 */
Webos.Error.build = function(message, details) {
	if (!message) {
		return;
	}

	if (message instanceof Webos.Error) {
		return message;
	}

	return new Webos.Error(message, details);
};

/**
 * Build and trigger an error.
 * @param {String} message The error message.
 * @param {String} [details] The error details.
 */
Webos.Error.trigger = function(message, details) {
	Webos.Error.catchError(Webos.Error.build(message, details));
};

/**
 * Build and log an error.
 * @param {String} message The error message.
 * @param {String} [details] The error details.
 */
Webos.Error.log = function(message, details) {
	Webos.Error.logError(Webos.Error.build(message, details));
};

/**
 * Get the current stack trace.
 * @returns {Array} The stack trace.
 */
Webos.Error.getStackTrace = function() {
	var callstack = [];
	var isCallstackPopulated = false;
	try {
		i.dont.exist += 0; // doesn't exist - that's the point
	} catch(e) {
		if (e.stack) { // Firefox or Chrome
			var lines = e.stack.split('\n');
			for (var i=0, len=lines.length; i < len; i++) {
				if (lines[i].match(/^\s*[A-Za-z0-9\-_\$.\s]+\(?/)) {
					callstack.push(lines[i]);
				}
			}
			// Remove call to getStackTrace()
			callstack.shift();
			if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) { //Chrome
				callstack.shift();
			}
			isCallstackPopulated = true;
		}
		else if (window.opera && e.message) { // Opera
			var lines = e.message.split('\n');
			for (var i=0, len=lines.length; i < len; i++) {
				if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
					var entry = lines[i];
					// Append next line also since it has the file info
					if (lines[i+1]) {
						entry += ' at ' + lines[i+1];
						i++;
					}
					callstack.push(entry);
				}
			}
			// Remove call to getStackTrace()
			callstack.shift();
			isCallstackPopulated = true;
		}
	}
	if (!isCallstackPopulated) { // IE and Safari
		var currentFunction = arguments.callee.caller;
		while (currentFunction) {
			var fn = currentFunction.toString();
			var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf('')) || 'anonymous';
			callstack.push(fname);
			currentFunction = currentFunction.caller;
		}
	}
	return callstack;
};

/**
 * Set the error callback.
 * @param {Function} The callback.
 */
Webos.Error.setErrorHandler = function(handler) {
	if (typeof handler != 'function') {
		return false;
	}
	Webos.Error.callback = handler;
};
