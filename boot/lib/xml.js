/**
 * An XML file.
 * @param {String} path The file's path.
 * @param {Webos.Callback} callback The callback.
 * @constructor
 * @since 1.0alpha1
 * @deprecated
 */
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
