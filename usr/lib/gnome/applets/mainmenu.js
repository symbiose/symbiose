/**
 * Webos.Dashboard.Applet.MainMenu represente le menu principal de GNOME.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.MainMenu = function WMainMenuApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var menuContent = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(menuContent);
	
	var callback = new W.Callback(function(response) {
		var data = response.getData();
		var menu = {
			applications: { tag: $('<li class="applications"><a href="#" title="Acc&eacute;der &agrave; vos applications"><img src="'+new W.Icon('status/distributor-logo', 24, 'ubuntu-mono-dark')+'" class="icon"/>Applications</a></li>'), content: {} },
			places: { tag: $('<li class="places"><a href="#" title="Acc&eacute;der &agrave; vos fichiers">Raccourcis</a></li>'), content: {} },
			system: { tag: $('<li class="system"><a href="#" title="Param&eacute;trer le webos">Syst&egrave;me</a></li>'), content: {} }
		};
		
		//On affiche les categories
		for (var key in data.categories) {
			//Si le menu dans lequel est la categorie n'existe pas
			if (typeof menu[data.categories[key].menu] == 'undefined') {
				continue;
			}
			
			menu[data.categories[key].menu].content[data.categories[key].name] = {
				tag: $('<li><a href="#" title="'+data.categories[key].description+'"><span class="arrow"></span><img src="'+new W.Icon(data.categories[key].icon, 22)+'" class="icon"/>'+data.categories[key].title+'</a></li>'),
				content: {}
			};
		}
		
		//Puis les applications
		for (var key in data.applications) {
			(function(key) {
				//Si le menu dans lequel est l'application n'existe pas
				if (typeof menu[data.applications[key].menu] == 'undefined') {
					return;
				}
				
				var item = $('<li><a href="'+data.applications[key].command+'" title="'+data.applications[key].description+'"><img src="'+new W.Icon(data.applications[key].icon, 22)+'" class="icon"/>'+data.applications[key].title+'</a></li>').click(function() {
					W.Cmd.execute(data.applications[key].command, new W.Callback());
				});
				
				//Si la categorie est specifiee et elle existe
				if (typeof data.applications[key].category != 'undefined' && typeof menu[data.applications[key].menu].content[data.applications[key].category] != 'undefined') {
					menu[data.applications[key].menu].content[data.applications[key].category].content[data.applications[key].command] = item;
				} else {
					menu[data.applications[key].menu].content[data.applications[key].command] = item;
				}
			})(key);
		}
		
		//Fonction qui genere le menu
		var renderMenuItem = function(item) {
			if (item instanceof $) {
				return item;
			} else {
				var content = $('<ul></ul>');
				for(var key in item.content) {
					content.append(renderMenuItem(item.content[key]));
				}
				return item.tag.append(content);
			}
		};
		
		//On  genere le menu
		for(var key in menu) {
			menuContent.append(renderMenuItem(menu[key]));
		}
	});
	
	new W.ServerCall({
		'class': 'ApplicationShortcutController',
		method: 'get',
		arguments: {}
	}).load(callback);
};