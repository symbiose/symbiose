(function() {
	/**
	 * An operation.
	 * @name {Webos.Operation}
	 * @augments {Webos.Observable}
	 * @constructor
	 * @since  1.0beta3
	 */
	var Operation = function WOperation() {
		Webos.Observable.call(this);
	};
	Operation.prototype = {
		/**
		 * True if this operation is started, false otherwise.
		 * @type {Boolean}
		 * @private
		 */
		_started: false,
		/**
		 * This operation's progress, in percentages.
		 * @type {Number}
		 * @private
		 */
		_progress: 0,
		/**
		 * True if this operations is completed, false otherwise.
		 * @type {Boolean}
		 * @private
		 */
		_completed: false,
		/**
		 * This operation's result.
		 * @private
		 */
		_result: null,
		/**
		 * Check if this operation is started.
		 * @returns {Boolean} True if this operation is started, false otherwise.
		 */
		started: function () {
			return this._started;
		},
		/**
		 * Get this operation's progress.
		 * @returns {Number} This operation's progress, in percentages.
		 */
		progress: function () {
			return this._progress;
		},
		/**
		 * Check if this operation is completed.
		 * @returns {Boolean} True if this operations is completed, false otherwise.
		 */
		completed: function () {
			return this._completed;
		},
		/**
		 * Check if this operation is failed.
		 * @returns {Boolean} True if this operations is failed, false otherwise.
		 */
		failed: function () {
			var result = this._result;

			if (result === false) {
				return true;
			}

			if (Webos.isInstanceOf(result, Webos.Callback.Result)) {
				return (!result.isSuccess());
			}

			if (Webos.isInstanceOf(result, Webos.Error)) {
				return true;
			}

			return false;
		},
		/**
		 * Mark this operation as started.
		 */
		setStarted: function () {
			this._started = true;
			this.trigger('start');
		},
		/**
		 * Set this operation's progress.
		 * @param {Number} value This operation's progress, in percentages.
		 */
		setProgress: function (value) {
			value = Number(value);

			if (isNaN(value)) {
				return false;
			}

			if (value < 0) {
				value = 0;
			}
			if (value > 100) {
				value = 100;
			}

			value = Math.round(value);

			if (this.progress() == value) {
				return;
			}

			this._progress = value;

			this.trigger('progress', { value: value });
		},
		/**
		 * Mark this operation as completed.
		 * @param result This operation's result.
		 */
		setCompleted: function (result) {
			this.setProgress(100);

			this._completed = true;
			this._result = result;

			this.trigger('complete', { result: result });

			var eventName = (this.failed()) ? 'error' : 'success';
			this.trigger(eventName, { result: result });
		},
		/**
		 * Add callbacks to this operation.
		 * @param {Webos.Callback} callbacks The callbacks,
		 */
		addCallbacks: function (callbacks) {
			callbacks = Webos.Callback.toCallback(callbacks);

			this.on('success', function(eventData) {
				callbacks.fire('success', [eventData.result]);
			});

			this.on('error', function(eventData) {
				callbacks.fire('error', [eventData.result]);
			});
		},
		/**
		 * Abort this operation.
		 */
		abort: function () {
			this.trigger('abort');
		},
		/**
		 * Pause this operation.
		 */
		pause: function () {
			this.trigger('pause');
		},
		/**
		 * Resume this operation.
		 */
		resume: function () {
			this.trigger('resume');
		}
	};

	Webos.inherit(Operation, Webos.Observable);


	/**
	 * A group of operations objects.
	 * @param {Array|Webos.Observable} operations Operation(s).
	 * @constructor
	 * @since  1.0beta3
	 */
	Operation.Group = function(operations) {
		Webos.Observable.Group.call(this, operations);
	};
	Operation.Group.prototype = {
		started: function () {
			var results = this._eachObservable('started');

			//If one operation has started
			for(var i = 0; i < results.length; i++) {
				if (results[i]) {
					return true;
				}
			}

			return false;
		},
		progress: function () {
			var results = this._eachObservable('progress'),
				globalProgress = 0,
				operationsNbr = results.length;

			for(var i = 0; i < results.length; i++) {
				globalProgress += results[i] / operationsNbr;
			}

			return globalProgress;
		},
		completed: function () {
			var results = this._eachObservable('completed');

			//If all operations has been completed
			for(var i = 0; i < results.length; i++) {
				if (!results[i]) {
					return false;
				}
			}

			return true;
		},
		failed: function () {
			var results = this._eachObservable('failed');

			//If one operation has failed
			for(var i = 0; i < results.length; i++) {
				if (results[i]) {
					return true;
				}
			}

			return false;
		},
		addCallbacks: function (callbacks) {
			callbacks = Webos.Callback.toCallback(callbacks);

			this.on('success', function(eventData) {
				callbacks.fire('success', [eventData.result]);
			});

			this.on('error', function(eventData) {
				callbacks.fire('error', [eventData.result]);
			});
		}
	};
	Webos.inherit(Operation.Group, Webos.Observable.Group);

	/**
	 * Put operations in a group.
	 * @param   {Array|Webos.Operation} observables Operation(s).
	 * @returns {Webos.Operation.Group}             The group.
	 * @static
	 */
	Operation.group = function (operations) {
		return new Webos.Operation.Group(operations);
	};


	Webos.Operation = Operation; //Export API
})();