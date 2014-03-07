/**
 * The webos' clipboard.
 */
Webos.Clipboard = {
	/**
	 * The clipboard cache.
	 * @private
	 */
	_cache: null,
	/**
	 * Store an item in the clipboard cache.
	 * @param {Webos.Clipboard.Item} item The item.
	 * @private
	 */
	_storeItem: function(item) {
		Webos.Clipboard._cache = item;
	},
	/**
	 * Copy an item.
	 * @param {Object} data The item data.
	 * @return {Webos.Clipboard.Item} The clipboard item.
	 */
	copy: function(data) {
		var item = new Webos.Clipboard.Item(data, 'copy');
		Webos.Clipboard._storeItem(item);
		Webos.Clipboard.notify('copy', { item: item });
		return item;
	},
	/**
	 * Cut an item.
	 * @param {Object} data The item data.
	 * @return {Webos.Clipboard.Item} The clipboard item.
	 */
	cut: function(data) {
		var item = new Webos.Clipboard.Item(data, 'cut');
		Webos.Clipboard._storeItem(item);
		Webos.Clipboard.notify('cut', { item: item });
		return item;
	},
	/**
	 * Get the item currently in the clipboard.
	 * @return {Webos.Clipboard.Item} The clipboard item.
	 */
	get: function() {
		return Webos.Clipboard._cache;
	},
	/**
	 * Clear the clipboard.
	 */
	clear: function() {
		Webos.Clipboard._cache = null;
		Webos.Clipboard.notify('clear');
	}
};

Webos.Observable.build(Webos.Clipboard);

/**
 * A clipboard item.
 * @constructor
 * @augments Webos.Observable
 */
Webos.Clipboard.Item = function(data, operation) {
	this._data = data;
	this._operation = operation;

	Webos.Observable.call(this);
};
/**
 * The clipboard item prototype.
 */
Webos.Clipboard.Item.prototype = {
	/**
	 * Check if this item data is an instance of the specified class.
	 * @param {Object} obj The class.
	 * @return {Boolean} True if this item data is an instance of the specified class, false otherwise.
	 * @see Webos.isInstanceOf
	 */
	is: function(obj) {
		return Webos.isInstanceOf(this._data, obj);
	},
	/**
	 * Get this item's operation.
	 * @return {String} `copy` or `cut`.
	 */
	operation: function() {
		return this._operation;
	},
	
	/**
	 * Paste this item.
	 * @param {Webos.Callback} callback The callback. Takes the pasted data as argument.
	 * @param {Boolean} async True if the paste operation is asynchronous. When the operation is finished, you must call `pasted()`.
	 * @see Webos.Clipboard.Item#pasted
	 */
	paste: function(callback, async) {
		callback = Webos.Callback.toCallback(callback);

		callback.success(this._data);

		if (!async) {
			this.pasted();
		}
	},
	/**
	 * Set the paste operation as finished.
	 * @see Webos.Clipboard.Item#paste
	 */
	pasted: function() {
		this.notify('paste');
		Webos.Clipboard.notify('paste', { item: this });
	},
	/**
	 * Set this item data.
	 * @param {Object} data The new data.
	 */
	setData: function(data) {
		this._data = data;
	}
};
Webos.inherit(Webos.Clipboard.Item, Webos.Observable);
