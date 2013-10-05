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
			return (this._result === false || Webos.isInstanceOf(this._result, Webos.Error));
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

	Webos.Operation = Operation; //Export API
})();