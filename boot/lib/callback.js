/**
 * Creates an instance of Webos.Callback, containing a callback function which will be called in case of success and onther one which will be called if an error happens.
 * @param {Function} successCallback The callback which will be called in case of success.
 * @param {Function} errorCallback The callback which will be called in case of error.
 * @since 1.0 alpha 1
 * @constructor
 */
Webos.Callback = function WCallback(successCallback, errorCallback) {
	var that = this;
	
	Webos.Observable.call(this);
	
	this.callbacks = { //Callbacks
		success: {
			callback: function() {}, //The function
			arguments: [],
			context: null //The context
		},
		error: {
			callback: function(error) {
				Webos.Error.trigger(error);
			}, //The function
			arguments: [],
			context: null //The context
		}
	};
	
	//Current process, if there is one
	this.process = (Webos.Process && Webos.Process.current()) ? Webos.Process.current() : null;
	
	//If a success callback is specified
	if (typeof successCallback === 'function') {
		this.callbacks.success.callback = successCallback;
	}
	
	//If an error callback is specified
	if (typeof errorCallback === 'function') {
		this.callbacks.error.callback = errorCallback;
	}

	/**
	 * Trigger a callback.
	 * @param {String} flag The callback's flag.
	 * @param {Array} args Arguments to pass to the callback.
	 * @returns The value returned by the callback.
	 */
	this.fire = function $_WCallback_fire(flag, args) {
		if (!that.callbacks[flag]) { //Check if the callback exists
			return false;
		}

		if (that.process) { //If a process has been saved
			Webos.Process.stack.push(that.process);
		}

		var result;
		try {
			//Run the callback
			result = that.callbacks[flag].callback.apply(that.callbacks[flag].context, args);
		} catch(e) {
			Webos.Error.catchError(e);
		} finally {
			if (that.process) {
				Webos.Process.stack.pop();
			}

			//Trigger the associated event
			that.notify('fire', {
				flag: flag,
				args: args,
				context: that.callbacks[flag].context
			});

			return result;
		}
	};
	
	/**
	 * Call the success callback.
	 * @returns The value retuirned by the callback.
	 */
	this.success = function $_WCallback_success() {
		//Put arguments in an array
		var args = Array.prototype.slice.call(arguments);
		args = args.concat(that.callbacks.success.arguments);
		
		return that.fire('success', args);
	};
	/**
	 * Call the error callback.
	 * @returns The value retuirned by the callback.
	 */
	this.error = function $_WCallback_error() {
		//Put arguments in an array
		var args = Array.prototype.slice.call(arguments);
		args = args.concat(that.callbacks.error.arguments);
		
		return that.fire('error', args);
	};
};
Webos.Callback.prototype = {
	/**
	 * Add a parameter to pass to a specified callback.
	 * @param value The parameter.
	 * @param {String} [flag="success"] The callback's flag.
	 */
	addParam: function $_WCallback_addParam(value, flag) {
		if (!flag) {
			flag = 'success';
		}
		this.callbacks[flag].arguments.push(value);
	},
	/**
	 * Add parameters to pass to a specified callback.
	 * @param {any[]} values An array containing parameters.
	 * @param {String} [flag="success"] The callback's flag.
	 */
	addParams: function $_WCallback_addParams(values, flag) {
		if (!flag) {
			flag = 'success';
		}
		this.callbacks[flag].arguments.concat(values);
	},
	/**
	 * Define the context in which a callback will be executed.
	 * @param context The context.
	 * @param {String} [flag="success"] The callback's flag.
	 */
	setContext: function $_WCallback_setContext(context, flag) {
		if (!flag) {
			flag = 'success';
		}
		this.callbacks[flag].context = context;
	},
	/**
	 * Get/set a callback.
	 * @param {String} [flag="success"] The callback's flag.
	 * @param {Function} [fn] If specified, this function will be defined as the callback.
	 */
	callback: function $_WCallback_callback(flag, fn) {
		if (!flag) {
			flag = 'success';
		}
		
		if (typeof fn == 'undefined') {
			if (this.callbacks[flag]) {
				return this.callbacks[flag].callback;
			}
		} else {
			if (typeof fn != 'function') {
				return false;
			}

			this.callbacks[flag].callback = fn;
		}
	}
};
Webos.inherit(Webos.Callback, Webos.Observable);

/**
 * Convert a variable to a Webos.Callback object.
 * @param arg The value which will be converted.
 * @param [replacement] Callback functions if some of the first argument are missing. If it is not a Webos.Callback object, it will be converted.
 * @returns {Webos.Callback} The callback.
 * @static
 */
Webos.Callback.toCallback = function $_WCallback_toCallback(arg, replacement) {
	if (arg instanceof Webos.Callback) {
		return arg;
	}
	
	if (arg instanceof Array) {
		if (typeof arg[0] == 'function' && typeof arg[1] == 'function') {
			return new Webos.Callback(arg[0], arg[1]);
		}
	}
	
	switch (typeof arg) {
		case 'function':
			return new Webos.Callback(arg, Webos.Callback.toCallback(replacement).error);
		case 'object':
			if (typeof arg.success == 'function' && typeof arg.error == 'function') {
				return new Webos.Callback(arg.success, arg.error);
			}
	}
	
	if (typeof replacement != 'undefined') {
		return Webos.Callback.toCallback(replacement);
	}
	
	return new Webos.Callback();
};

/**
 * A result to be passed to a callback.
 * @param {Object} [data] The result's data.
 * @constructor
 */
Webos.Callback.Result = function WCallbackResult(data) {
	data = $.extend({}, {
		success: true,
		out: null,
		data: {}
	}, data);
	
	this._data = data;
};
Webos.Callback.Result.prototype = {
	/**
	 * Check if the result is a success.
	 * @returns {Boolean} True if the result is a success, false otherwise.
	 */
	isSuccess: function () {
		return this._data.success;
	},
	/**
	 * Get this result's data.
	 * @returns {Object} This result's data.
	 */
	getData: function() {
		return this._data.data;
	},
	/**
	 * Get the error, if there is one.
	 * @param  {String} [msg] An error message can be provided.
	 * @returns {Webos.Error}  The error.
	 */
	getError: function (msg) {
		if (this.isSuccess()) {
			return;
		}
		msg = this._data.out;

		return Webos.Error.build(msg);
	},
	/**
	 * Trigger the error if the result is not a success.
	 */
	triggerError: function () {
		if (this.isSuccess()) {
			return;
		}
		
		Webos.Error.trigger(this._data.out);
	},
	/**
	 * Log the error, if there is one.
	 * @param  {String} [msg] An error message can be provided.
	 */
	logError: function(msg) {
		Webos.Error.log(this.getError(msg));
	},
	toString: function () {
		return this._data.out;
	}
};

/**
 * Build a result which is an error.
 * @param {String} msg The error message.
 * @returns {Webos.Callback.Result} The result.
 */
Webos.Callback.Result.error = function $_WCallbackResult_error(msg) {
	return new Webos.Callback.Result({
		success: false,
		out: msg
	});
};
