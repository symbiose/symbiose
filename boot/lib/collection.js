(function() {
	/**
	 * A collection of objects.
	 * @param {Array} [entities] Entities contained in the collection.
	 * @param {Function} [type] This collection's type (the entities' class).
	 * @constructor
	 */
	var Collection = function WCollection(entities, type) {
		this._type = undefined;
		this._data = [];

		if (entities instanceof Array) {
			if (!type) {
				type = undefined;
			}

			for (var i = 0; i < entities.length; i++) {
				var entity = entities[i];

				var result = this.add(entity);

				if (result === false) {
					continue;
				}

				if (entity.constructor) {
					if (typeof type == 'undefined') {
						type = entity.constructor;
					} else if (type !== null && type !== entity.constructor) {
						type = null;
					}
				}
			}
		}

		this.type(type);
	};
	Collection.prototype = {
		/**
		 * Get/set this collection's type.
		 * The collection's type is the parent class of each entity.
		 * @param {Function} [type] If specified, the type of the collection will be set.
		 * @returns {Function|undefined} If no type is specified, the collection's type will be returned.
		 */
		type: function $_WCollection_type(type) {
			if (typeof type == 'undefined') {
				return this._type;
			} else {
				if (!type) {
					return false;
				}

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
		/**
		 * Add an entity to the collection.
		 * @param entity The entity to add.
		 */
		add: function $_WCollection_add(entity) {
			if (this.type() && !Webos.isInstanceOf(entity, this.type())) {
				return false;
			}

			this._data.push(entity);
		},
		/**
		 * Remove an entity in the collection.
		 * @param {Number} i The index of the entity in the collection.
		 */
		remove: function $_WCollection_remove(i) {
			this._data = this._data.slice(0,i).concat(this._data.slice(i+1));
		},
		/**
		 * Execute a callback on each entity in the collection.
		 * The function will be executed in the context of each entity, one by one. If the callback returns false, no more entities will be processed.
		 * @param {Function} fn The callback.
		 */
		each: function $_WCollection_each(fn) {
			if (typeof fn != 'function') {
				return false;
			}

			for (var i = 0; i < this._data.length; i++) {
				var result = fn.call(this._data[i]);
				if (result === false) {
					break;
				}
			}
		},
		/**
		 * Get a list of entities contained in the collection.
		 * @returns {Array} An array containing all entities.
		 */
		list: function $_WCollection_list() {
			return this._data;
		},
		/**
		 * Get a specified entity in the collection.
		 * @param {Number} i The index of the entity in the collection.
		 * @returns The corresponding entity.
		 */
		item: function $_WCollection_item(i) {
			return this._data[i];
		},
		/**
		 * Get the number of entities contained in the collection.
		 * @returns {Number} The number of entities.
		 */
		length: function $_WCollection_length() {
			return this._data.length;
		}
	};

	Webos.Collection = Collection;
})();
