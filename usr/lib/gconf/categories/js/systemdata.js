var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('stylesheet', 'usr/share/css/gconf/categories/systemdata.css');

var tabs = $.w.tabs().appendTo(content);

//About
var aboutContent = $.w.label().addClass('about');
tabs.tabs('tab', 'Webos', aboutContent);

var distributorLogo = $.w.image('usr/share/images/distributor/logo.png', 'Logo').addClass('logo').appendTo(aboutContent);

var distributorName = $('<h2>Webos</h2>').appendTo(aboutContent);

var about = $.w.label().appendTo(aboutContent).label('content').load('usr/share/docs/webos/about.html');

var $checkUpdatesBtn = $.w.button('V&eacute;rifier les mises &agrave; jour...').click(function() {
	W.Cmd.execute('update-manager');
}).appendTo(aboutContent);

//System
var serverData = $.w.label().addClass('serverdata');
tabs.tabs('tab', 'Serveur', serverData);

var serverDataList = $('<ul></ul>').addClass('serverDataList').appendTo(serverData);

//Users
var usersData = $.w.label().addClass('usersdata');
tabs.tabs('tab', 'Utilisateurs', usersData);

var usersDataList = $('<ul></ul>').addClass('usersDataList').appendTo(usersData);

tabs.on('tabsselect', function(e, data) {
	switch (data.tab) {
		case 0:
			confWindow.window('loading', true);

			Webos.require('/usr/lib/webos/server.js', function() {
				Webos.Server.getData([function(data) {
					distributorName.html(data.webos_name+' '+data.webos_version);
					
					confWindow.window('loading', false);
				}, function(response) {
					confWindow.window('loading', false);
					response.triggerError();
				}]);
			});
			break;
		case 1:
			confWindow.window('loading', true);

			Webos.require('/usr/lib/webos/server.js', function() {
				Webos.Server.getData([function(data) {
					var dataList = {
						'Nom du serveur': data.host,
						'Version actuelle de PHP': data.php_version,
						'Version requise de PHP pour le webos': data.required_php_version,
						'Syst&egrave;me d\'exploitation': data.os,
						'Type du syst&egrave;me d\'exploitation': data.os_type,
						'Espace disque restant': W.File.bytesToSize(data.free_space)
					};

					serverDataList.empty();
					for (var label in dataList) {
						var item = $('<li></li>');
						item.html('<span class="detail">'+label+' : </span>'+dataList[label]);
						serverDataList.append(item);
					}

					confWindow.window('loading', false);
				}, function(response) {
					confWindow.window('loading', false);
					response.triggerError();
				}]);
			});
			break;
		case 2:
			confWindow.window('loading', true);

			Webos.User.stats([function(data) {
				var dataList = {
					'Nombre d\'utilisateurs': data.nbr_users
				};

				usersDataList.empty();
				for (var label in dataList) {
					var item = $('<li></li>');
					item.html('<span class="detail">'+label+' : </span>'+dataList[label]);
					usersDataList.append(item);
				}

				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				response.triggerError();
			}]);
			break;
	}
});
tabs.tabs('option', 'selectedTab', 0);