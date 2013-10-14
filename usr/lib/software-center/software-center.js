Webos.require([
	'/usr/lib/apt/apt.js',
	'/usr/lib/firefox-marketplace/webos.js'
], function() {
	var thisProcess = W.Process.current(), permissions = {
		managePackages: true
	};
	if (thisProcess) {
		permissions.managePackages = thisProcess.getAuthorizations().can('package.manage');
	}

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

			this._views = {};
			
			this._window = $.w.window.main({
				title: t.get('Software center'),
				icon: new W.Icon('applications/software-center'),
				width: 650,
				height: 250,
				stylesheet: 'usr/share/css/software-center/main.css'
			});
			
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
				if (pkg.get('operationPending')) {
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

			var getHeaderImgDirFn = function() {
				var baseDir = 'usr/share/images/software-center/header', supportedThemes = ['ambiance', 'adwaita'];
				if (jQuery.inArray(Webos.Theme.current().get('desktop'), supportedThemes) != -1) {
					return baseDir+'/'+Webos.Theme.current().get('desktop');
				} else {
					return baseDir+'/'+supportedThemes[0];
				}
			};

			this._header = $.w.buttonWindowHeader().appendTo(this._window.window('header'));
			var headerContent = this._header.buttonWindowHeader('content');
			
			$.w.windowHeaderItem($.w.button('<').click(function() {
				softwareCenter.previousView();
			}),
			$.w.button('>').click(function() {
				softwareCenter.nextView();
			})).appendTo(headerContent);

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
			
			this._window.window('open');
			this.notify('ready');
		});
		
		Webos.TranslatedLibrary.call(this);
	};
	SoftwareCenter.prototype = {
		_translationsName: 'software-center',
		_views: {},
		_viewsData: {},
		_categories: {},
		_history: [],
		_historyCurrentView: null,
		_getActions: function (pkg) {
			var that = this, t = this._translations;

			var actions = {
				labels: {},
				action: $('<div></div>')
			};

			if (pkg.get('operationPending')) {
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
					actions.labels.status = t.get('Available');
					if (pkg.get('runnable')) {
						actions.labels.action = t.get('Run');
					} else if (pkg.get('installable')) {
						actions.labels.action = t.get('Install');
					} else {
						actions.labels.action = '';
						actions.labels.status = t.get('This app is not compatible with your platform.');
					}
				}
			}
			
			if (!pkg.get('operationPending')) {
				if (pkg.get('installed')) {
					if (permissions.managePackages) {
						$.w.button(t.get('Remove'))
							.addClass('action-button')
							.click(function() {
								if (!pkg.get('operationPending')) {
									pkg.remove([function() {}, function(res) {
										that._triggerError(res.getError());
									}]);
								} else {
									that._triggerError(new W.Error(t.get('An operation on this package is already underway')));
								}
							})
							.appendTo(actions.action);
					}
				} else {
					if (pkg.get('runnable')) {
						$.w.button(t.get('Run'))
							.addClass('action-button')
							.click(function() {
								if (!pkg.get('operationPending')) {
									pkg.run([function() {}, function(res) {
										that._triggerError(res.getError());
									}]);
								} else {
									that._triggerError(new W.Error(t.get('An operation on this package is already underway')));
								}
							})
							.appendTo(actions.action);
					}
					if (pkg.get('installable') && permissions.managePackages) {
						$.w.button(t.get('Install'))
							.addClass('action-button')
							.click(function() {
								if (!pkg.get('operationPending')) {
									pkg.install([function() {}, function(res) {
										that._triggerError(res.getError());
									}]);
								} else {
									that._triggerError(new W.Error(t.get('An operation on this package is already underway')));
								}
							})
							.appendTo(actions.action);
					}
				}
			} else {
				$('<div></div>').addClass('loading').appendTo(actions.action);
			}
			
			return actions;
		},
		_switchToView: function (view, data) {
			for (var key in this._views) {
				this._views[key].hide();
			}
			this._views[view].show();
			this._view = view;

			this._viewsData[view] = data;
		},
		switchToView: function (view, data) { //Basculer vers une vue
			this._switchToView(view, data);

			if (this._historyCurrentView != this._history.length - 1) {
				this._history = this._history.slice(0, this._historyCurrentView + 1);
			}

			var historyLength = this._history.push({
				name: view,
				data: data
			});
			this._historyCurrentView = historyLength - 1;
		},
		viewData: function (view) {
			return this._viewsData[view];
		},
		previousView: function () {
			if (this._historyCurrentView <= 0) {
				return;
			}

			this._historyCurrentView--;

			var view = this._history[this._historyCurrentView];
			this._switchToView(view.name, view.data);
		},
		nextView: function () {
			if (this._historyCurrentView >= this._history.length - 1) {
				return;
			}

			this._historyCurrentView++;

			var view = this._history[this._historyCurrentView];
			this._switchToView(view.name, view.data);
		},
		_triggerError: function (error) {
			if (typeof this._views.error == 'undefined') {
				this._views.error = $.w.container().addClass('error');

				$.w.image(new W.Icon('status/error', 48)).addClass('error-icon').appendTo(this._views.error);
				$('<h1></h1>').html('Erreur').appendTo(this._views.error);
				$('<p></p>').appendTo(this._views.error);

				this._window.window('content').append(this._views.error);
			}

			this._views.error.find('p').html((error.html) ? error.html.message : error.message);

			this.switchToView('error');
		},
		displayHome: function $_SoftwareCenter_displayHome() { //Afficher l'accueil
			var that = this, t = this._translations;

			if (typeof this._views.home != 'undefined') {
				this.switchToView('home');
				return;
			}

			this._views.home = $.w.container().addClass('home');

			this.home = {};

			this.reinitSearch();

			this._window.window('loading', true);

			var loadedParts = 0, partsToLoad = 3;
			var partLoaded = function() {
				loadedParts++;

				if (loadedParts >= partsToLoad) {
					that._window.window('loading', false);
				} else {
					that._window.window('loading', true, {
						lock: false
					});
				}
			};

			var displayPkgsList = function(packages, container) {
				Webos.Package.categories([function (categories) {
					var list = $();
					for (var i = 0; i < packages.length; i++) {
						var pkg = packages[i];

						if (i > 8) {
							break;
						}
						if (i % 4 == 0) {
							list = $('<ul></ul>');
							container.append(list);
						}
						
						var item = (function(pkg) {
							var item = $('<li></li>');

							var imgUrl = pkg.get('icon');
							if (!imgUrl) {
								imgUrl = W.File.get('/usr/share/images/software-center/package.png').get('realpath');
							}
							var img = $.w.image(imgUrl, pkg.get('title')).addClass('icon');
							item.append(img);

							item.append('<span class="name">'+pkg.get('title')+'</span><br /><span class="category">'+(categories[pkg.get('category')] || '')+'</span>');
							item.click(function() {
								that.displayPackage(pkg);
							});
							
							return item;
						})(pkg);
						
						list.append(item);
					}
				}, function(res) {
					that._triggerError(res.getError());
				}]);
			};

			W.Package.getLastPackages(8, [function(packages) {
				that.home.whatsnew = $.w.container()
					.addClass('box')
					.appendTo(that._views.home);
				var button = $.w.button(t.get('More'))
					.click(function() {
						that.displayLastPackages();
					})
					.appendTo(that.home.whatsnew);
				$('<span></span>')
					.html(t.get('What\'s new ?'))
					.addClass('title')
					.appendTo(that.home.whatsnew);

				displayPkgsList(packages, that.home.whatsnew);

				partLoaded();
				that.home.whatsnew.hide().fadeIn('fast');
			}, function(res) {
				partLoaded();
				that._triggerError(res.getError());
			}]);

			W.Package.getFeaturedPackages(8, [function(packages) {
				that.home.featured = $.w.container()
					.addClass('box')
					.appendTo(that._views.home);
				$('<span></span>')
					.html(t.get('Featured apps'))
					.addClass('title')
					.appendTo(that.home.featured);

				displayPkgsList(packages, that.home.featured);

				partLoaded();
				that.home.featured.hide().fadeIn('fast');
			}, function(res) {
				partLoaded();
				that._triggerError(res.getError());
			}]);

			Webos.Package.categories([function(categories) {
				that.home.menu = $.w.container()
					.addClass('menu')
					.prependTo(that._views.home);

				var menu = $('<ul></ul>').appendTo(that.home.menu);

				for (var cat in categories) {
					(function(name, title) {
						var item = $('<li></li>').html(title);
						item.click(function() {
							that.displayCategory(name);
						});
						menu.append(item);
					})(cat, categories[cat]);
				}
				
				partLoaded();
				that.home.menu.hide().fadeIn('fast');
			},function(res) {
				partLoaded();
				that._triggerError(res.getError());
			}]);

			this._window.window('content').append(this._views.home);
			
			this.switchToView('home');
		},
		displayPackageList: function $_SoftwareCenter_displayPackageList(list, filter, filterValue) { //Afficher une liste de paquets
			var that = this, t = this._translations;

			var insertView = false;
			if (typeof this._views.list != 'undefined') {
				this._views.list.empty();
			} else {
				this._views.list = $.w.container().addClass('list');
				insertView = true;
			}

			if (typeof filter == 'undefined') {
				filter = 'name';
			}

			var categories = {};

			var displayList = function() {
				var getFilterCategory = function(value) {
					switch(filter) {
						case 'category':
							return categories[value];
						case 'lastupdate':
							return t.get('News');
						case 'installed_time':
							return t.get('Recently installed');
						default:
							return t.get('All software');
					}
				};

				var $images = $();
				
				var orderedList = {};
				for (var i = 0; i < list.length; i++) {
					var pkg = list[i];

					var category = getFilterCategory((typeof filterValue == 'undefined') ? pkg.get(filter) : filterValue);

					var item = (function(pkg) {
						var item = $.w.listItem();
						var itemContent = item.listItem('addColumn');
						
						var imgUrl = pkg.get('icon');
						if (!imgUrl) {
							imgUrl = 'usr/share/images/software-center/package.png';
						}
						var img = $.w.image(imgUrl, pkg.get('name'), false).addClass('icon');
						img.image('option', {
							animate: true,
							parent: that._views.list
						});
						$images = $images.add(img);
						itemContent.append(img);

						itemContent.append('<span class="name">'+pkg.get('title')+'</span><br /><span class="shortdescription">'+pkg.get('shortdescription')+'</span><br />');
						var more = $('<span></span>')
							.addClass('more')
							.appendTo(itemContent);


						var actions = that._getActions(pkg);
						actions.action.appendTo(more);

						var updatePkgStatus = function updatePkgStatus() {
							actions.action.remove();
							actions = that._getActions(pkg);
							actions.action.prependTo(more);
						};

						pkg.bind('installstart.software-center installcomplete.software-center removestart.software-center removecomplete.software-center', function() {
							updatePkgStatus();
						});
						
						$.w.button(t.get('More information'))
							.click(function() {
								that.displayPackage(pkg);
							})
							.appendTo(more);
						
						item.bind('listitemselect', function() {
							more.show();
						});
						item.bind('listitemunselect', function() {
							more.hide();
						});
						
						more.hide();
						
						return item;
					})(pkg);
					
					if (typeof orderedList[category] == 'undefined') {
						orderedList[category] = $();
					}
					
					orderedList[category] = orderedList[category].add(item);
				}
				
				var nbrCategories = 0, lastCategory;
				for (var cat in orderedList) {
					nbrCategories++;
				}
				lastCategory = cat;
				
				if (list.length == 0) {
					var label = $.w.label()
						.addClass('empty')
						.html(t.get('Empty'))
						.appendTo(that._views.list.container('content'));
				} else if (nbrCategories == 1) {
					$('<h1></h1>').html(lastCategory).appendTo(that._views.list);
					var $list = $.w.list();
					$list.list('content').append(orderedList[lastCategory]);
					$list.appendTo(that._views.list);
				} else {
					var nbrCategories = 0;
					for (var category in orderedList) {
						var spoiler = $.w.spoiler(category).appendTo(that._views.list);
						var $list = $.w.list();
						$list.list('content').append(orderedList[category]);
						$list.appendTo(spoiler.spoiler('content'));
						if (nbrCategories == 0) {
							spoiler.spoiler('option', 'shown', true);
						}
						nbrCategories++;
					}
				}

				if (insertView) {
					that._window.window('content').append(that._views.list);
				}
				
				that.switchToView('list', { packages: list, filter: filter });

				$images.image('load');
			};

			if (filter == 'category') {
				this._window.window('loading', true);

				Webos.Package.categories([function (cats) {
					that._window.window('loading', false);
					categories = cats;
					displayList();
				}, function(res) {
					that._triggerError(res.getError());
				}]);
			} else {
				displayList();
			}
		},
		displayCategory: function $_SoftwareCenter_displayCategory(category) { //Afficher une categorie
			var that = this;

			this._window.window('loading', true); //La fenetre est en cours de chargement
			
			W.Package.getFromCategory(category, [function(list) {
				that._window.window('loading', false);

				that.reinitSearch();
				that.displayPackageList(list, 'category', category);
			}, function(res) {
				that._window.window('loading', false);
				that._triggerError(res.getError());
			}]);
		},
		displayLastPackages: function $_SoftwareCenter_displayLastPackages() { //Afficher les 30 derniers paquets parus
			var that = this;

			this._window.window('loading', true); //La fenetre est en cours de chargement
			
			W.Package.getLastPackages(30, [function(list) {
				that._window.window('loading', false);

				that.reinitSearch();
				that.displayPackageList(list, 'lastupdate');
			}, function(res) {
				that._window.window('loading', false);
				that._triggerError(res.getError());
			}]);
		},
		displayInstalled: function $_SoftwareCenter_displayInstalled() { //Afficher tous les paquets installes
			var that = this;

			this._window.window('loading', true); //La fenetre est en cours de chargement
			
			W.Package.getInstalled([function(list) {
				that._window.window('loading', false);

				that.reinitSearch();
				that.displayPackageList(list, 'category');
			}, function(res) {
				that._window.window('loading', false);
				that._triggerError(res.getError());
			}]);
		},
		displayHistory: function $_SoftwareCenter_displayHistory() { //Afficher les 30 derniers paquets installes
			var that = this;

			this._window.window('loading', true); //La fenetre est en cours de chargement
			
			W.Package.getLastInstalled(30, [function(list) {
				that._window.window('loading', false);

				that.reinitSearch();
				that.displayPackageList(list, 'installed_time');
			}, function(res) {
				that._window.window('loading', false);
				that._triggerError(res.getError());
			}]);
		},
		_search: {},
		search: function $_SoftwareCenter_search(search) {
			var that = this;

			this._window.window('loading', true); //La fenetre est en cours de chargement

			if (this.view == 'list' || this.view == 'detail') {
				if (!this._search.packages) {
					this._search.packages = this.viewData('list').packages;
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

				that._window.window('loading', false);

				that.displayPackageList(list);
			} else {
				W.Package.searchPackages(search, [function(list) {
					that._window.window('loading', false);

					that._search.packages = null;
					that.displayPackageList(list);
				}, function(res) {
					that._window.window('loading', false);
					that._triggerError(res.getError());
				}]);
			}
		},
		reinitSearch: function $_SoftwareCenter_reinitSearch() {
			this._search.packages = null;
			this._searchEntry.windowHeaderSearch('value', '');
		},
		displayPackage: function $_SoftwareCenter_displayPackage(name) { //Afficher un paquet
			var that = this, t = this._translations;

			this._window.window('loading', true);

			W.Package.get(name, [function(pkg) {
				if (typeof that._views.detail == 'undefined') {
					that._views.detail = $.w.container();
					that._views.detail.addClass('package-details');
					
					that._window.window('content').append(that._views.detail);
				}

				var viewData = that.viewData('detail');
				if (!viewData) {
					viewData = {};

					var header = $('<div></div>', { 'class': 'header' }).appendTo(that._views.detail);
					viewData.icon = $('<img />').addClass('icon').appendTo(header);
					viewData.title = $('<h1></h1>').appendTo(header);
					viewData.shortDescription = $('<span></span>').addClass('detail').appendTo(header);
					viewData.actionBox = $('<div></div>').addClass('action-box').appendTo(that._views.detail);
					viewData.state = $('<span></span>', { 'class': 'state' }).appendTo(viewData.actionBox);
					viewData.buttons = $('<div></div>').appendTo(viewData.actionBox);
					viewData.description = $('<p></p>').addClass('description').appendTo(that._views.detail);
					$('<div></div>', { 'class': 'separator' }).appendTo(that._views.detail);
					var infobox = $('<ul></ul>', { 'class': 'info-box' }).appendTo(that._views.detail);
					var version = $('<li></li>').html('<strong>'+t.get('Version')+'</strong> : ').appendTo(infobox);
					viewData.version = $('<span></span>').appendTo(version);
					viewData.sizeContainer = $('<li></li>').html('<strong>'+t.get('Size')+'</strong> : ').appendTo(infobox);
					viewData.size = $('<span></span>').appendTo(viewData.sizeContainer);
					var author = $('<li></li>').html('<strong>'+t.get('Updates')+'</strong> : ').appendTo(infobox);
					viewData.author = $('<span></span>').appendTo(author);
					viewData.releaseDateContainer = $('<li></li>').html('<strong>'+t.get('Publication date')+'</strong> : ').appendTo(infobox);
					viewData.releaseDate = $('<span></span>').appendTo(viewData.releaseDateContainer);
					$('<div></div>', { 'class': 'separator' }).appendTo(that._views.detail);
				}

				that.switchToView('detail', viewData);

				viewData.pkgName = pkg.get('codename');
				viewData.pkg = pkg;
				var actions = that._getActions(pkg);

				viewData.title.html(pkg.get('title'));
				viewData.shortDescription.html(pkg.get('shortdescription'));
				viewData.description.html(pkg.get('description'));
				viewData.version.html(pkg.get('version'));
				if (pkg.get('packagesize')) {
					viewData.sizeContainer.show();
					viewData.size.html(t.get('${pkgSize} to download, ${installedSize} once installed', { pkgSize: W.File.bytesToSize(pkg.get('packagesize')), installedSize: W.File.bytesToSize(pkg.get('installedsize')) }));
				} else {
					viewData.sizeContainer.hide();
				}
				viewData.author.html(pkg.get('author'));
				if (pkg.get('lastupdate')) {
					viewData.releaseDateContainer.show();
					viewData.releaseDate.html(SoftwareCenter.getDate(pkg.get('lastupdate')));
				} else {
					viewData.releaseDateContainer.hide();
				}
				viewData.buttons.remove();

				var updatePkgStatus = function() {
					viewData.buttons.remove();

					actions = that._getActions(pkg);
					viewData.buttons = actions.action.prependTo(viewData.actionBox);
					viewData.state.html(actions.labels.status);
				};

				pkg.bind('installstart.software-center installcomplete.software-center removestart.software-center removecomplete.software-center', function() {
					updatePkgStatus();
				});
				updatePkgStatus();

				var icon = pkg.get('icon');
				if (!icon) {
					icon = 'usr/share/images/software-center/package.png';
				}
				viewData.icon.attr('src', icon);

				that._window.window('loading', false);
			}, function(res) {
				that._window.window('loading', false);
				that._triggerError(res.getError());
			}]);
		}
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

	window.SoftwareCenter = SoftwareCenter;
});