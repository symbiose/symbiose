(function() {
	/**
	 * An operation.
	 * @name {Webos.Operation}
	 * @augments {Webos.Observable}
	 * @constructor
	 * @since  1.0beta3
	 */
	var Operation = function () {
		Webos.Observable.call(this);
	};
	/**
	 * Operation's prototype.
	 */
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
		_failed: false,
		/**
		 * This operation's result.
		 * @private
		 */
		_result: null,
		on: function(event, fn) {
			var that = this;

			if (typeof event == 'object') {
				for (var eventName in event) {
					fn = event[eventName];
					if (typeof fn != 'function') {
						continue;
					}

					this.on(eventName, fn);
				}
				return this;
			}

			var result = Webos.Operation._parent.prototype.on.call(this, event, fn);

			if (this.completed()) {
				var events = event.split(' '), eventsNames = [];
				for (var i = 0; i < events.length; i++) {
					eventsNames.push(events[i].split('.')[0]);
				}

				setTimeout(function () {
					if (~$.inArray('complete', eventsNames)) {
						fn.call(that, { result: that._result });
					}
					if (~$.inArray('error', eventsNames) && that.failed()) {
						fn.call(that, { result: that._result });
					}
					if (~$.inArray('success', eventsNames) && !that.failed()) {
						fn.call(that, { result: that._result });
					}
				}, 0);
			}

			return result;
		},
		/**
		 * Check if this operation is started.
		 * @return {Boolean} True if this operation is started, false otherwise.
		 */
		started: function () {
			return this._started;
		},
		/**
		 * Get this operation's progress.
		 * @return {Number} This operation's progress, in percentages.
		 */
		progress: function () {
			return this._progress;
		},
		/**
		 * Check if this operation is completed.
		 * @return {Boolean} True if this operations is completed, false otherwise.
		 */
		completed: function () {
			return this._completed;
		},
		/**
		 * Get this operation's result.
		 * @return {Object} The result.
		 * @since  1.0beta5
		 */
		result: function () {
			return this._result;
		},
		/**
		 * Check if this operation is failed.
		 * @return {Boolean} True if this operations is failed, false otherwise.
		 */
		failed: function () {
			return this._failed;
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
		addProgress: function (value) {
			value = Number(value);

			if (isNaN(value)) {
				return false;
			}

			return this.setProgress(this.progress() + value);
		},
		/**
		 * Mark this operation as completed.
		 * @param result This operation's result. False values will mark the operation as failed.
		 * @param [data] This operation's result data, if not provided as first argument.
		 */
		setCompleted: function (result, data) {
			this.setProgress(100);

			if (typeof data == 'undefined') {
				data = result;
			}

			var isFailed = function () {
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
			};

			this._completed = true;
			this._failed = isFailed();
			this._result = data;

			this.trigger('complete', { result: this.result(), failed: this.failed() });

			var eventName = (this.failed()) ? 'error' : 'success';
			this.trigger(eventName, { result: this.result() });
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

			return this;
		},
		/**
		 * Abort this operation.
		 */
		abort: function () {
			this.trigger('abort');

			return this;
		},
		/**
		 * Pause this operation.
		 */
		pause: function () {
			this.trigger('pause');

			return this;
		},
		/**
		 * Resume this operation.
		 */
		resume: function () {
			this.trigger('resume');

			return this;
		},
		/**
		 * Execute a callback then this operation is completed (success or error).
		 * @param  {Function} callback The callback.
		 * @return {Object}            The operation.
		 * @since  1.0beta5
		 */
		always: function (callback) {
			this.on('complete', function (data) {
				callback(data.result);
			});
			return this;
		},
		/**
		 * Execute a callback then this operation succeeds.
		 * @param  {Function} callback The callback.
		 * @return {Object}            The operation.
		 * @since  1.0beta5
		 */
		done: function (callback) {
			this.on('success', function (data) {
				callback(data.result);
			});
			return this;
		},
		/**
		 * Execute a callback then this operation fails.
		 * @param  {Function} callback The callback.
		 * @return {Object}            The operation.
		 * @since  1.0beta5
		 */
		fail: function (callback) {
			this.on('error', function (data) {
				callback(data.result);
			});
			return this;
		},
		/**
		 * Execute a callback then this operation succeeds, fails and progresses.
		 * @param  {Function} doneFilter     The callback to execute when the operation succeeds.
		 * @param  {Function} failFilter     The callback to execute when the operation fails.
		 * @param  {Function} progressFilter The callback to execute when the operation progresses.
		 * @return {Object}              The operation.
		 * @since  1.0beta5
		 */
		then: function (doneFilter, failFilter, progressFilter) {
			if (doneFilter) {
				this.done(doneFilter);
			}
			if (failFilter) {
				this.fail(failFilter);
			}
			if (progressFilter) {
				this.on('progress', progressFilter);
			}
			return this;
		}
	};
	Webos.inherit(Operation, Webos.Observable);

	/**
	 * Create a new operation.
	 * @return {Webos.Operation} The new operation.
	 * @since 1.0beta4
	 */
	Operation.create = function () {
		return new Operation();
	};

	/**
	 * Create a new completed operation.
	 * @return {Webos.Operation} The new operation.
	 * @since 1.0beta5
	 */
	Operation.createCompleted = function (result) {
		var op = Operation.create();

		op.setCompleted(result);

		return op;
	};


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
	 * @return {Webos.Operation.Group}             The group.
	 * @static
	 */
	Operation.group = function (operations) {
		return new Webos.Operation.Group(operations);
	};


	Webos.Operation = Operation; //Export API
})();