var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);

confWindow.window('stylesheet', 'usr/share/css/gconf/categories/appearance.css');

var form = $.w.entryContainer().appendTo(content);

confWindow.bind('dragstart', function(event, ui) {
	if (confWindow.is(event.target)) {
		form.addClass('animating');
	}
}).bind('dragstop', function(event, ui) {
	if (confWindow.is(event.target)) {
		form.removeClass('animating');
	}
});

var backgroundContainer = $.w.container().appendTo(form);
$('<strong></strong>').html('Arri&egrave;re-plan').appendTo(backgroundContainer);

backgroundContainer.append('<br />');

var backgroundsList = $.w.iconsList().addClass('backgroundslist').appendTo(backgroundContainer);

var actualBgFile = Webos.File.get(W.Theme.current().get('background'));
var actualBgItem = $.w.iconsListItem(actualBgFile.get('realpath')).click(function() {
	changeBgFn(actualBgFile.get('path'), actualBgFile.get('basename'));
}).iconsListItem('active', true).appendTo(backgroundsList);

W.File.listDir(W.Theme.backgroundsDir, new W.Callback(function(files) {
	backgroundsList.empty();
	var actualBgListed = false;
	
	for (var index in files) {
		(function(file) {
			if (files[index].getAttribute('is_dir')) {
				return;
			}
			
			var thumbnailsDirArray = file.get('realpath').split('/');
			delete thumbnailsDirArray[thumbnailsDirArray.length - 1];
			var thumbnailsDir = thumbnailsDirArray.join('/')+'/thumbnails';
			var item =  $.w.iconsListItem(thumbnailsDir+'/'+file.get('basename')).click(function() {
				changeBgFn(file.get('path'), file.get('basename'));
			});
			
			if (W.Theme.current().get('background') == file.get('path')) {
				actualBgItem = item;
				actualBgListed = true;
				item.iconsListItem('active', true);
				backgroundsList.prepend(item);
			} else {
				backgroundsList.append(item);
			}
		})(files[index]);
	}
	
	if (!actualBgListed) {
		actualBgItem = $.w.iconsListItem(actualBgFile.get('realpath')).click(function() {
			changeBgFn(actualBgFile.get('path'), actualBgFile.get('basename'));
		}).iconsListItem('active', true).prependTo(backgroundsList);
	}
}));

var actualBg = $.w.container().addClass('actualbackground').appendTo(backgroundContainer);

var bgTitle = $('<strong></strong>').html(actualBgFile.get('basename')).appendTo(actualBg);

var screen = $.w.container().addClass('screen').appendTo(actualBg);
var background = $('<img />', { src: actualBgFile.get('realpath') }).appendTo(screen);

var changeBgFn = function(bg, name) {
	if (!W.Theme.current().set('background', bg)) {
		W.Error.trigger('Impossible de modifier le fond d\'&eacute;cran');
		return;
	}
	
	confWindow.window('loading', true);
	
	W.Theme.current().sync(new W.Callback(function() {
		var path = Webos.File.get(bg).get('realpath');
		new W.LoadImage({
			images: path,
			callback: function(data) {
				confWindow.window('loading', false);
				if (data.IsEnd) {
					bgTitle.html(name);
					background.attr('src', path);
					//actualBgItem.iconsListItem('option', 'icon', path);
				} else {
					userCallback.error(data);
					W.Error.trigger('Impossible de charger le fond d\'&eacute;cran');
				}
			}
		});
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de modifier le fond d\'&eacute;cran');
	}));
	
};

var themeContainer = $.w.container().appendTo(form);
$('<strong></strong>').html('Th&egrave;me').appendTo(themeContainer);

var themesList = {};
themesList[W.Theme.current().get('desktop')] = W.Theme.current().get('desktop');
var themeSelector = $.w.selectButton('Th&egrave;me &agrave; utiliser pour l\'interface utilisateur : ', themesList)
	.change(function() {
		var theme = themeSelector.selectButton('value');
		
		if (!W.Theme.current().set('desktop', theme)) {
			W.Error.trigger('Impossible de modifier le th&egrave;me');
			return;
		}
		
		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
			$.webos.window.confirm({
				title: 'Changement de th&egrave;me',
				label: 'Le th&egrave;me a &eacute;t&eacute; chang&eacute;. Voulez-vous red&eacute;marrer l\'interface utilisateur maintenant pour prendre en compte cette modification ?',
				confirm: function() {
					W.UserInterface.load(W.UserInterface.Booter.current().name());
				},
				cancelLabel: 'Non',
				confirmLabel: 'Red&eacute;marrer maintenant',
				parentWindow: confWindow
			}).window('open');
		}, function(response) {
			confWindow.window('loading', false);
			themeSelector.selectButton('value', W.Theme.current().get('desktop'));
			response.triggerError('Impossible de modifier le th&egrave;me');
		}));
	})
	.appendTo(themeContainer);

W.Theme.getAvailable('desktop', function(themes) {
	var themesList = {};
	for (var index in themes) {
		var data = themes[index];
		themesList[index] = data.name;
	}
	themeSelector
		.selectButton('option', 'choices', themesList)
		.selectButton('value', W.Theme.current().get('desktop'));
});

var iconsList = {};
iconsList[W.Theme.current().get('icons')] = W.Theme.current().get('icons');
var iconsSelector = $.w.selectButton('Th&egrave;me des ic&ocirc;nes : ', iconsList)
	.change(function() {
		var icons = iconsSelector.selectButton('value');
		
		if (!W.Theme.current().set('icons', icons)) {
			W.Error.trigger('Impossible de modifier le th&egrave;me');
			return;
		}
		
		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			iconsSelector.selectButton('value', W.Theme.current().icons());
			response.triggerError('Impossible de modifier le th&egrave;me');
		}));
	})
	.appendTo(themeContainer);
W.File.listDir(W.Theme.iconsDir, function(list) {
	var iconsThemes = {};
	for (var i = 0; i < list.length; i++) {
		var file = list[i];
		if (file.get('is_dir')) {
			iconsThemes[file.get('basename')] = file.get('basename');
		}
	}
	iconsSelector
		.selectButton('option', 'choices', iconsThemes)
		.selectButton('value', W.Theme.current().get('icons'));
});

var animationsSelector = $.w.switchButton('Animations : ', W.Theme.current().get('animations'))
	.bind('switchbuttonchange', function() {
		var animations = animationsSelector.switchButton('value');
		
		if (!W.Theme.current().set('animations', animations)) {
			W.Error.trigger('Impossible de modifier le th&egrave;me');
			return;
		}
		
		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			response.triggerError('Impossible de modifier les options des animations');
		}));
	})
	.appendTo(themeContainer);