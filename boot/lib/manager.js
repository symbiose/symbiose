Webos.Manager = function WManager() {
	Webos.Observable.call(this);
	this._name = 'Manager';
	Webos.Manager._list[this._name] = this;
};
Webos.Manager.prototype = {};
Webos.Manager._list = {};
Webos.Manager.get = function(name) {
	return Webos.Manager._list[name];
};
Webos.inherit(Webos.Manager, Webos.Observable);