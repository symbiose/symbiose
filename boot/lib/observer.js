Webos.Observable = function WObservable() {
	this._observers = [];
};
Webos.Observable.prototype = {
	bind: function(event, fn) {
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
	unbind: function(key, fn) {
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
	notify: function(event, data, thisObj) {
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

Webos.Observable.build = function(object) {
	object._observers = [];
	object.bind = function(event, fn) {
		return Webos.Observable.prototype.bind.call(object, event, fn);
	};
	object.unbind = function(key, fn) {
		return Webos.Observable.prototype.unbind.call(object, key, fn);
	};
	object.notify = function(event, data, thisObj) {
		return Webos.Observable.prototype.notify.call(object, event, data, thisObj);
	};
	return object;
};