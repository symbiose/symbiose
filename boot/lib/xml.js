//Recuperer le contenu d'un fichier XML
Webos.XMLFile = function WXMLFile(path, callback) {
	var xmlCallback = new W.Callback(function(response) {
		var xmlDoc = $.parseXML(response.getStandardChannel());
		var xml = $(xmlDoc);
		callback.success(xml, xmlDoc);
	}, function(error) {
		callback.error(error);
	});
	new W.ServerCall({
		'class': 'FileController',
		'method': 'getContents',
		'arguments': { 'filename': path }
	}).load(xmlCallback);
};