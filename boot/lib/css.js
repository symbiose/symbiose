//Inclure une feuille de style CSS
Webos.Stylesheet = function WStylesheet(path, container) {
	if (!/^(\/|~\/)/.test(path)) {
		path = '/'+path;
	}
	
	new Webos.ServerCall({
		'class': 'FileController',
		method: 'getContents',
		arguments: {
			file: path
		},
		async: false
	}).load(function(response) {
		var css = response.getStandardChannel();
		if (css) {
			Webos.Stylesheet.insertCss(css, container);
		}
	});
};

//Appliquer du code CSS a la page
Webos.Stylesheet.insertCss = function insertCss(css, container) {
	if (container) {
		css = css
			.replace(/\/\*([\s\S]*?)\*\//g, '') //On enleve les commentaires
			.replace(/([\s\S]+?)\{([\s\S]*?)\}/g, function(str, p1, p2) {
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
			});
	}
	
	var cssTag = document.createElement('style');
	cssTag.setAttribute('type', 'text/css');
	var cssText = document.createTextNode(css);
	cssTag.appendChild(cssText);
	$('head').append(cssTag);
};