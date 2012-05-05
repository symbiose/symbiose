Webos.Observable = function WObservable() {
	this.observers = [];
};
Webos.Observable.prototype = {
	bind: function(event, fn) {
		this.observers.push({
			fn: fn,
			event: event
		});
	},
	unbind: function(event, fn) {
		this.observers = this.observers.filter(function(el) {
			if (el.fn !== fn || el.event !== event) {
				return el;
			}
		});
	},
	notify: function(event, data, thisObj) {
		data = data || {};
		var scope = thisObj || window;
		this.observers.forEach(function(el) {
			if (el.event === event) {
				el.fn.call(scope, data);
			}
		});
	}
};