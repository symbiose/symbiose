new W.ScriptFile('usr/lib/webos/file.js'); //On charge la bibliotheque des fichiers
new W.ScriptFile('usr/lib/apt/apt.js'); //On charge la bibliotheque JS d'APT

/**
 * SoftwareCenter represente une logitheque.
 * @param pkg Le paquet a efficher des l'ouverture de la logitheque.
 * @author $imon
 * @version 2.0
 */
function SoftwareCenter(pkg) {
	var softwareCenter = this;
	
	this.views = {};
	
	this.window = $.w.window({
		title: 'Logith&egrave;que',
		icon: new W.Icon('applications/software-center'),
		width: 650,
		height: 250,
		stylesheet: 'usr/share/css/software-center/main.css'
	});
	
	this.displayPackage = function(pkg) { //Afficher un paquet
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(data) {
			if (typeof softwareCenter.views.detail == 'undefined') {
				softwareCenter.views.detail = $.w.container();
				softwareCenter.views.detail.addClass('package-details');
				
				softwareCenter.window.window('content').append(softwareCenter.views.detail);
			}
			
			softwareCenter.switchToView('detail');
			
			if (typeof softwareCenter.detail == 'undefined') {
				softwareCenter.detail = {};
				var header = $('<div></div>', { 'class': 'header' }).appendTo(softwareCenter.views.detail);
				softwareCenter.detail.icon = $('<img />').addClass('icon').appendTo(header);
				softwareCenter.detail.title = $('<h1></h1>').appendTo(header);
				softwareCenter.detail.shortDescription = $('<span></span>').addClass('detail').appendTo(header);
				softwareCenter.detail.actionBox = $('<div></div>').addClass('action-box').appendTo(softwareCenter.views.detail);
				softwareCenter.detail.state = $('<span></span>', { 'class': 'state' }).appendTo(softwareCenter.detail.actionBox);
				softwareCenter.detail.button = $.w.button().appendTo(softwareCenter.detail.actionBox);
				softwareCenter.detail.description = $('<p></p>').addClass('description').appendTo(softwareCenter.views.detail);
				$('<div></div>', { 'class': 'separator' }).appendTo(softwareCenter.views.detail);
				var infobox = $('<ul></ul>', { 'class': 'info-box' }).appendTo(softwareCenter.views.detail);
				var version = $('<li></li>').html('<strong>Version</strong> : ').appendTo(infobox);
				softwareCenter.detail.version = $('<span></span>').appendTo(version);
				var size = $('<li></li>').html('<strong>Taille</strong> : ').appendTo(infobox);
				softwareCenter.detail.size = $('<span></span>').appendTo(size);
				var maintainer = $('<li></li>').html('<strong>Mises &agrave; jour</strong> : ').appendTo(infobox);
				softwareCenter.detail.maintainer = $('<span></span>').appendTo(maintainer);
				var releaseDate = $('<li></li>').html('<strong>Date de publication</strong> : ').appendTo(infobox);
				softwareCenter.detail.releaseDate = $('<span></span>').appendTo(releaseDate);
				$('<div></div>', { 'class': 'separator' }).appendTo(softwareCenter.views.detail);
			}
			
			softwareCenter.detail.pkgName = data.getName();
			
			softwareCenter.detail.title.html(data.getAttribute('name'));
			softwareCenter.detail.shortDescription.html(data.getAttribute('shortdescription'));
			softwareCenter.detail.description.html(data.getAttribute('description'));
			softwareCenter.detail.version.html(data.getAttribute('version'));
			softwareCenter.detail.size.html(W.File.bytesToSize(data.getAttribute('packagesize'))+' &agrave; t&eacute;l&eacute;charger, '+W.File.bytesToSize(data.getAttribute('installedsize'))+' une fois install&eacute;');
			softwareCenter.detail.maintainer.html(data.getAttribute('maintainer'));
			softwareCenter.detail.releaseDate.html(SoftwareCenter.getDate(data.getAttribute('lastupdate')));
			var actions = softwareCenter._getActions(data);
			softwareCenter.detail.button.remove();
			softwareCenter.detail.button = actions.action.appendTo(softwareCenter.detail.actionBox);
			softwareCenter.detail.state.html(actions.labels.status);
			
			if (data.getAttribute('icon') != false) {
				var icon = data.getAttribute('icon');
			} else {
				var icon = 'usr/share/images/software-center/package.png';
			}
			softwareCenter.detail.icon.attr('src', icon);
			
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false); //Le chargement est termine
			W.Error.trigger('Le paquet "'+pkg+'" est introuvable', response.getAllChannels());
		});
		SPackage.get(pkg, callback);
	};
	
	this.displayPackageList = function(list, filter) { //Afficher une liste de paquets
		if (typeof this.views.list != 'undefined') {
			this.views.list.html('');
		} else {
			this.views.list = $.w.container().addClass('list');
		}
		
		if (typeof filter == 'undefined') {
			filter = 'name';
		}
		
		this.list = {};
		this.list.packages = {};
		
		var generatePackageItemFn = function(pkg) {
			softwareCenter.list.packages[pkg.getName()] = {};
			var item = $.w.listItem();
			var itemContent = item.listItem('addColumn');
			
			softwareCenter.list.packages[pkg.getName()].item = item;
			
			if (pkg.getAttribute('icon') != false) {
				var icon = pkg.getAttribute('icon');
			} else {
				var icon = 'usr/share/images/software-center/package.png';
			}
			itemContent.append('<img src="'+icon+'" class="icon"/>');
			itemContent.append('<span class="name">'+pkg.getAttribute('name')+'</span><br /><span class="shortdescription">'+pkg.getAttribute('shortdescription')+'</span><br />');
			var more = $('<span></span>')
				.addClass('more')
				.appendTo(itemContent);
			
			$.w.button('Plus d\'informations')
				.click(function() {
					softwareCenter.displayPackage(pkg.getName());
				})
				.appendTo(more);
			
			var actions = softwareCenter._getActions(pkg);
			
			softwareCenter.list.packages[pkg.getName()].actionButton = actions.action.appendTo(more);
			
			item.bind('select', function() {
				more.show();
			});
			item.bind('unselect', function() {
				more.hide();
			});
			
			more.hide();
			
			return item;
		};
		
		var getFilterCategoryFn = function(value) {
			switch(filter) {
				case 'category':
					return SoftwareCenter.getHumanCategory(value);
				case 'lastupdate':
					return 'Nouveaut&eacute;s';
				case 'installed_time':
					return 'R&eacute;cemment install&eacute;s';
				default:
					return 'Tous les logiciels';
			}
		};
		
		var orderedList = {};
		var i = 0;
		for (var name in list) {
			var pkg = list[name];
			
			var category = getFilterCategoryFn(pkg.getAttribute(filter));
			
			var item = generatePackageItemFn(pkg);
			
			if (typeof orderedList[category] == 'undefined') {
				orderedList[category] = [];
			}
			
			orderedList[category].push(item);
			
			i++;
		}
		
		var nbrCategories = 0;
		for (var category in orderedList) {
			nbrCategories++;
		}
		
		if (i == 0) {
			var label = $.w.label()
				.addClass('empty')
				.html('Vide')
				.appendTo(this.views.list.container('content'));
		} else if (nbrCategories == 1) {
			for (var category in orderedList) {}
			var title = $('<h1></h1>').html(category).appendTo(this.views.list);
			var list = $.w.list().appendTo(this.views.list);
			for (var i = 0; i < orderedList[category].length; i++) {
				list.list('content').append(orderedList[category][i]);
			}
		} else {
			var nbrCategories = 0;
			for (var category in orderedList) {
				var spoiler = $.w.spoiler(category).appendTo(this.views.list);
				var list = $.w.list().appendTo(spoiler.spoiler('content'));
				for (var i = 0; i < orderedList[category].length; i++) {
					list.list('content').append(orderedList[category][i]);
				}
				if (nbrCategories == 0) {
					spoiler.spoiler('option', 'shown', true);
				}
				nbrCategories++;
			}
		}
		
		this.window.window('content').append(this.views.list);
		
		this.switchToView('list');
	};
	
	this.displayCategory = function(category) { //Afficher une categorie
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(list) {
			softwareCenter.displayPackageList(list, 'category');
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false);
			response.triggerError();
		});
		
		SPackage.getFromCategory(category, callback);
	};
	
	this.displayLastPackages = function() { //Afficher les 30 derniers paquets parus
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(list) {
			softwareCenter.displayPackageList(list, 'lastupdate');
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false);
			response.triggerError();
		});
		
		SPackage.getLastPackages(30, callback);
	};
	
	this.displayInstalled = function() { //Afficher les paquets installes
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(list) {
			softwareCenter.displayPackageList(list, 'category');
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false);
			response.triggerError();
		});
		
		SPackage.getInstalled(callback);
	};
	
	this.displayHistory = function() {
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(list) {
			softwareCenter.displayPackageList(list, 'installed_time');
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false);
			response.triggerError();
		});
		
		SPackage.getLastInstalled(30, callback);
	};
	
	this.search = function(search) {
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(list) {
			softwareCenter.displayPackageList(list);
			softwareCenter.window.window('loading', false); //Le chargement est termine
		}, function(response) {
			softwareCenter.window.window('loading', false);
			response.triggerError();
		});
		
		SPackage.searchPackages(search, callback);
	};
	
	this.displayHome = function() { //Afficher l'accueil
		if (typeof this.views.home != 'undefined') {
			this.switchToView('home');
			return;
		}
		
		this.views.home = $.w.container().addClass('home');
		
		this.home = {};
		
		this.window.window('loading', true); //La fenetre est en cours de chargement
		
		var callback = new W.Callback(function(packages) {
			softwareCenter.home.menu = $.w.container()
				.addClass('menu')
				.appendTo(softwareCenter.views.home);
			
			softwareCenter.home.whatsnew = $.w.container()
				.addClass('box')
				.appendTo(softwareCenter.views.home);
			var button = $.w.button('Plus')
				.click(function() {
					softwareCenter.displayLastPackages();
				})
				.appendTo(softwareCenter.home.whatsnew);
			$('<span></span>')
				.html('Quoi de neuf ?')
				.addClass('title')
				.appendTo(softwareCenter.home.whatsnew);
			
			var categories = {};
			
			var generatePackageItemFn = function(pkg) {
				if (typeof categories[pkg.getAttribute('category')] == 'undefined') {
					categories[pkg.getAttribute('category')] = pkg.getAttribute('category');
				}
				
				var item = $('<li></li>');
				if (pkg.getAttribute('icon') != false) {
					var icon = pkg.getAttribute('icon');
				} else {
					var icon = 'usr/share/images/software-center/package.png';
				}
				
				item.append($('<img />', { 'src': icon, 'class': 'icon' }));
				item.append('<span class="name">'+pkg.getAttribute('name')+'</span><br /><span class="category">'+SoftwareCenter.getHumanCategory(pkg.getAttribute('category'))+'</span>');
				item.click(function() {
					softwareCenter.displayPackage(pkg.getName());
				});
				
				return item;
			};
			
			var i = 0;
			for (var pkg in packages) {
				if (i > 8) {
					break;
				}
				if (i % 4 == 0) {
					var list = $('<ul></ul>');
					softwareCenter.home.whatsnew.append(list);
				}
				
				var item = generatePackageItemFn(packages[pkg]);
				
				list.append(item);
				
				i++;
			}
			
			var menu = $('<ul></ul>').appendTo(softwareCenter.home.menu);
			
			var generateCategoryItemFn = function(category) {
				var item = $('<li></li>').html(SoftwareCenter.getHumanCategory(category));
				item.click(function() {
					softwareCenter.displayCategory(category);
				});
				return item;
			};
			
			for (var category in categories) {
				var item = generateCategoryItemFn(category);
				
				menu.append(item);
			}
			
			softwareCenter.window.window('loading', false); //Le chargement est termine
		});
		
		SPackage.getLastPackages(8, callback);
		
		this.window.window('content').append(this.views.home);
		
		this.switchToView('home');
	};
	
	this.install = function(pkg) {
		var callback = new W.Callback(function(response) {
			softwareCenter._updateLoadingPackage(pkg);
		}, function(response) {
			W.Error.trigger('L\'installation du paquet "'+pkg.getName()+'" a &eacute;chou&eacute;', response.getAllChannels());
			softwareCenter._updateLoadingPackage(pkg);
		});
		
		pkg.install(callback);
		
		this._updateLoadingPackage(pkg);
	};
	
	this.remove = function(pkg) {
		var callback = new W.Callback(function(response) {
			softwareCenter._updateLoadingPackage(pkg);
		}, function(response) {
			W.Error.trigger('La suppression du paquet "'+pkg.getName()+'" a &eacute;chou&eacute;', response.getAllChannels());
			softwareCenter._updateLoadingPackage(pkg);
		});
		
		pkg.remove(callback);
		
		this._updateLoadingPackage(pkg);
	};
	
	var getHeaderImgDirFn = function() {
		var baseDir = 'usr/share/images/software-center/header', supportedThemes = ['ambiance', 'adwaita'];
		if (jQuery.inArray(Webos.Theme.current.get('desktop'), supportedThemes) != -1) {
			return baseDir+'/'+Webos.Theme.current.get('desktop');
		} else {
			return baseDir+'/'+supportedThemes[0];
		}
	};
	
	this._updateLoadingPackage = function(pkg) {
		var actions = this._getActions(pkg);
		
		if (typeof this.detail != 'undefined' && this.detail.pkgName == pkg.getName()) {
			this.detail.state.html(actions.labels.status);
			this.detail.button.replaceWith(actions.action);
			this.detail.button = actions.action;
		}
		
		if (typeof this.list != 'undefined' && typeof this.list.packages[pkg.getName()] != 'undefined') {
			this.list.packages[pkg.getName()].actionButton.replaceWith(actions.action);
			this.list.packages[pkg.getName()].actionButton = actions.action;
		}
		
		if (typeof this.runningPkgs == 'undefined') {
			this.runningPkgs = {};
		}
		if (pkg.isRunning()) {
			this.runningPkgs[pkg.getName()] = pkg;
			if (typeof this._headerLoadingButton == 'undefined') {
				this._headerLoadingButton = $.w.buttonWindowHeaderItem('En cours', getHeaderImgDirFn()+'/loading.gif')
					.click(function() {
						softwareCenter.displayPackageList(softwareCenter.runningPkgs);
					})
					.appendTo(this._header.buttonWindowHeader('content'));
			}
		} else {
			if (typeof this.runningPkgs[pkg.getName()] != 'undefined') {
				delete this.runningPkgs[pkg.getName()];
			}
			var i = 0;
			for (var name in this.runningPkgs) {
				if (typeof this.runningPkgs[name] != 'undefined') { i++; }
			}
			if (i == 0 && typeof this._headerLoadingButton != 'undefined') {
				this._headerLoadingButton.remove();
				delete this._headerLoadingButton;
			}
		}
	};
	
	this._getActions = function(pkg) {
		var actions = {
			labels: {}
		};
		if (pkg.isRunning()) {
			if (pkg.getAttribute('installed')) {
				actions.labels.status = 'En cours de suppression...';
			} else {
				actions.labels.status = 'En cours d\'installation...';
			}
		} else {
			if (pkg.getAttribute('installed')) {
				actions.labels.status = 'Install&eacute; le '+SoftwareCenter.getDate(pkg.getAttribute('installed_time'));
				actions.labels.action = 'Supprimer';
			} else {
				if (!pkg.getAttribute('checked')) {
					actions.labels.status = 'Non v&eacute;rifi&eacute;';
				} else {
					actions.labels.status = 'Disponible';
				}
				actions.labels.action = 'Installer';
			}
		}
		
		if (!pkg.isRunning()) {
			actions.action = $.w.button(actions.labels.action)
				.addClass('action-button')
				.click(function() {
					if (!pkg.getAttribute('managable')) {
						return;
					}
					
					if (!pkg.isRunning()) {
						if (pkg.getAttribute('installed')) {
							softwareCenter.remove(pkg);
						} else {
							softwareCenter.install(pkg);
						}
					} else {
						W.Error.trigger('Une op&eacute;ration sur ce paquet est d&eacute;j&agrave; en cours');
					}
				});
			if (!pkg.getAttribute('managable')) {
				actions.action.addClass('disabled');
			}
		} else {
			actions.action = $('<div></div>').addClass('loading');
		}
		
		return actions;
	};
	
	this.switchToView = function(view) { //Basculer vers une vue
		for (var key in this.views) {
			this.views[key].hide();
		}
		this.views[view].show();
	};
	
	this._header = $.w.buttonWindowHeader().appendTo(this.window.window('header'));
	var headerContent = this._header.buttonWindowHeader('content');
	
	$.w.buttonWindowHeaderItem('Logiciels', getHeaderImgDirFn()+'/packages.png')
		.buttonWindowHeaderItem('select')
		.click(function() {
			softwareCenter.displayHome();
		})
		.appendTo(headerContent);
	
	$.w.buttonWindowHeaderItem('Install&eacute;s', getHeaderImgDirFn()+'/installed.png')
		.click(function() {
			softwareCenter.displayInstalled();
		})
		.appendTo(headerContent);
	
	$.w.buttonWindowHeaderItem('Historique', getHeaderImgDirFn()+'/history.png')
		.click(function() {
			softwareCenter.displayHistory();
		})
		.appendTo(headerContent);
	
	$.w.windowHeaderSearch()
		.keyup(function() {
			var search = $(this).windowHeaderSearch('value');
			if (search == '') {
				softwareCenter.displayHome();
			} else {
				softwareCenter.search(search);
			}
		})
		.appendTo(headerContent);
	
	if (typeof pkg != 'undefined') {
		this.displayPackage(pkg);
	} else {
		this.displayHome();
	}
	
	this.window.window('open');
}

//Objet contenant le nom de code des categories et leur titre associe
SoftwareCenter.categories = {
	'accessories': 'Accessoires',
	'office': 'Bureautique',
	'graphics': 'Graphisme',
	'internet': 'Internet',
	'games': 'Jeux',
	'soundandvideo': 'Son et vid&eacute;o',
	'system': 'Syst&egrave;me'
};
SoftwareCenter.getHumanCategory = function(category) { //Recuperer le titre d'une categorie
	if(typeof SoftwareCenter.categories[category] == 'undefined') {
		return category;
	} else {
		return SoftwareCenter.categories[category];
	}
};
SoftwareCenter.getDate = function(timestamp) {
	var installedDate = new Date();
	installedDate.setTime(parseInt(timestamp) * 1000);
	var day = (installedDate.getUTCDate() < 10) ? '0'+installedDate.getUTCDate() : installedDate.getUTCDate();
	var month = (installedDate.getUTCMonth() < 10) ? '0'+installedDate.getUTCMonth() : installedDate.getUTCMonth();
	return day+'/'+month+'/'+installedDate.getUTCFullYear();
};