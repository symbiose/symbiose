Webos.Clipboard = {
	_cache: null,
	_storeItem: function(item) {
		Webos.Clipboard._cache = item;
	},
	copy: function(data) {
		var item = new Webos.Clipboard.Item(data, 'copy');
		Webos.Clipboard._storeItem(item);
		Webos.Clipboard.notify('copy', { item: item });
		return item;
	},
	cut: function(data) {
		var item = new Webos.Clipboard.Item(data, 'cut');
		Webos.Clipboard._storeItem(item);
		Webos.Clipboard.notify('cut', { item: item });
		return item;
	},
	get: function() {
		return Webos.Clipboard._cache;
	},
	clear: function() {
		Webos.Clipboard._cache = null;
		Webos.Clipboard.notify('clear');
	}
};

Webos.Observable.build(Webos.Clipboard);

Webos.Clipboard.Item = function(data, operation) {
	this._data = data;
	this._operation = operation;

	Webos.Observable.call(this);
};
Webos.Clipboard.Item.prototype = {
	is: function(obj) {
		return Webos.isInstanceOf(this._data, obj);
	},
	operation: function() {
		return this._operation;
	},
	paste: function(callback, async) {
		callback = Webos.Callback.toCallback(callback);

		callback.success(this._data);

		if (!async) {
			this.pasted();
		}
	},
	pasted: function() {
		this.notify('paste');
		Webos.Clipboard.notify('paste', { item: this });
	},
	setData: function(data) {
		this._data = data;
	}
};
Webos.inherit(Webos.Clipboard.Item, Webos.Observable);