/**
 * An implementation of inheritance.
 * @param {Object} C The child class.
 * @param {Object} P The parent class.
 */
Webos.inherit = function(C, P) {
	var F = function() {};
	F.prototype = P.prototype;
	C.prototype = $.extend({}, new F(), C.prototype);
	C.uber = P.prototype;
	C._parent = P;
	C.prototype.constructor = C;
	C.prototype._super = function(attr) {
		if (typeof this.constructor.uber[attr] == 'function') {
			var args = [];
			for (var i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			return this.constructor.uber[attr].apply(this, args);
		} else if (typeof this.constructor.uber[attr] != 'undefined') {
			return this.constructor.uber[attr];
		}
	};
};

/**
 * Check if an object is an instance of a class.
 * @param {Object} instance The object.
 * @param {Object} obj The class.
 * @returns {Boolean} True if the object is an instance of the class, false otherwise.
 */
Webos.isInstanceOf = function(instance, obj) {
	if (!instance || typeof instance != 'object' || !obj) {
		return false;
	}

	var current;
	do {
		if (current) {
			current = current._parent;
		} else {
			current = instance.constructor;
		}
		
		if (current === obj) {
			return true;
		}
	} while (current._parent);

	try {
		if (instance instanceof obj) {
			return true;
		}
	} catch(e) {}
	
	return false;
};
