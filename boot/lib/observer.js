/**
 * An observable object.
 * @constructor
 * @since 1.0alpha1
 */
Webos.Observable = function WObservable() {
	this._observers = [];
};
Webos.Observable.prototype = {
	/**
	 * A list of all observers.
	 * @type {Array}
	 * @private
	 */
	_observers: [],
	/**
	 * Listen to an event.
	 * @param   {String}   event The event's name. Multiple events can be listened if a space-separated list of events is provided. Namespaces are supported too.
	 * @param   {Function} fn    The callback which will be called when the event will be triggered.
	 * @returns {Number}         The callback's ID.
	 */
	on: function (event, fn) {
		var namespace = event;
		var events = event.split(' '), eventsNames = [];
		for (var i = 0; i < events.length; i++) {
			eventsNames.push(events[i].split('.')[0]);
		}

		return this._observers.push({
			fn: fn,
			eventsNames: eventsNames,
			events: events
		}) - 1;
	},
	/**
	 * @deprecated Use Observable#on() instead.
	 */
	bind: function (event, fn) {
		return this.on(event, fn);
	},
	/**
	 * Listen once to an event.
	 * @param   {String}   event The event's name.
	 * @param   {Function} fn    The callback which will be called when the event will be triggered.
	 * @returns {Number}         The callback's ID.
	 * @see Webos.Observable#on()
	 */
	once: function (event, fn) {
		var that = this;

		var callbackId = this.bind(event, function(data) {
			that.unbind(callbackId);
			fn.call(this, data);
		});

		return callbackId;
	},
	/**
	 * @deprecated Use Observable#once() instead.
	 */
	one: function (event, fn) {
		return this.once(event, fn);
	},
	/**
	 * Stop listening to an event.
	 * @param  {Number|String}   key   The callback's ID or the event's name.
	 * @param  {Function}        [fn]  The callback.
	 */
	off: function (key, fn) {
		var observers = [];
		if (typeof key == 'number') {
			for (var i = 0; i < this._observers.length; i++) {
				var el = this._observers[i];
				if (key != i) {
					observers.push(el);
				}
			}
		} else {
			key = String(key);
			var events = key.split(' ');
			for (var i = 0; i < this._observers.length; i++) {
				var el = this._observers[i], keep = true;

				if (fn && el.fn === fn) {
					keep = false;
				}
				
				for (var j = 0; j < events.length; j++) {
					if (key && (jQuery.inArray(events[j], el.eventsNames) != -1 || jQuery.inArray(events[j], el.events) != -1)) {
						keep = false;
					}
				}

				if (keep) {
					observers.push(el);
				}
			}
		}
		this._observers = observers;
	},
	/**
	 * @deprecated Use Observable#off() instead.
	 */
	unbind: function (key, fn) {
		return this.off(key, fn);
	},
	/**
	 * Trigger an event.
	 * @param  {String} event     The event's name.
	 * @param  {Object} [data]    Data to provide to callbacks.
	 * @param  {Object} [thisObj] Scope in which callbacks will be executed.
	 */
	trigger: function (event, data, thisObj) {
		data = data || {};
		var scope = thisObj || this, events = event.split(' ');

		for (var i = 0; i < this._observers.length; i++) {
			var el = this._observers[i];

			for (var j = 0; j < events.length; j++) {
				if (jQuery.inArray(events[j], el.eventsNames) != -1 || jQuery.inArray(events[j], el.events) != -1) {
					el.fn.call(scope, data);
				}
			}
		}
	},
	/**
	 * @deprecated Use Observable#trigger() instead.
	 */
	notify: function (event, data, thisObj) {
		return this.trigger(event, data, thisObj);
	}
};

/**
 * Build an observable from an existing object.
 * @param  {Object} object The original object.
 * @returns {Object}        The modified object.
 * @static
 */
Webos.Observable.build = function (object) {
	for (var attr in Webos.Observable.prototype) {
		object[attr] = Webos.Observable.prototype[attr];
	}

	object._observers = [];

	return object;
};

/**
 * A group of observable objects.
 * @param {Array|Webos.Observable} observables Observable(s).
 * @constructor
 * @borrows Webos.Observable#bind as #bind
 * @borrows Webos.Observable#one as #one
 * @since  1.0beta1
 */
Webos.Observable.Group = function WObservableGroup(observables) {
	var list = [];
	if (observables instanceof Array) {
		for (var i = 0; i < observables.length; i++) {
			if (Webos.isInstanceOf(observables[i], Webos.Observable)) {
				list.push(observables[i]);
			}
		}
	} else if (Webos.isInstanceOf(observables, Webos.Observable)) {
		list = [observables];
	}

	this._observables = list;

	// xxxEach() methods
	var that = this;
	for (var method in Webos.Observable.prototype) {
		(function(method) {
			var thisMethodName = method + 'Each';
			that[thisMethodName] = function() {
				var args = Array.prototype.slice.call(arguments);
				return this._eachObservable(method, args);
			};
		})(method);
	}
};
Webos.Observable.Group.prototype = {
	/**
	 * Apply a method of each observable.
	 * @param  {String} method The method's name.
	 * @param  {Array}  [args] Arguments to provide to the method.
	 * @returns {Array}         Values returned by each observable.
	 */
	_eachObservable: function $_WObservableGroup__eachObserver(method, args) {
		var returnValues = [];

		for (var i = 0; i < this._observables.length; i++) {
			if (!this._observables[i][method]) {
				continue;
			}

			var result = this._observables[i][method].apply(this._observables[i], args);
			returnValues.push(result);
		}

		return returnValues;
	},
	on: function (event, fn) {
		var that = this;
		var nbrNotifications = 0;
		var notifsData = [];

		this._eachObservable('on', [event, function(data) {
			nbrNotifications++;
			notifsData.push(data);

			if (nbrNotifications >= that._observables.length) {
				fn.call(that, notifsData);

				nbrNotifications = 0;
				notifsData = [];
			}
		}]);
	},
	bind: function (event, fn) {
		return this.on(event, fn);
	},
	once: function (event, fn) {
		var that = this;
		var nbrNotifications = 0;
		var notifsData = [];

		this._eachObservable('once', [event, function(data) {
			nbrNotifications++;
			notifsData.push(data);

			if (nbrNotifications >= that._observables.length) {
				fn.call(that, notifsData);
			}
		}]);
	},
	one: function (event, fn) {
		return this.once(event, fn);
	},
	/**
	 * Add an observable to the group.
	 * @param {Webos.Observable} observable The observable.
	 */
	addObservable: function (observable) {
		if (!Webos.isInstanceOf(observable, Webos.Observable)) {
			return false;
		}

		this._observables.push(observable);
	},
	/**
	 * Remove an observable from the group.
	 * @param {Webos.Observable} observable The observable.
	 */
	removeObservable: function (observable) {
		if (!Webos.isInstanceOf(observable, Webos.Observable)) {
			return false;
		}

		var list = [];

		for (var i = 0; i < this._observables.length; i++) {
			if (this._observables[i] !== observable) {
				list.push(this._observables[i]);
			}
		}

		this._observables = list;
	},
	/**
	 * Get a list of obseravbles in the group.
	 * @returns {Array} The list of observables.
	 */
	observables: function () {
		return this._observables;
	}
};

/**
 * Put observables in a group.
 * @param   {Array|Webos.Observable} observables Observable(s).
 * @returns {Webos.Observable.Group}             The group.
 * @static
 */
Webos.Observable.group = function $_WObservable_group(observables) {
	return new Webos.Observable.Group(observables);
};
