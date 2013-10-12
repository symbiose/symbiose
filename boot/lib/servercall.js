(function() {
	/**
	 * A server call.
	 * @augments {Webos.Operation}
	 * @since  1.0alpha1
	 */
	Webos.ServerCall = function WServerCall() {
		Webos.Operation.call(this);

		this._initialize.apply(this, arguments);
	};
	Webos.ServerCall.prototype = {
		/**
		 * This server call's id.
		 * @type {Number}
		 * @private
		 */
		_id: null,
		/**
		 * Options for this server call.
		 * @type {Object}
		 * @private
		 */
		_options: {},
		/**
		 * This server call's request URL.
		 * @type {String}
		 * @private
		 */
		_url: 'sbin/apicall.php',
		/**
		 * This server call's request data.
		 * @type {Object}
		 * @private
		 */
		_data: {},
		/**
		 * This server call's request type.
		 * @type {String}
		 * @private
		 */
		_type: 'post',
		/**
		 * This server call's status. 0 means not sent, 1 means pending and 2 means completed.
		 * @type {Number}
		 * @private
		 */
		_status: 0,
		/**
		 * The number of attempts to execute this server call, in case of HTTP error.
		 * @type {Number}
		 * @private
		 */
		_nbrAttempts: 0,
		/**
		 * Initialize this server call.
		 * @param {Object} options An object containing options.
		 * @param {String} options.class The class' name.
		 * @param {String} options.method The method's name.
		 * @param {Object} [options.arguments] Arguments to provide to the method.
		 * @param {String} [options.user] The username with which the method will be called.
		 * @param {String} [options.password] The password corresponding to the username.
		 * @param {Number} [options.pid] The process' ID with which the method will be called.
		 * @param {String} [options.key] The process' key.
		 * @constructor
		 * @private
		 */
		_initialize: function $_WServerCall__initialize(opts) {
			//Default options
			var defaults = {
				'class': '',
				method: '',
				arguments: {},
				user: '',
				password: '',
				pid: '',
				key: ''
			};

			var options = $.extend({}, defaults, opts);
			this._options = options;

			var module = options['class'].replace(/Controller$/, '');
			module = module.charAt(0).toLowerCase() + module.substr(1);

			this._data = {
				module: module,
				action: options.method,
				arguments: JSON.stringify(options.arguments, function(key, value) { //Convert all arguments to strings/numbers
					if (typeof value === 'number' && !isFinite(value)) {
						return String(value);
					}
					return value;
				}),
				user: options.user,
				password: options.password,
				pid: options.pid,
				key: options.key
			};

			this._status = 0;
			this._nbrAttempts = 0;

			this._id = Webos.ServerCall.addCallToList(this);
		},
		/**
		 * Load this server call.
		 * @private
		 */
		_load: function $_WServerCall__load() {
			//Lien vers l'objet courant
			var that = this;
			
			$.ajax({
				url: that._url,
				data: that._data,
				type: that._type,
				async: (that._options.async === false) ? false : true,
				context: that,
				dataType: 'text',
				success: function(json, textStatus, jqXHR) { //En cas de succes
					try {
						if (!json) {
							throw new Webos.Error('Empty response');
						}

						var data = jQuery.parseJSON(json); //On essaie de recuperer les donnees JSON
					} catch (jsonError) { //Si une erreur survient
						var error = 'Malformed JSON data ('+jsonError.name+'): '+jsonError.message+'. Data :'+"\n"+json;
						error += "\n"+that.stack();
						
						var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
							'success': false,
							'channels': {
								1: null,
								2: error //On ajoute le message d'erreur
							},
							'js': null,
							'out': error
						});
						
						that.setCompleted(response);
						return; //On stoppe l'execution de la fonction
					}
					
					var response = new W.ServerCall.Response(data); //On cree la reponse
					
					that.setCompleted(response);
				},
				error: function(jqXHR, textStatus, errorThrown) { //Une erreur est survenue
					if (that._nbrAttempts < Webos.ServerCall.options.maxAttempts) {
						setTimeout(function() {
							that.load();
						}, Webos.ServerCall.options.errorDelay);
						return;
					}
					
					var error = 'An error occurred while loading a server call';
					if (textStatus) {
						error += ' (status : '+textStatus;
						if (errorThrown) {
							error += ', '+errorThrown;
						}
						error += ')';
					}
					error += "\n"+that.stack();
					
					var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
						'success': false,
						'channels': {
							1: null,
							2: error //On ajoute le message d'erreur
						},
						'js': null,
						'out': error
					});
					
					that.setCompleted(response);
				}
			});
		},
		id: function () {
			return this._id;
		},
		failed: function () {
			return (this._result && !this._result.isSuccess());
		},
		setStarted: function () {
			this._super('setStarted');

			this._status = 1;

			this._nbrAttempts++;

			if (this._nbrAttempts == 1) {
				this._startTime = new Date();

				Webos.ServerCall.callStart(this);
			}
		},
		setCompleted: function (response) {
			this._super('setCompleted', response);

			this._status = 2;
			this._completeTime = new Date();

			Webos.ServerCall.callComplete(this);
		},
		/**
		 * Load this server call.
		 * @param  {Webos.Callback} callback The callback.
		 */
		load: function $_WServerCall_load(callback) {
			var that = this;

			if (callback) {
				this.addCallbacks(callback);
			}

			this.setStarted();

			for (var i = 0; i < Webos.ServerCall.list.length; i++) {
				var call = Webos.ServerCall.list[i];
				
				if (call._status == 1 && call.id() != this.id()) {
					var isEqual = true;
					for (var attr in call._data) {
						if (call._data[attr] != this._data[attr]) {
							isEqual = false;
							break;
						}
					}
					
					if (isEqual) {
						call.on('complete', function() {
							that.setCompleted(call._result);
						});
						return;
					}
				}
			}

			if (this._options.async === false) {
				Webos.ServerCall._removeFromLoadStack(this);
				that._load();
			} else {
				Webos.ServerCall._addToLoadStack(this);
			}

			return this;
		},
		/**
		 * Get this server call's stack trace.
		 * @returns {String} The stack.
		 */
		stack: function $_WServerCall_stack() {
			var stack = '    at '+this._url+' calling action "'+this._data.action+'" in module "'+this._data.module+'"';
			if (this._data.arguments && this._data.arguments != '{}') {
				stack += "\n"+'    with arguments '+JSON.stringify(this._data.arguments);
			} else {
				stack += "\n"+'    without arguments';
			}
			if (this._data.user) {
				stack += "\n"+'    as '+this._data.user;
			}
			if (this._data.pid) {
				stack += "\n"+'    in process #'+this._data.pid;
			}
			return stack;
		}
	};
	Webos.inherit(Webos.ServerCall, Webos.Operation);

	/**
	 * Global options for server calls.
	 * @type {Object}
	 * @static
	 * @private
	 */
	Webos.ServerCall.options = {
		maxAttempts: 3,
		errorDelay: 1000
	};

	/**
	 * A list of all server calls.
	 * @type {Array}
	 * @static
	 * @private
	 */
	Webos.ServerCall.list = []; //Liste des appels au serveur

	/**
	 * A list of server calls waiting to be loaded.
	 * @type {Array}
	 * @static
	 * @private
	 */
	Webos.ServerCall._loadStack = [];

	/**
	 * Add a server call to the list.
	 * @param {Webos.ServerCall} call The server call.
	 * @returns {Number} The server call's ID.
	 * @static
	 * @private
	 */
	Webos.ServerCall.addCallToList = function $_WServerCall_addCallToList(call) {
		var id = Webos.ServerCall.list.push(call) - 1;
		Webos.ServerCall.notify('callregister', { call: call });
		return id;
	};

	/**
	 * Notify that a server call started loading.
	 * @param {Webos.ServerCall} call The server call.
	 * @static
	 * @private
	 */
	Webos.ServerCall.callStart = function $_WServerCall_callStart(call) {
		if (Webos.ServerCall.getNbrPendingCalls() == 1) {
			Webos.ServerCall.notify('start', { list: Webos.ServerCall.list });
		}
		Webos.ServerCall.notify('callstart', { call: call });
	};

	/**
	 * Notify that a server call is completed.
	 * @param {Webos.ServerCall} call The server call.
	 * @static
	 * @private
	 */
	Webos.ServerCall.callComplete = function $_WServerCall_callComplete(call) {
		if (Webos.ServerCall.getNbrPendingCalls() == 0) {
			Webos.ServerCall.notify('complete', { list: Webos.ServerCall.list });
		}
		Webos.ServerCall.notify('callcomplete', { call: call });
	};

	/**
	 * Add a server call to the load stack.
	 * @param {Webos.ServerCall} call The server call.
	 * @static
	 * @private
	 */
	Webos.ServerCall._addToLoadStack = function $_WServerCall__addToLoadStack(call) {
		Webos.ServerCall._loadStack.push(call);

		if (Webos.ServerCall._loadStack.length == 1) {
			setTimeout(function() {
				if (Webos.ServerCall._loadStack.length == 1) {
					var call = Webos.ServerCall._loadStack[0];
					call._load();
				} else {
					var calls = [];
					for (var i = 0; i < Webos.ServerCall._loadStack.length; i++) {
						var call = Webos.ServerCall._loadStack[i];
						calls.push(call);
					}
					var group = Webos.ServerCall.join(calls);
					group.load();
				}

				Webos.ServerCall._loadStack = [];
			}, 0);
		}
	};

	/**
	 * Remove a server call from the load stack.
	 * @param {Webos.ServerCall} call The server call.
	 * @static
	 * @private
	 */
	Webos.ServerCall._removeFromLoadStack = function $_WServerCall__removeFromLoadStack(callToRemove) {
		var stack = [];
		for (var i = 0; i < Webos.ServerCall._loadStack.length; i++) {
			var call = Webos.ServerCall._loadStack[i];
			if (callToRemove.id() != call.id()) {
				stack.push(call);
			}
		}
		Webos.ServerCall._loadStack = stack;
	};

	/**
	 * Get a list of all server calls.
	 * @param   {Number} [status]    Filter calls with a specific status.
	 * @returns {Webos.ServerCall[]} A list of server calls.
	 * @static
	 */
	Webos.ServerCall.getList = function $_WServerCall_getList(status) {
		var list = [];
		for (var i = 0; i < Webos.ServerCall.list.length; i++) {
			if (typeof status == 'undefined' || Webos.ServerCall.list[i]._status == status) {
				list.push(Webos.ServerCall.list[i]);
			}
		}
		return list;
	};

	/**
	 * Get a list of pending calls.
	 * @returns {Webos.ServerCall[]} A list of server calls.
	 * @static
	 */
	Webos.ServerCall.getPendingCalls = function $_WServerCall_getPendingCalls() {
		return Webos.ServerCall.getList(1);
	};

	/**
	 * Get the number of completed calls.
	 * @returns {Number} The number of completed calls.
	 * @static
	 */
	Webos.ServerCall.getCompletedCalls = function $_WServerCall_getCompletedCalls() {
		return Webos.ServerCall.getList(2);
	};

	/**
	 * Get the number of pending calls.
	 * @returns {Number} The number of pending calls.
	 * @static
	 */
	Webos.ServerCall.getNbrPendingCalls = function $_WServerCall_getNbrPendingCalls() {
		return Webos.ServerCall.getPendingCalls().length;
	};

	/**
	 * Join some server calls in a group.
	 * Server calls must be passed as arguments.
	 * @returns {Webos.ServerCall.Group} The group.
	 * @static
	 */
	Webos.ServerCall.join = function $_WServerCall_join() {
		var requests = [];
		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (arg instanceof Array) {
				for (var j = 0; j < arg.length; j++) {
					requests.push(arg[j]);
				}
			} else if (Webos.isInstanceOf(arg, Webos.ServerCall)) {
				requests.push(arg);
			}
		}

		return new Webos.ServerCall.Group(requests);
	};

	Webos.Observable.build(Webos.ServerCall);

	/**
	 * A group of server calls.
	 * @augments {Webos.Operation}
	 * @since 1.0beta1
	 */
	Webos.ServerCall.Group = function WServerCallGroup() {
		Webos.Operation.call(this);

		this._initialize.apply(this, arguments);
	};
	Webos.ServerCall.Group.prototype = {
		/**
		 * This server calls group's options.
		 * @type {Object}
		 */
		_options: {},
		/**
		 * This server calls group's requests.
		 * @type {Array}
		 */
		_requests: [],
		/**
		 * This server calls group's request URL.
		 * @type {String}
		 */
		_url: 'sbin/apicallgroup.php',
		/**
		 * This server calls group's request type.
		 * @type {String}
		 */
		_type: 'post',
		/**
		 * This server calls group's status.
		 * @type {Number}
		 */
		_status: 0,
		/**
		 * The number of attempts to execute this server calls group, in case of HTTP error.
		 * @type {Number}
		 */
		_nbrAttempts: 0,
		/**
		 * Initialize this server calls group.
		 * @param {Webos.ServerCall[]} requests Server calls in the group.
		 * @param {Object}             opts     Options.
		 * @constructor
		 * @private
		 */
		_initialize: function (requests, opts) {
			var defaults = {};

			this._options = $.extend({}, defaults, opts); //On definit toutes les options
			this._requests = [];
			this._status = 0;
			this._nbrAttempts = 0;

			if (requests instanceof Array) {
				for (var i = 0; i < requests.length; i++) {
					this.add(requests[i]);
				}
			}
		},
		/**
		 * Add a server call to the group.
		 * @param {Webos.ServerCall}   request  The server call.
		 * @param {Webos.Callback}     callback The callback.
		 */
		add: function(request, callback) {
			if (callback) {
				request.addCallbacks(callback);
			}

			var id = this._requests.push(request) - 1;

			return id;
		},
		/**
		 * Load all server calls in the group.
		 * @private
		 */
		_load: function() {
			var that = this;

			this._data = [];
			for (var i = 0; i < this._requests.length; i++) {
				if (!this._requests[i].started()) {
					this._requests[i].setStarted();
				}
				this._data[i] = this._requests[i]._data;

				if (typeof this._data[i].arguments == 'string') {
					this._data[i].arguments = JSON.parse(this._data[i].arguments);
				}
			}

			$.ajax({
				url: that._url,
				data: {
					requests: JSON.stringify(that._data)
				},
				type: that._type,
				async: (that._options.async == false) ? false : true,
				dataType: 'text',
				success: function(json, textStatus, jqXHR) { //En cas de succes
					try {
						if (!json) {
							throw new Webos.Error('Empty response');
						}

						var data = jQuery.parseJSON(json); //On essaie de recuperer les donnees JSON
					} catch (jsonError) { //Si une erreur survient
						var error = 'Malformed JSON data ('+jsonError.name+'): '+jsonError.message+'. Data :'+"\n"+json;

						for (var i = 0; i < that._requests.length; i++) {
							var errorAndStack = error + "\n" + that._requests[i].stack();
							var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
								'success': false,
								'channels': {
									1: null,
									2: errorAndStack //On ajoute le message d'erreur
								},
								'js': null,
								'out': errorAndStack
							});

							that._requests[i].setCompleted(response);
						}
						that.setCompleted(false);
						return; //On stoppe l'execution de la fonction
					}
					
					var i = 0;
					for (var index in data) {
						var response = new W.ServerCall.Response(data[index]); //On cree la reponse
						that._requests[i].setCompleted(response);

						i++;
					}
					that.setCompleted(data);
				},
				error: function(jqXHR, textStatus, errorThrown) { //Une erreur est survenue
					if (that._nbrAttempts < Webos.ServerCall.options.maxAttempts) {
						setTimeout(function() {
							that.load();
						}, Webos.ServerCall.options.errorDelay);
						return;
					}
					
					var error = 'An error occurred while loading a server call';
					if (textStatus) {
						error += ' (status : '+textStatus;
						if (errorThrown) {
							error += ', '+errorThrown;
						}
						error += ')';
					}

					for (var index in that._requests) {
						var errorAndStack = error + "\n" + that._requests[i].stack();
						var response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
							'success': false,
							'channels': {
								1: null,
								2: errorAndStack //On ajoute le message d'erreur
							},
							'js': null,
							'out': errorAndStack
						});

						that._requests[index].setCompleted(response);
					}
					that.setCompleted(false);
				}
			});
		},
		/**
		 * Load all server calls in the group.
		 * @param  {Webos.Callback[]|Webos.Callback} callback The callback.
		 */
		load: function(callback) {
			if (callback) {
				if (callback instanceof Array && callback.length == this._requests.length) {
					for (var i = 0; i < this._requests.length; i++) {
						this._requests[i].addCallbacks(this._callbacks[i]);
					}
				} else {
					callback = Webos.Callback.toCallback(callback);
					for (var i = 0; i < this._requests.length; i++) {
						this._requests[i].addCallbacks(callback);
					}
				}
			}

			this.setStarted();

			this._load(callback);

			return this;
		},
		failed: function () {
			return false;
		},
		setStarted: function () {
			this._super('setStarted');

			this._status = 1;

			this._nbrAttempts++;

			if (this._nbrAttempts == 1) {
				this._startTime = new Date();
			}
		},
		setCompleted: function (result) {
			this._super('setCompleted', result);

			this._status = 2;
			this._completeTime = new Date();
		}
	};
	Webos.inherit(Webos.ServerCall.Group, Webos.Operation);


	/**
	 * A server response.
	 * @param {Object} response The response data.
	 * @constructor
	 * @since  1.0alpha1
	 */
	Webos.ServerCall.Response = function WServerCallResponse(response) {
		if (!response || typeof response != 'object') {
			response = {
				success: false,
				channels: {
					1: (response || null)
				},
				out: (response || null),
				data: {}
			};
		}

		Webos.Callback.Result.call(this, response);
	};
	Webos.ServerCall.Response.prototype = {
		/**
		 * Get a channel's content.
		 * @param  {Number} channel The channel number.
		 * @returns {String}         The channel's content.
		 */
		getChannel: function(channel) {
			return this._data.channels[channel];
		},
		/**
		 * Get the standard channel's content.
		 * @returns {String} The channel's content.
		 */
		getStandardChannel: function() {
			return this.getChannel(1);
		},
		/**
		 * Get the errors' channel's content.
		 * @returns {String} The channel's content.
		 */
		getErrorsChannel: function() {
			return this.getChannel(2);
		},
		/**
		 * Get all channel's content.
		 * @returns {String} The channels' content.
		 */
		getAllChannels: function() {
			return this._data.out;
		},
		/**
		 * Get the response's error, if there is one.
		 * @param  {String} [msg] An error message can be provided.
		 * @returns {Webos.Error}  The error.
		 */
		getError: function(msg) {
			if (this.isSuccess()) {
				return;
			}
			msg = (!msg) ? ((!this.getErrorsChannel()) ? this.getAllChannels() : this.getErrorsChannel()) : msg;

			var details = null;
			if (msg != this.getAllChannels()) {
				details = this.getAllChannels();
			}

			return Webos.Error.build(msg, details);
		},
		toString: function() {
			return (this.getAllChannels() !== null) ? this.getAllChannels() : '';
		}
	};

	Webos.inherit(Webos.ServerCall.Response, Webos.Callback.Result);
})();