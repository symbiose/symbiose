(function() {
	var Collection = function WCollection(type) {
		this._type = type;
		this._data = [];
	};
	Collection.prototype = {
		type: function $_WCollection_type(type) {
			if (typeof type == 'undefined') {
				return this._type;
			} else {
				var that = this;

				this._type = type;

				this._methods = [];
				for (var attr in type.prototype) {
					if (!this[attr] && typeof type.prototype[attr] == 'function') {
						this[attr] = (function() {
							return (function() {
								var args = arguments;
								that.each(function() {
									this[attr].apply(this, args);
								});
							});
						})();
					}
				}
			}
		},
		add: function $_WCollection_add(entity) {
			if (this.type() && !Webos.isInstanceOf(entity, this.type())) {
				return false;
			}

			this._data.push(entity);
		},
		remove: function $_WCollection_remove(i) {
			this._data = this._data.slice(0,i).concat(this._data.slice(i+1));
		},
		each: function $_WCollection_each(fn) {
			if (typeof fn != 'function') {
				return false;
			}

			for (var i = 0; i < this._data.length; i++) {
				fn.call(this._data[i]);
			}
		},
		list: function $_WCollection_list() {
			return this._data;
		},
		length: function $_WCollection_length() {
			return this._data.length;
		}
	};

	Webos.Collection = Collection;
})();