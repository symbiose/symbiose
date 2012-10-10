new W.ScriptFile('usr/lib/apt/apt.js'); //On charge la bibliotheque JS d'APT

/**
 * SoftwareCenter represente une logitheque.
 * @param pkg Le paquet a efficher des l'ouverture de la logitheque.
 * @author $imon
 * @version 2.4
 */
var SoftwareCenter = function SoftwareCenter(pkg) {
	var softwareCenter = this;
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;

		this.views = {};
		
		this.window = $.w.window({
			title: t.get('Software center'),
			icon: new W.Icon('applications/software-center'),
			width: 650,
			height: 250,
			stylesheet: 'usr/share/css/software-center/main.css'
		});
		
		this.displayPackage = function(name) { //Afficher un paquet
			this.window.window('loading', true); //La fenetre est en cours de chargement
			
			W.Package.get(name, new W.Callback(function(pkg) {
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
					var version = $('<li></li>').html('<strong>'+t.get('Version')+'</strong> : ').appendTo(infobox);
					softwareCenter.detail.version = $('<span></span>').appendTo(version);
					var size = $('<li></li>').html('<strong>'+t.get('Size')+'</strong> : ').appendTo(infobox);
					softwareCenter.detail.size = $('<span></span>').appendTo(size);
					var maintainer = $('<li></li>').html('<strong>'+t.get('Updates')+'</strong> : ').appendTo(infobox);
					softwareCenter.detail.maintainer = $('<span></span>').appendTo(maintainer);
					var releaseDate = $('<li></li>').html('<strong>'+t.get('Publication date')+'</strong> : ').appendTo(infobox);
					softwareCenter.detail.releaseDate = $('<span></span>').appendTo(releaseDate);
					$('<div></div>', { 'class': 'separator' }).appendTo(softwareCenter.views.detail);
				}
				
				softwareCenter.detail.pkgName = pkg.codename();
				
				softwareCenter.detail.title.html(pkg.get('name'));
				softwareCenter.detail.shortDescription.html(pkg.get('shortdescription'));
				softwareCenter.detail.description.html(pkg.get('description'));
				softwareCenter.detail.version.html(pkg.get('version'));
				softwareCenter.detail.size.html(t.get('${pkgSize} to download, ${installedSize} once installed', { pkgSize: W.File.bytesToSize(pkg.get('packagesize')), installedSize: W.File.bytesToSize(pkg.get('installedsize')) }));
				softwareCenter.detail.maintainer.html(pkg.get('maintainer'));
				softwareCenter.detail.releaseDate.html(SoftwareCenter.getDate(pkg.get('lastupdate')));
				var actions = softwareCenter._getActions(pkg);
				softwareCenter.detail.button.remove();
				softwareCenter.detail.button = actions.action.appendTo(softwareCenter.detail.actionBox);
				softwareCenter.detail.state.html(actions.labels.status);
				
				var icon = pkg.get('icon');
				if (!icon) {
					icon = 'usr/share/images/software-center/package.png';
				}
				softwareCenter.detail.icon.attr('src', icon);
				
				softwareCenter.window.window('loading', false); //Le chargement est termine
			}, function(response) {
				softwareCenter.window.window('loading', false); //Le chargement est termine
				response.triggerError(t.get('The package "${name}" can\'t be found', { name: name }));
			}));
		};
		
		this.displayPackageList = function(list, filter) { //Afficher une liste de paquets
			if (typeof this.views.list != 'undefined') {
				this.views.list.empty();
			} else {
				this.views.list = $.w.container().addClass('list');
			}
			
			if (typeof filter == 'undefined') {
				filter = 'name';
			}
			
			this.list = {};
			this.list.packages = {};
			
			var generatePackageItemFn = function(pkg) {
				softwareCenter.list.packages[pkg.codename()] = {
					pkg: pkg
				};
				var item = $.w.listItem();
				var itemContent = item.listItem('addColumn');
				
				softwareCenter.list.packages[pkg.codename()].item = item;
				
				var icon = pkg.get('icon');
				if (!icon) {
					icon = 'usr/share/images/software-center/package.png';
				}
				itemContent.append('<img src="'+icon+'" class="icon"/>');
				itemContent.append('<span class="name">'+pkg.get('name')+'</span><br /><span class="shortdescription">'+pkg.get('shortdescription')+'</span><br />');
				var more = $('<span></span>')
					.addClass('more')
					.appendTo(itemContent);
				
				$.w.button(t.get('More informations'))
					.click(function() {
						softwareCenter.displayPackage(pkg.codename());
					})
					.appendTo(more);
				
				var actions = softwareCenter._getActions(pkg);
				
				softwareCenter.list.packages[pkg.codename()].actionButton = actions.action.appendTo(more);
				
				item.bind('listitemselect', function() {
					more.show();
				});
				item.bind('listitemunselect', function() {
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
						return t.get('News');
					case 'installed_time':
						return t.get('Recently installed');
					default:
						return t.get('All software');
				}
			};
			
			var orderedList = {};
			var i = 0;
			for (var name in list) {
				var pkg = list[name];
				
				var category = getFilterCategoryFn(pkg.get(filter));
				
				var item = generatePackageItemFn(pkg);
				
				if (typeof orderedList[category] == 'undefined') {
					orderedList[category] = [];
				}
				
				orderedList[category].push(item);
				
				i++;
			}
			
			var nbrCategories = 0;
			for (var cat in orderedList) {
				nbrCategories++;
			}
			
			if (i == 0) {
				var label = $.w.label()
					.addClass('empty')
					.html(t.get('Empty'))
					.appendTo(this.views.list.container('content'));
			} else if (nbrCategories == 1) {
				for (var category in orderedList) {}
				$('<h1></h1>').html(category).appendTo(this.views.list);
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
				softwareCenter.reinitSearch();
				softwareCenter.displayPackageList(list, 'category');
				softwareCenter.window.window('loading', false); //Le chargement est termine
			}, function(response) {
				softwareCenter.window.window('loading', false);
				response.triggerError();
			});
			
			W.Package.getFromCategory(category, callback);
		};
		
		this.displayLastPackages = function() { //Afficher les 30 derniers paquets parus
			this.window.window('loading', true); //La fenetre est en cours de chargement
			
			var callback = new W.Callback(function(list) {
				softwareCenter.reinitSearch();
				softwareCenter.displayPackageList(list, 'lastupdate');
				softwareCenter.window.window('loading', false); //Le chargement est termine
			}, function(response) {
				softwareCenter.window.window('loading', false);
				response.triggerError();
			});
			
			W.Package.getLastPackages(30, callback);
		};
		
		this.displayInstalled = function() { //Afficher les paquets installes
			this.window.window('loading', true); //La fenetre est en cours de chargement
			
			var callback = new W.Callback(function(list) {
				softwareCenter.reinitSearch();
				softwareCenter.displayPackageList(list, 'category');
				softwareCenter.window.window('loading', false); //Le chargement est termine
			}, function(response) {
				softwareCenter.window.window('loading', false);
				response.triggerError();
			});
			
			W.Package.getInstalled(callback);
		};
		
		this.displayHistory = function() {
			this.window.window('loading', true); //La fenetre est en cours de chargement
			
			var callback = new W.Callback(function(list) {
				softwareCenter.reinitSearch();
				softwareCenter.displayPackageList(list, 'installed_time');
				softwareCenter.window.window('loading', false); //Le chargement est termine
			}, function(response) {
				softwareCenter.window.window('loading', false);
				response.triggerError();
			});
			
			W.Package.getLastInstalled(30, callback);
		};
		
		this._search = {};
		this.search = function(search) {
			this.window.window('loading', true); //La fenetre est en cours de chargement
			
			if (this.view == 'list' || this.view == 'detail') {
				if (!this._search.packages) {
					this._search.packages = this.list.packages;
				}
				
				var list = {};
				
				var queries = search.toLowerCase().split(/,\s*/g);

				for (var i = 0; i < queries.length; i++) {
					var words = queries[i].split(/[\s,]+/g);
					queries[i] = words;
				}
				
				for (var codename in this._search.packages) {
					var pkgFound = false, pkg = this._search.packages[codename].pkg, data = pkg.data();
					
					for (var key in data) {
						var value = data[key];
						
						if (typeof value != 'string') {
							continue;
						}
						
						for (var i = 0; i < queries.length; i++) {
							var wordNotFound = false, words = queries[i];
							for (var j = 0; j < words.length; j++) {
								if (value.toLowerCase().indexOf(words[j]) == -1) {
									wordNotFound = true;
									break;
								}
							}
							if (wordNotFound) {
								continue;
							}
							
							list[codename] = pkg;
							pkgFound = true;
							break;
						}
						
						if (pkgFound) {
							break;
						}
					}
					
					if (pkgFound) {
						continue;
					}
				}
				
				softwareCenter.displayPackageList(list);
				softwareCenter.window.window('loading', false);
			} else {
				var callback = new W.Callback(function(list) {
					softwareCenter._search.packages = null;
					softwareCenter.displayPackageList(list);
					softwareCenter.window.window('loading', false); //Le chargement est termine
				}, function(response) {
					softwareCenter.window.window('loading', false);
					response.triggerError();
				});
				
				W.Package.searchPackages(search, callback);
			}
		};
		this.reinitSearch = function() {
			this._search.packages = null;
			this._searchEntry.windowHeaderSearch('value', '');
		};
		
		this.displayHome = function() { //Afficher l'accueil
			this.reinitSearch();
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
				var button = $.w.button(t.get('More'))
					.click(function() {
						softwareCenter.displayLastPackages();
					})
					.appendTo(softwareCenter.home.whatsnew);
				$('<span></span>')
					.html(t.get('What\'s new ?'))
					.addClass('title')
					.appendTo(softwareCenter.home.whatsnew);
				
				var generatePackageItemFn = function(pkg) {
					var item = $('<li></li>');
					
					var icon = pkg.get('icon');
					if (!icon) {
						icon = 'usr/share/images/software-center/package.png';
					}
					
					item.append($('<img />', { 'src': icon, 'class': 'icon' }));
					item.append('<span class="name">'+pkg.get('name')+'</span><br /><span class="category">'+SoftwareCenter.getHumanCategory(pkg.get('category'))+'</span>');
					item.click(function() {
						softwareCenter.displayPackage(pkg.codename());
					});
					
					return item;
				};
				
				var i = 0, list = $();
				for (var pkg in packages) {
					if (i > 8) {
						break;
					}
					if (i % 4 == 0) {
						list = $('<ul></ul>');
						softwareCenter.home.whatsnew.append(list);
					}
					
					var item = generatePackageItemFn(packages[pkg]);
					
					list.append(item);
					
					i++;
				}
				
				var menu = $('<ul></ul>').appendTo(softwareCenter.home.menu);
				
				var categories = W.Package.categories();
				for (var cat in categories) {
					(function(name, title) {
						var item = $('<li></li>').html(title);
						item.click(function() {
							softwareCenter.displayCategory(name);
						});
						menu.append(item);
					})(cat, categories[cat]);
				}
				
				softwareCenter.window.window('loading', false); //Le chargement est termine
			});
			
			W.Package.getLastPackages(8, callback);
			
			this.window.window('content').append(this.views.home);
			
			this.switchToView('home');
		};
		
		this.install = function(pkg) {
			var callback = new W.Callback(function(response) {
				softwareCenter._updateLoadingPackage(pkg);
			}, function(response) {
				softwareCenter._updateLoadingPackage(pkg);
				response.triggerError(t.get('Can\'t install package "${codeName}"', { codeName: pkg.get('codename') }));
			});
			
			pkg.install(callback);
			
			this._updateLoadingPackage(pkg);
		};
		
		this.remove = function(pkg) {
			var callback = new W.Callback(function(response) {
				softwareCenter._updateLoadingPackage(pkg);
			}, function(response) {
				softwareCenter._updateLoadingPackage(pkg);
				response.triggerError(t.get('Can\'t remove package "${codeName}"', { codeName: pkg.get('codename') }));
			});
			
			pkg.remove(callback);
			
			this._updateLoadingPackage(pkg);
		};
		
		var getHeaderImgDirFn = function() {
			var baseDir = 'usr/share/images/software-center/header', supportedThemes = ['ambiance', 'adwaita'];
			if (jQuery.inArray(Webos.Theme.current().get('desktop'), supportedThemes) != -1) {
				return baseDir+'/'+Webos.Theme.current().get('desktop');
			} else {
				return baseDir+'/'+supportedThemes[0];
			}
		};
		
		this._updateLoadingPackage = function(pkg) {
			var actions = this._getActions(pkg);
			
			if (typeof this.detail != 'undefined' && this.detail.pkgName == pkg.get('codename')) {
				this.detail.state.html(actions.labels.status);
				this.detail.button.replaceWith(actions.action);
				this.detail.button = actions.action;
			}
			
			if (typeof this.list != 'undefined' && typeof this.list.packages[pkg.get('codename')] != 'undefined') {
				this.list.packages[pkg.get('codename')].actionButton.replaceWith(actions.action);
				this.list.packages[pkg.get('codename')].actionButton = actions.action;
			}
			
			if (typeof this.runningPkgs == 'undefined') {
				this.runningPkgs = {};
			}
			if (pkg.isRunning()) {
				this.runningPkgs[pkg.get('codename')] = pkg;
				if (typeof this._headerLoadingButton == 'undefined') {
					this._headerLoadingButton = $.w.buttonWindowHeaderItem(t.get('In progress'), getHeaderImgDirFn()+'/loading.gif')
						.click(function() {
							softwareCenter.displayPackageList(softwareCenter.runningPkgs);
						})
						.appendTo(this._header.buttonWindowHeader('content'));
				}
			} else {
				if (typeof this.runningPkgs[pkg.get('codename')] != 'undefined') {
					delete this.runningPkgs[pkg.get('codename')];
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
				if (pkg.get('installed')) {
					actions.labels.status = t.get('Removal in progress...');
				} else {
					actions.labels.status = t.get('Installation in progress...');
				}
			} else {
				if (pkg.get('installed')) {
					actions.labels.status = t.get('Installed on ${installedTime}', { installedTime: SoftwareCenter.getDate(pkg.get('installed_time')) });
					actions.labels.action = t.get('Remove');
				} else {
					if (!pkg.get('checked')) {
						actions.labels.status = t.get('Unchecked');
					} else {
						actions.labels.status = t.get('Available');
					}
					actions.labels.action = t.get('Install');
				}
			}
			
			if (!pkg.isRunning()) {
				actions.action = $.w.button(actions.labels.action)
					.addClass('action-button')
					.click(function() {
						if (!pkg.get('managable')) {
							return;
						}
						
						if (!pkg.isRunning()) {
							if (pkg.get('installed')) {
								softwareCenter.remove(pkg);
							} else {
								softwareCenter.install(pkg);
							}
						} else {
							W.Error.trigger(t.get('An operation on this package is already underway'));
						}
					});
				if (!pkg.get('managable')) {
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
			this.view = view;
		};
		
		this._header = $.w.buttonWindowHeader().appendTo(this.window.window('header'));
		var headerContent = this._header.buttonWindowHeader('content');
		
		$.w.buttonWindowHeaderItem(t.get('Software'), getHeaderImgDirFn()+'/packages.png')
			.buttonWindowHeaderItem('select')
			.click(function() {
				softwareCenter.displayHome();
			})
			.appendTo(headerContent);
		
		$.w.buttonWindowHeaderItem(t.get('Installed'), getHeaderImgDirFn()+'/installed.png')
			.click(function() {
				softwareCenter.displayInstalled();
			})
			.appendTo(headerContent);
		
		$.w.buttonWindowHeaderItem(t.get('History'), getHeaderImgDirFn()+'/history.png')
			.click(function() {
				softwareCenter.displayHistory();
			})
			.appendTo(headerContent);
		
		var keypressTimer = false;
		this._searchEntry = $.w.windowHeaderSearch()
			.keyup(function() {
				var search = $(this).windowHeaderSearch('value');
				
				if (keypressTimer !== false) {
					clearTimeout(keypressTimer);
				}
				
				if (!search) {
					softwareCenter.displayHome();
				} else {
					keypressTimer = setTimeout(function() {
						keypressTimer = false;
						softwareCenter.search(search);
					}, 500);
				}
			})
			.appendTo(headerContent);
		
		if (typeof pkg != 'undefined') {
			this.displayPackage(pkg);
		} else {
			this.displayHome();
		}
		
		this.window.window('open');
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
};
SoftwareCenter.prototype = {
	_translationsName: 'software-center'
};

Webos.inherit(SoftwareCenter, Webos.Observable);
Webos.inherit(SoftwareCenter, Webos.TranslatedLibrary);

SoftwareCenter.getHumanCategory = function(category) { //Recuperer le titre d'une categorie
	if(W.Package.categories()[category]) {
		return W.Package.categories()[category];
	} else {
		return category;
	}
};
SoftwareCenter.getDate = function(timestamp) {
	var installedDate = new Date();
	installedDate.setTime(parseInt(timestamp) * 1000);
	return Webos.Locale.current().date(installedDate).toLowerCase();
};