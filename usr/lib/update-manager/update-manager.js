new W.ScriptFile('usr/lib/webos/file.js'); //On charge la bibliotheque des fichiers
new W.ScriptFile('usr/lib/apt/apt.js'); //On charge la bibliotheque JS d'APT

/**
 * UpdateManager represente un gestionnaire de mises a jour.
 * @author $imon
 * @version 1.0
 */
function UpdateManager() {
	var that = this;
	
	this.updates = {};
	
	this.window = $.w.window({
		title: 'Gestionnaire de mises &agrave; jour',
		icon: new SIcon('apps/update-manager'),
		width: 600,
		stylesheet: 'usr/share/css/update-manager/main.css',
		resizable : false
	});
	
	var windowContent = this.window.window('content');
	
	this.components = {};
	
	$('<div></div>').addClass('upgrade-icon').appendTo(windowContent);
	this.components.title = $('<strong></strong>').html('Gestionnaire de mises &agrave; jour').appendTo(windowContent);
	windowContent.append('<br />');
	this.components.msg = $.w.label().appendTo(windowContent);
	this.components.list = $.w.container().addClass('list').appendTo(windowContent);
	this.components.info = $.w.label().appendTo(windowContent);
	this.components.buttons = {};
	var buttonContainer = $.w.buttonContainer().appendTo(windowContent);
	this.components.buttons.check = $.w.button('V&eacute;rifier').click(function() {
		that.checkUpdates();
	}).appendTo(buttonContainer);
	this.components.buttons.upgrade = $.w.button('Installer les mises &agrave; jour').click(function() {
		that.installUpdates();
	}).appendTo(buttonContainer);
	this.components.buttons.close = $.w.button('Fermer').click(function() {
		that.window.window('close');
	}).appendTo(buttonContainer);
	
	this.displayUpdates = function() {
		this.window.window('loading', true);
		
		this.updates = {};
		
		SPackage.getUpdates(new W.Callback(function(packages) {
			that.components.list.html('');
			var list = $.w.list().appendTo(that.components.list);
			
			var generateItemFn = function(pkg) {
				that.updates[pkg.getName()] = {
					pkg: pkg,
					disabled: false
				};
				var item = $.w.listItem();
				
				var itemCheckbox = item.listItem('addColumn');
				$.webos.checkButton('', true).change(function() {
					var checked = $(this).checkButton('checked');
					that.updates[pkg.getName()].disabled = !checked;
					that._updateInfo();
				}).appendTo(itemCheckbox);
				
				var itemContent = item.listItem('addColumn');
				
				$('<span></span>')
					.html(pkg.getAttribute('name'))
					.addClass('title')
					.appendTo(itemContent);
				itemContent.append('<br />');
				$('<span></span>')
					.html(pkg.getName()+' (taille: '+W.File.bytesToSize(pkg.getAttribute('packagesize'))+')')
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
				that.components.title.html('Des mises &agrave; jour sont disponibles pour ce webos.');
				that.components.msg.html('Si vous ne voulez pas installer ces mises &agrave; jour maintenant, vous pourrez le faire plus tard.');
			} else {
				that.components.title.html('Votre syst&egrave;me est &agrave; jour.');
				that.components.msg.html('Aucune mise &agrave; jour n\'est pour l\'instant disponible.');
				list.hide();
			}
			
			that._updateInfo();
			
			that.window.window('loading', false);
		}, function(response) {
			that.components.buttons.upgrade.button('option', 'disabled', true);
			that.components.msg.html('Impossible de r&eacute;cup&eacute;rer la liste des mises &agrave; jour disponibles.');
			that.window.window('loading', false);
			
			W.Error.trigger('Impossible de r&eacute;cup&eacute;rer la liste des mises &agrave; jour disponibles.', response.getAllChannels());
		}));
	};
	
	this._updateInfo = function() {
		var i = 0;
		var size = 0;
		for (var name in this.updates) {
			if (typeof this.updates[name] != 'undefined' && this.updates[name].disabled === false) {
				size += parseInt(this.updates[name].pkg.getAttribute('packagesize'));
				i++;
			}
		}
		
		if (i == 0) {
			this.components.buttons.upgrade.button('option', 'disabled', true);
			var sentence = 'Aucune mise &agrave; jour &agrave; installer.';
		} else {
			this.components.buttons.upgrade.button('option', 'disabled', false);
			var sentence = i+' '+((i > 1) ? 'mises &agrave; jour ont &eacute;t&eacute; s&eacute;lectionn&eacute;es' : 'mise &agrave; jour a &eacute;t&eacute; s&eacute;lectionn&eacute;e')+', '+W.File.bytesToSize(size)+' vont &ecirc;tre t&eacute;l&eacute;charg&eacute;s.';
		}
		
		this.components.info.html(sentence);
	};
	
	this.checkUpdates = function() {
		this.window.window('loading', true);
		
		var loadingWindow = $.w.window.dialog({
			title: 'Mise &agrave; jour du cache',
			stylesheet: 'usr/share/css/update-manager/loading-window.css',
			resizable : false,
			closeable: false,
			parentWindow: that.window
		});
		
		loadingWindowContent = loadingWindow.window('content');
		
		$('<div></div>').addClass('update-icon').appendTo(loadingWindowContent);
		$('<strong></strong>').html('Mise &agrave; jour du cache').appendTo(loadingWindowContent);
		$.w.label('Le cache est en cours de mise &agrave; jour, veuillez patienter quelques instants...').appendTo(loadingWindowContent)
		
		loadingWindow.window('open');
		
		SPackage.updateCache(new W.Callback(function(response) {
			loadingWindow.window('close');
			that.window.window('loading', false);
			that.displayUpdates();
		}, function(response) {
			loadingWindow.window('close');
			that.window.window('loading', false);
			W.Error.trigger('Impossible de mettre &agrave; jour le cache.', response.getAllChannels());
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
		
		this.window.window('loading', true);
		
		var loadingWindow = $.w.window.dialog({
			title: 'Installation des mises &agrave; jour',
			stylesheet: 'usr/share/css/update-manager/loading-window.css',
			resizable : false,
			closeable: false,
			parentWindow: that.window
		});
		
		loadingWindowContent = $.w.container().addClass('loading-content').container('content').appendTo(loadingWindow.window('content'));
		
		$('<div></div>').addClass('upgrade-icon').appendTo(loadingWindowContent);
		$('<strong></strong>').html('Installation des mises &agrave; jour').appendTo(loadingWindowContent);
		$.w.label('Les mises &agrave; jour sont en cours d\'installation, veuillez patienter quelques instants...').appendTo(loadingWindowContent);
		var progressbar = $.w.progressbar().appendTo(loadingWindowContent);
		var infobox = $.w.label('Installation en cours...').appendTo(loadingWindowContent);
		
		loadingWindow.window('open');
		
		var errors = [];
		
		var installUpdateFn = function(i) {
			var pkg = updates[i];
			
			infobox.html('Installation de <em>'+pkg.getName()+'</em>...');
			
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
						W.Error.trigger('Impossible d\'installer certaines mises &agrave; jour.', 'Une erreur est survenue lors de l\'installation de paquets : "'+errors.join('", "')+'"');
					}
				}
			}, function() {
				errors.push(pkg.getName());
				callback.success();
			});
			
			pkg.install(callback);
		};
		
		installUpdateFn(0);
	};
	
	this.window.window('open');
	
	this.displayUpdates();
}