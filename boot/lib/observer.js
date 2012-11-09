Webos.Observable = function WObservable() {
	this._observers = [];
};
Webos.Observable.prototype = {
	bind: function $_WObservable_bind(event, fn) {
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
	one: function $_WObservable_one(event, fn) {
		var that = this;

		var callbackId = this.bind(event, function(data) {
			that.unbind(callbackId);
			fn.call(this, data);
		});
	},
	unbind: function $_WObservable_unbind(key, fn) {
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
	notify: function $_WObservable_notify(event, data, thisObj) {
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
	}
};

Webos.Observable.build = function $_WObservable_build(object) {
	object._observers = [];
	object.bind = function(event, fn) {
		return Webos.Observable.prototype.bind.call(object, event, fn);
	};
	object.one = function(event, fn) {
		return Webos.Observable.prototype.one.call(object, event, fn);
	};
	object.unbind = function(key, fn) {
		return Webos.Observable.prototype.unbind.call(object, key, fn);
	};
	object.notify = function(event, data, thisObj) {
		return Webos.Observable.prototype.notify.call(object, event, data, thisObj);
	};
	return object;
};

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
	for (var method in Webos.Observable.prototype) {
		var thisMethodName = method + 'Each';
		this[thisMethodName] = function() {
			var args = Array.prototype.slice.call(arguments);
			return this._eachObserver(method, args);
		};
	}
};
Webos.Observable.Group.prototype = {
	_eachObserver: function $_WObservableGroup__eachObserver(method, args) {
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
	bind: function $_WObservableGroup_bind(event, fn) {
		var that = this;
		var nbrNotifications = 0;
		var notifsData = [];

		this._eachObserver('bind', [event, function(data) {
			nbrNotifications++;
			notifsData.push(data);

			if (nbrNotifications >= that._observables.length) {
				fn.call(that, notifsData);

				nbrNotifications = 0;
				notifsData = [];
			}
		}]);
	},
	one: function $_WObservableGroup_one(event, fn) {
		var that = this;
		var nbrNotifications = 0;
		var notifsData = [];

		this._eachObserver('one', [event, function(data) {
			nbrNotifications++;
			notifsData.push(data);

			if (nbrNotifications >= that._observables.length) {
				fn.call(that, notifsData);
			}
		}]);
	},
	addObservable: function $_WObservableGroup_addObservable(observable) {
		if (!Webos.isInstanceOf(observable, Webos.Observable)) {
			return false;
		}

		this._observables.push(observable);
	},
	removeObservable: function $_WObservableGroup_removeObservable(observable) {
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
	observables: function $_WObservableGroup_observables() {
		return this._observables;
	}
};

Webos.Observable.group = function $_WObservable_group(observables) {
	return new Webos.Observable.Group(observables);
};