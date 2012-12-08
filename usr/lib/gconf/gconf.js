var thisProcess = W.Process.current();

function GConf(category) {
	Webos.Observable.call(this);

	var that = this;

	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;

		this._window = $.w.window.main({
			title: t.get('System settings'),
			resizable: false,
			icon: new W.Icon('apps/administration'),
			stylesheet: 'usr/share/css/gconf/main.css',
			width: 740
		});
		
		this._categories = undefined;
		
		this._showCategories = function(categories) {
			var list = $.w.iconsList().addClass('mainlist');
			this._window.window('content').html(list);
			this._window.window('dialog', false);

			var params = {};
			var catTitles = {
				'personal': t.get('Personal'),
				'system': t.get('System'),
				'other': t.get('Other')
			};
			
			var generateItemFn = function(data) {
				var icon = new W.Icon(data.icon);
				
				var item = $.w.iconsListItem(icon, data.title)
					.attr('title', data.description)
					.click(function() {
						that._window.window('option', 'title', data.title);
						that.category(data.name);
					});
				
				return item;
			};
			
			for (var i = 0; i < categories.length; i++) {
				var data = categories[i];
				var cat = data.category || 'other';

				if (!params[cat]) {
					params[cat] = $();
				}

				params[cat] = params[cat].add(generateItemFn(data));
			}

			for (var catName in params) {
				var catTitle = catName;

				if (catTitles[catName]) {
					catTitle = catTitles[catName];
				}

				list.append($.w.iconsListHeader(catTitle)).append(params[catName]);
			}
		};
		
		this.home = function() {
			this._window.window('option', 'title', t.get('System settings')).window('loading', false);
			this._buttons.home.hide();
			this._buttons.search.show();
			if (typeof this._categories != 'undefined') {
				this._showCategories(that._categories);
			} else {
				this._window.window('loading', true);
				W.File.listDir('/usr/lib/gconf/categories/xml/', new W.Callback(function(files) {
					var nbr = 0;
					for (var index in files) {
						nbr++;
					}
					
					that._categories = [];
					
					var i = 0;
					for (var index in files) {
						if (files[index].getAttribute('is_dir') == true || files[index].getAttribute('extension') != 'xml') {
							i++;
							continue;
						}
						new W.XMLFile(files[index].getAttribute('path'), new W.Callback(function(xml) {
							var shown = true;
							if (xml.find('define[name="authorizations"]').length > 0) {
								var auth = xml.find('define[name="authorizations"]').attr('value').split(';');
								for (var j = 0; j < auth.length; j++) {
									if (!thisProcess.getAuthorizations().can(auth[j])) {
										shown = false;
									}
								}
							}
							
							if (shown) {
								that._categories.push({
									name: xml.find('define[name="name"]').attr('value'),
									title: xml.find('define[name="title"]').attr('value'),
									icon: xml.find('define[name="icon"]').attr('value'),
									description: xml.find('define[name="description"]').attr('value'),
									category: xml.find('define[name="category"]').attr('value')
								});
							}
							
							if (nbr == i) {
								that._window.window('loading', false).window('center');
								that._showCategories(that._categories);
							}
						}));
						i++;
					}
				}, function(response) {
					response.triggerError(t.get('Unable to retrieve the settings list'));
				}));
			}
		};
		
		this.category = function(name) {
			this._window.window('content').empty();
			this._buttons.home.show();
			this._buttons.search.hide();
			include('usr/lib/gconf/categories/js/'+name+'.js', new W.Arguments({
				params: [that._window]
			}), thisProcess);
		};
		
		this.search = function(value) {
			var exp = new RegExp('('+value.replace(/\\/g, '\\\\').replace(/\s/g, '|')+')', 'i');
			
			var categoriesToShow = [];
			
			for (var i = 0; i < this._categories.length; i++) {
				(function(category) {
					for (var attribute in category) {
						var result = exp.exec(category[attribute]);
						if (result != null && result != '') {
							categoriesToShow.push(category);
							return;
						}
					}
				})(this._categories[i]);
			}
			
			this._showCategories(categoriesToShow);
		};
		
		var headers = this._window.window('header');
		
		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons = {};
		
		this._buttons.home = $.w.toolbarWindowHeaderItem(t.get('All settings'))
			.click(function() {
				that.home();
			})
			.appendTo(toolbar);
		this._buttons.search = $.w.windowHeaderSearch()
			.keyup(function() {
				that.search(that._buttons.search.windowHeaderSearch('value'));
			})
			.appendTo(toolbar);
		
		this._window.window('open');
		this.home();
		
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
}
GConf.prototype = {
	_translationsName: 'gconf'
};
Webos.inherit(GConf, Webos.Observable);
Webos.inherit(GConf, Webos.TranslatedLibrary);