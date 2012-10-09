new W.ScriptFile('/usr/lib/apt/apt.js'); //On charge la bibliotheque JS d'APT

/**
 * UpdateManager represente un gestionnaire de mises a jour.
 * @author $imon
 * @version 1.1
 */
function UpdateManager() {
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;
	
		this.updates = {};
		
		this.window = $.w.window({
			title: t.get('Update manager'),
			icon: new W.Icon('apps/update-manager'),
			width: 600,
			stylesheet: 'usr/share/css/update-manager/main.css',
			resizable : false
		});
		
		var windowContent = this.window.window('content');
		
		this.components = {};
		
		$('<div></div>').addClass('upgrade-icon').appendTo(windowContent);
		this.components.title = $('<strong></strong>').html(t.get('Update manager')).appendTo(windowContent);
		windowContent.append('<br />');
		this.components.msg = $.w.label().appendTo(windowContent);
		this.components.list = $.w.container().addClass('list').appendTo(windowContent);
		this.components.info = $.w.label().appendTo(windowContent);
		this.components.buttons = {};
		var buttonContainer = $.w.buttonContainer().appendTo(windowContent);
		this.components.buttons.check = $.w.button(t.get('Check')).click(function() {
			that.checkUpdates();
		}).appendTo(buttonContainer);
		this.components.buttons.upgrade = $.w.button(t.get('Install updates')).click(function() {
			that.installUpdates();
		}).appendTo(buttonContainer);
		this.components.buttons.close = $.w.button(t.get('Close')).click(function() {
			that.window.window('close');
		}).appendTo(buttonContainer);
		
		this.displayUpdates = function() {
			this.window.window('loading', true, {
				message: t.get('Loading updates list...')
			});
			
			this.updates = {};
			
			W.Package.getUpdates(new W.Callback(function(packages) {
				that.components.list.html('');
				var list = $.w.list().appendTo(that.components.list);
				
				var generateItemFn = function(pkg) {
					that.updates[pkg.get('codename')] = {
						pkg: pkg,
						disabled: false
					};
					var item = $.w.listItem();
					
					var itemCheckbox = item.listItem('addColumn');
					$.webos.checkButton('', true).bind('checkbuttonchange', function() {
						var checked = $(this).checkButton('value');
						that.updates[pkg.get('codename')].disabled = !checked;
						that._updateInfo();
					}).appendTo(itemCheckbox);
					
					var itemContent = item.listItem('addColumn');
					
					$('<span></span>')
						.html(pkg.get('name'))
						.addClass('title')
						.appendTo(itemContent);
					itemContent.append('<br />');
					$('<span></span>')
						.html(pkg.get('codename')+' (taille: '+W.File.bytesToSize(pkg.get('packagesize'))+')')
						.addClass('details')
						.appendTo(itemContent);
					
					return item;
				};
				
				var i = 0;
				for (var name in packages) {
					var item = generateItemFn(packages[name]);
					list.list('content').append(item);
					i++;
				}
				
				if (i > 0) {
					that.components.title.html(t.get('Some updates are available for this webos.'));
					that.components.msg.html(t.get('If you don\'t want to install these updates now, you can do it later.'));
				} else {
					that.components.title.html(t.get('Your system is up-to-date.'));
					that.components.msg.html(t.get('No update is currently available.'));
					list.hide();
				}
				
				that._updateInfo();
				
				that.window.window('loading', false);
			}, function(response) {
				that.components.buttons.upgrade.button('option', 'disabled', true);
				that.components.msg.html(t.get('Can\'t retrieve the list of available updates.'));
				that.window.window('loading', false);
				
				response.triggerError(t.get('Can\'t retrieve the list of available updates.'));
			}));
		};
		
		this._updateInfo = function() {
			var i = 0;
			var size = 0;
			for (var name in this.updates) {
				if (typeof this.updates[name] != 'undefined' && this.updates[name].disabled === false) {
					size += parseInt(this.updates[name].pkg.get('packagesize'));
					i++;
				}
			}
			
			var sentence;
			if (i == 0) {
				this.components.buttons.upgrade.button('option', 'disabled', true);
				sentence = t.get('No update to install.');
			} else {
				this.components.buttons.upgrade.button('option', 'disabled', false);
				sentence = t.get('${nbr} update${nbr|s} selected, ${size} will be downloaded.', { nbr: i, size: W.File.bytesToSize(size) });
			}
			this.components.info.html(sentence);
		};
		
		this.checkUpdates = function() {
			this.window.window('loading', true, {
				message: t.get('Updating software cache...')
			});
			
			W.Package.updateCache(new W.Callback(function(response) {
				that.window.window('loading', false);
				that.displayUpdates();
			}, function(response) {
				that.window.window('loading', false);
				response.triggerError(t.get('Can\'t update software cache.'));
			}));
		};
		
		this.installUpdates = function() {
			var i = 0;
			var updates = [];
			for (var name in this.updates) {
				if (typeof this.updates[name] != 'undefined' && this.updates[name].disabled === false) {
					updates.push(this.updates[name].pkg);
					i++;
				}
			}
			
			if (i == 0) {
				return;
			}
			
			var total = i;
			
			this.window.window('loading', true, {
				message: t.get('Installing updates...')
			});
			
			var loadingWindow = $.w.window.dialog({
				title: t.get('Installing updates...'),
				stylesheet: 'usr/share/css/update-manager/loading-window.css',
				resizable : false,
				closeable: false,
				parentWindow: that.window
			});
			
			loadingWindowContent = $.w.container().addClass('loading-content').container('content').appendTo(loadingWindow.window('content'));
			
			$('<div></div>').addClass('upgrade-icon').appendTo(loadingWindowContent);
			$('<strong></strong>').html(t.get('Installing updates...')).appendTo(loadingWindowContent);
			$.w.label(t.get('Installation in progress, please wait...')).appendTo(loadingWindowContent);
			var progressbar = $.w.progressbar().appendTo(loadingWindowContent);
			var infobox = $.w.label(t.get('Installing updates...')).appendTo(loadingWindowContent);
			
			loadingWindow.window('open');
			
			var errors = [];
			
			var installUpdateFn = function(i) {
				var pkg = updates[i];
				
				infobox.html(t.get('Installing « ${pkg} »...', { pkg: pkg.get('codename') }));
				
				var callback = new W.Callback(function() {
					var progress = (i + 1) / total * 100;
					progressbar.progressbar('option', 'value', progress);
					i++;
					if (i < updates.length) {
						installUpdateFn(i);
					} else {
						loadingWindow.window('close');
						that.window.window('loading', false);
						that.displayUpdates();
						if (errors.length > 0) {
							W.Error.trigger(t.get('An error occurred while installing these packages : "${errors}"', { errors: errors.join('", "') }));
						}
					}
				}, function() {
					errors.push(pkg.get('codename'));
					callback.success();
				});
				
				pkg.install(callback);
			};
			
			installUpdateFn(0);
		};
		
		this.window.window('open');
		
		this.displayUpdates();

		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
}
UpdateManager.prototype = {
	_translationsName: 'update-manager'
};
Webos.inherit(UpdateManager, Webos.Observable);
Webos.inherit(UpdateManager, Webos.TranslatedLibrary);