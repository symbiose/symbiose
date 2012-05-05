var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('stylesheet', 'usr/share/css/gconf/categories/systemdata.css');

var content = $.w.label().addClass('systemdata').appendTo(confWindow.window('content'));

var distributorLogo = $.w.image('usr/share/images/distributor/logo.png', 'Logo').addClass('logo').appendTo(content);

var distributorName = $('<h2>Webos</h2>').appendTo(content);

var systemData = $('<ul></ul>').appendTo(content);

confWindow.window('loading', true);

var callback = new W.Callback(function(response) {
	var data = response.getData();
	distributorName.html(data.webos_name+' '+data.webos_version);
	var dataList = {
		'Nom du serveur': data.host,
		'Version actuelle de PHP': data.php_version,
		'Version requise de PHP pour le webos': data.required_php_version,
		'Syst&egrave;me d\'exploitation': data.os,
		'Type du syst&egrave;me d\'exploitation': data.os_type,
		'Espace disque restant': W.File.bytesToSize(data.free_space)
	};
	for (var label in dataList) {
		var item = $('<li></li>');
		item.html('<span class="detail">'+label+' : </span>'+dataList[label]);
		systemData.append(item);
	}
	confWindow.window('loading', false);
}, function(response) {
	confWindow.window('loading', false);
	response.triggerError('Impossible de r&eacute;cup&eacute;rer les informations syst&egrave;me');
});
new W.ServerCall({
	'class': 'ServerController',
	'method': 'getSystemData'
}).load(callback);