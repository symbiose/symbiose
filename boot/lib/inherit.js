/**
 * Implémentation de la notion d'héritage.
 * @param {Object} C La classe fille.
 * @param {Object} P La classe parente.
 */
Webos.inherit = function(C, P) {
	var F = function() {};
	F.prototype = P.prototype;
	C.prototype = $.extend({}, new F(), C.prototype);
	C.uber = P.prototype;
	C._parent = P;
	C.prototype.constructor = C;
};

/**
 * Détermine si un objet est une instance d'une classe.
 * @param {Object} instance L'objet a tester.
 * @param {Object} obj La classe.
 * @returns {Boolean} Vrai si l'objet est une instance de la classe spécifiée.
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