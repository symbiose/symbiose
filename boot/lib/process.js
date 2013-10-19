/**
 * A process (an instance of a computer program that is being executed).
 * @param {Object} options The process' options.
 * @constructor
 * @augments {Webos.Observable}
 * @since  1.0alpha1
 */
Webos.Process = function WProcess(options) {
	this.pid = options.pid;
	//var key = options.key;
	this.authorizations = options.authorizations;
	if (options.args) {
		this.args = options.args;
	}

	this._state = 0; // 0 -> ready; 1 -> running; 2 -> idle; 3 -> killed.
	this.main = new Function('args', options.fn);

	if (typeof this.pid != 'undefined') {
		Webos.Process.list[this.pid] = this;
	}

	Webos.Observable.call(this);
};
Webos.Process.prototype = {
	/**
	 * The code of the process.
	 */
	main: function () {},
	/**
	 * Get this process' ID.
	 * @returns {Number} The PID.
	 */
	getPid: function () {
		return this.pid;
	},
	/**
	 * Get this process' authorizations.
	 * @returns {Webos.Authorizations} The authorizations.
	 */
	getAuthorizations: function () {
		return this.authorizations;
	},
	/**
	 * Get this process' arguments.
	 * @return {Webos.Arguments} This process' arguments.
	 */
	getArguments: function () {
		return this.args;
	},
	/**
	 * Start this process.
	 */
	run: function () {
		if (this.state() != 'ready') {
			return;
		}

		var args = this.args;
		if (typeof args == 'undefined') {
			args = new Webos.Arguments();
		}
		this.args = args;

		this._state = 1;
		this._startTime = (new Date()).getTime();
		Webos.Process.stack.push(this);

		this.notify('start');
		Webos.Process.notify('start', {
			process: this
		});

		try {
			this.main(args);
		} catch(error) {
			Webos.Error.catchError(error);
		}

		Webos.Process.stack.pop();
		this.args = undefined;

		if (this.state() != 'killed') {
			this._state = 2;

			this.notify('idle');
			Webos.Process.notify('idle', {
				process: this
			});
		}
	},
	/**
	 * Stop this process.
	 */
	stop: function () {
		if (this.state() != 'running' && this.state() != 'idle') {
			return;
		}

		this._state = 3;

		this.notify('stop');
		Webos.Process.notify('stop', {
			process: this
		});

		delete Webos.Process.list[this.getPid()];
		delete this;
	},
	/**
	 * Get this process' state.
	 * @returns {String} This process' state (e.g. "ready", "running", "idle", "killed").
	 */
	state: function () {
		var states = ['ready', 'running', 'idle', 'killed'];

		return states[this._state];
	},
	/**
	 * Get this process' start time.
	 * @return {Number} The start time.
	 */
	startTime: function() {
		return this._startTime;
	},
	/**
	 * Check if this process is currently running.
	 * @returns {Boolean} True if this process is running, false otherwise.
	 */
	isRunning: function () {
		return (this._state == 1 || this._state == 2);
	},
	toString: function () {
		return '[WProcess #'+this.pid+']';
	}
};
Webos.inherit(Webos.Process, Webos.Observable);

/**
 * A list of all processes.
 * @type {Object}
 * @private
 */
Webos.Process.list = {};

/**
 * The current processes' stack.
 * @type {Array}
 * @private
 */
Webos.Process.stack = [];

/**
 * Get a process.
 * @param   {Number} pid The process' ID.
 * @returns {Webos.Process} The process.
 */
Webos.Process.get = function (pid) {
	return Webos.Process.list[pid];
};

/**
 * Get the current process.
 * @returns {Webos.Process} The current process.
 */
Webos.Process.current = function () {
	return Webos.Process.stack[Webos.Process.stack.length - 1];
};

/**
 * Get a list of all processes.
 * @returns {Webos.Process[]} A list of all processes.
 */
Webos.Process.listAll = function () {
	var list = [];

	for (var i in Webos.Process.list) {
		list.push(Webos.Process.list[i]);
	}

	return list;
};

Webos.Observable.build(Webos.Process);


/**
 * A set of authorizations.
 * @param {Array} [authorizations] The list of authorizations.
 */
Webos.Authorizations = function WAuthorizations(authorizations) {
	this.authorizations = authorizations || [];
};
Webos.Authorizations.prototype = {
	/**
	 * Check if an authorization is in this set.
	 * @param   {String} auth The authorization's name.
	 * @returns {Boolean}     True if the authorization is in this set, false otherwise.
	 */
	can: function $_WAuthorizations_can(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				return true;
			}
		}
		return false;
	},
	/**
	 * Get a list of all authorizations in this set.
	 * @returns {Array} The list of authorizations.
	 */
	get: function $_WAuthorizations_get() {
		return this.authorizations;
	},
	/**
	 * Set authorizations in this set.
	 * @param {Array} auth The list of new authorizations.
	 */
	set: function $_WAuthorizations_set(auth) {
		if (auth != this.authorizations) {
			this.authorizations = auth;
		}
	},
	/**
	 * Add an authorization in this set.
	 * @param {String} auth The authorization.
	 */
	add: function $_WAuthorizations_add(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				return;
			}
		}
		
		this.authorizations.push(auth);
	},
	/**
	 * Remove an authorization from this list.
	 * @param  {String} auth The authorization.
	 */
	remove: function $_WAuthorizations_remove(auth) {
		for (var i = 0; i < this.authorizations.length; i++) {
			if (this.authorizations[i] == auth) {
				delete this.authorizations[i];
			}
		}
	},
	/**
	 * Get/set this set's model.
	 * @param   {String} [value] The new authorizations model for this set.
	 * @returns {String|Boolean} The current set's model or false if there was an error.
	 */
	model: function $_WAuthorizations_model(value) {
		var compareArraysFn = function(a, b) {
			if (a.length != b.length) {
				return false;
			}
			
			for (var i = 0; i < a.length; i++) {
				if (a[i] != b[i]) {
					var found = false;
					for (var j = 0; j < b.length; j++) {
						if (a[i] == b[j]) {
							found = true;
						}
					}
					if (!found) {
						return false;
					}
				}
			}
			return true;
		};
		
		if (typeof value == 'undefined') { //GETTER
			for (var index in Webos.Authorizations.models) {
				if (compareArraysFn(Webos.Authorizations.models[index], this.authorizations)) {
					return index;
				}
			}
			return 'select';
		} else { //SETTER
			if (typeof Webos.Authorizations.models[value] == 'undefined') {
				return false;
			}
			
			if (compareArraysFn(Webos.Authorizations.models[value], this.authorizations)) {
				return true;
			}
			
			this.authorizations = Webos.Authorizations.models[value];

			return true;
		}
	}
};

/**
 * A list of all authorizations.
 * @type {Array}
 * @private
 */
Webos.Authorizations.all = [
	'file.user.read',
	'file.user.write',
	'file.home.read',
	'file.home.write',
	'file.system.read',
	'file.system.write',
	'user.read',
	'user.edit',
	'user.self.edit',
	'user.manage',
	'package.read',
	'package.manage'
];

/**
 * The authorization's models.
 * @type {Object}
 * @private
 */
Webos.Authorizations.models = {
	'user': ['file.user.read',
             'file.user.write',
             'user.self.edit',
             'package.read'],
    'admin': Webos.Authorizations.all,
    'guest': ['file.user.read']
};
