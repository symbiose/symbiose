Webos.Observable = function WObservable() {
	this._observers = [];
};
Webos.Observable.prototype = {
	bind: function(event, fn) {
		this._observers.push({
			fn: fn,
			event: event
		});
	},
	unbind: function(event, fn) {
		this._observers = this._observers.filter(function(el) {
			if (el.fn !== fn || el.event !== event) {
				return el;
			}
		});
	},
	notify: function(event, data, thisObj) {
		data = data || {};
		var scope = thisObj || window;
		this._observers.forEach(function(el) {
			if (el.event === event) {
				el.fn.call(scope, data);
			}
		});
	}
};

Webos.Observable.build = function(object) {
	object._observers = [];
	object.bind = function(event, fn) {
		object._observers.push({
			fn: fn,
			event: event
		});
	};
	object.unbind = function(event, fn) {
		object._observers = this._observers.filter(function(el) {
			if (el.fn !== fn || el.event !== event) {
				return el;
			}
		});
	};
	object.notify = function(event, data, thisObj) {
		data = data || {};
		var scope = thisObj || window;
		object._observers.forEach(function(el) {
			if (el.event === event) {
				el.fn.call(scope, data);
			}
		});
	};
	return object;
};