//Inclure une feuille de style CSS
Webos.Stylesheet = function WStylesheet(path, container) {
	this.ajax = $.ajax({
		url: path,
		method: 'get',
		async: false,
		dataType: 'text',
		success: function(css, textStatus, jqXHR) {
			if (typeof container != 'undefined') {
				css = css.replace(/\/\*([\s\S]*?)\*\//g, ''); //On enleve les commentaires
				
				var replaceFn = function(str, p1, p2) {
					var result = '';
					
					p1 = p1.replace(/\s+/g, ' ');
					
					if (/^\s*@/.test(p1)) {
						if (/^\s*(@.+;)+/.test(p1)) {
							result += /@.+;/g.exec(p1).join('');
						} else {
							return p1+'{'+p2+'}';
						}
					}
					
					var selectors = p1.split(',');
					
					result += container+' '+selectors.join(', '+container+' ')+'{'+p2+'}';
					result = result.replace(/\s+/g, ' ');
					return result;
				};
				css = css.replace(/([\s\S]+?)\{([\s\S]*?)\}/g, replaceFn);
			}
			Webos.Stylesheet.insertCss(css);
		}
	});
};

//Appliquer du code CSS a la page
Webos.Stylesheet.insertCss = function insertCss(css) {
	var cssTag = document.createElement('style');
	cssTag.setAttribute('type', 'text/css');
	var cssText = document.createTextNode(css);
	cssTag.appendChild(cssText);
	$('head').append(cssTag);
};