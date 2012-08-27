Webos.Observable = function WObservable() {
	this._observers = [];
};
Webos.Observable.prototype = {
	bind: function(event, fn) {
		return this._observers.push({
			fn: fn,
			event: event
		}) - 1;
	},
	unbind: function(key, fn) {
		switch (typeof key) {
			case 'number':
				delete this._observers[key];
				break;
			case 'string':
				this._observers = this._observers.filter(function(el) {
					if (el.fn !== fn || el.event !== key) {
						return el;
					}
				});
				break;
		}
	},
	notify: function(event, data, thisObj) {
		data = data || {};
		var scope = thisObj || this;
		this._observers.forEach(function(el) {
			if (jQuery.inArray(event, el.event.split(' ')) != -1) {
				el.fn.call(scope, data);
			}
		});
	}
};

Webos.Observable.build = function(object) {
	object._observers = [];
	object.bind = function(event, fn) {
		return object._observers.push({
			fn: fn,
			event: event
		}) - 1;
	};
	object.unbind = function(key, fn) {
		switch (typeof key) {
			case 'number':
				delete object._observers[key];
				break;
			default:
				object._observers = object._observers.filter(function(el) {
					if (el.fn !== fn || el.event !== key) {
						return el;
					}
				});
				break;
		}
	};
	object.notify = function(event, data, thisObj) {
		data = data || {};
		var scope = thisObj || object;
		object._observers.forEach(function(el) {
			if (jQuery.inArray(event, el.event.split(' ')) != -1) {
				el.fn.call(scope, data);
			}
		});
	};
	return object;
};