var thisProcess = this, confWindow = args.getParam(0);
var content = confWindow.window('content');

var canReadSystemFiles = thisProcess.getAuthorizations().can('file.system.read');

confWindow.window('stylesheet', '/usr/share/css/gconf/categories/systemdata.css');

var tabs = $.w.tabs().appendTo(content);

//About
var aboutContent = $.w.label().addClass('about');
tabs.tabs('tab', 'Webos', aboutContent);

var distributorLogo = $.w.image(W.File.get('/usr/share/images/distributor/logo.png').get('realpath'), 'Logo')
	.addClass('logo')
	.appendTo(aboutContent);
var distributorName = $('<h2>'+Webos.name+'</h2>').appendTo(aboutContent);

var about = $.w.label().appendTo(aboutContent)
	.label('content').load(W.File.get('/usr/share/docs/webos/about.html').get('realpath'));

if (thisProcess.getAuthorizations().can('package.read')) {
	var $checkUpdatesBtn = $.w.button('Check system updates...').click(function() {
		W.Cmd.execute('update-manager');
	}).appendTo(aboutContent);
}

if (canReadSystemFiles) {
	//System
	var serverData = $.w.label().addClass('serverdata');
	tabs.tabs('tab', 'Server', serverData);

	var serverDataList = $('<ul></ul>').addClass('serverDataList').appendTo(serverData);

	//Users
	var usersData = $.w.label().addClass('usersdata');
	tabs.tabs('tab', 'Users', usersData);

	var usersDataList = $('<ul></ul>').addClass('usersDataList').appendTo(usersData);

	tabs.on('tabsselect', function(e, data) {

		switch (data.index) {
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
							'Server name': data.host,
							'Current PHP version': data.php_version,
							'Required PHP version for the webos': data.required_php_version,
							'OS': data.os,
							'OS type': data.os_type,
							'Available disk space': W.File.bytesToSize(data.free_space)
						};

						serverDataList.empty();
						for (var label in dataList) {
							var item = $('<li></li>');
							item.html('<span class="detail">'+label+': </span>'+dataList[label]);
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
						'Number of users': data.nbr_users
					};

					usersDataList.empty();
					for (var label in dataList) {
						var item = $('<li></li>');
						item.html('<span class="detail">'+label+': </span>'+dataList[label]);
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
}

tabs.tabs('option', 'selectedTab', 0);