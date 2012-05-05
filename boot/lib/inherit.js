Webos.inherit = function(C, P) {
	var F = function() {};
	F.prototype = P.prototype;
	C.prototype = $.extend({}, new F(), C.prototype);
	C.uber = P.prototype;
	C.prototype.constructor = C;
};