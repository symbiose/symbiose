var confWindow = args.getParam(0);
var content = confWindow.window('content');

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

var actualBgItem = $.w.iconsListItem(STheme.current.background()).click(function() {
	changeBgFn(STheme.current.background(), 'Arri&egrave;re-plan actuel');
}).iconsListItem('active', true).appendTo(backgroundsList);

W.File.listDir(STheme.backgroundsDir, new W.Callback(function(files) {
	var generateItemFn = function(file) {
		var thumbnailsDirArray = file.getAttribute('realpath').split('/');
		delete thumbnailsDirArray[thumbnailsDirArray.length - 1];
		var thumbnailsDir = thumbnailsDirArray.join('/')+'/thumbnails';
		return $.w.iconsListItem(thumbnailsDir+'/'+file.getAttribute('basename')).click(function() {
			changeBgFn(file.getAttribute('realpath'), file.getAttribute('basename'));
		});
	};
	
	for (var index in files) {
		if (files[index].getAttribute('is_dir')) {
			continue;
		}
		backgroundsList.append(generateItemFn(files[index]));
	}
}));

var actualBg = $.w.container().addClass('actualbackground').appendTo(backgroundContainer);

var bgTitle = $('<strong></strong>').html('Arri&egrave;re-plan actuel').appendTo(actualBg);

var screen = $.w.container().addClass('screen').appendTo(actualBg);
var background = $('<img />', { src: STheme.current.background() }).appendTo(screen);

var changeBgFn = function(path, name) {
	confWindow.window('loading', true);
	STheme.current.changeBackground(path, new W.Callback(function() {
		new W.LoadImage({
			images: path,
			callback: function(data) {
				confWindow.window('loading', false);
				if (data.IsEnd) {
					bgTitle.html(name);
					background.attr('src', path);
					actualBgItem.iconsListItem('option', 'icon', path);
				} else {
					userCallback.error(data);
					W.Error.trigger('Impossible de charger le fond d\'&eacute;cran');
				}
			}
		});
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Impossible de changer le fond d\'&eacute;cran');
	}));
	
};

var themeContainer = $.w.container().appendTo(form);
$('<strong></strong>').html('Th&egrave;me').appendTo(themeContainer);

var themesList = {};
themesList[STheme.current.desktop()] = STheme.current.desktop();
var themeSelector = $.w.selectButton('Th&egrave;me &agrave; utiliser pour l\'interface utilisateur : ', themesList)
	.change(function() {
		var theme = themeSelector.selectButton('value');
		confWindow.window('loading', true);
		STheme.current.changeDesktop(theme, new W.Callback(function() {
			confWindow.window('loading', false);
			$.webos.window.confirm({
				title: 'Changement de th&egrave;me',
				label: 'Le th&egrave;me a &eacute;t&eacute; chang&eacute;. Voulez-vous red&eacute;marrer l\'interface utilisateur maintenant pour prendre en compte cette modification ?',
				confirm: function() {
					W.UserInterface.load(W.UserInterface.current.name());
				},
				cancelLabel: 'Non',
				confirmLabel: 'Red&eacute;marrer maintenant'
			}).window('open');
		}, function(response) {
			confWindow.window('loading', false);
			themeSelector.selectButton('value', STheme.current.desktop());
			response.triggerError('Impossible de modifier le th&egrave;me');
		}));
	})
	.appendTo(themeContainer);

STheme.getAvailable(function(themes) {
	var themesList = {};
	for (var index in themes) {
		var data = themes[index];
		themesList[index] = data.name;
	}
	themeSelector
		.selectButton('option', 'choices', themesList)
		.selectButton('value', STheme.current.desktop());
});

var iconsList = {};
iconsList[STheme.current.icons()] = STheme.current.icons();
var iconsSelector = $.w.selectButton('Th&egrave;me des ic&ocirc;nes : ', iconsList)
	.change(function() {
		var icons = iconsSelector.selectButton('value');
		confWindow.window('loading', true);
		STheme.current.changeIcons(icons, new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			iconsSelector.selectButton('value', STheme.current.icons());
			response.triggerError('Impossible de modifier le th&egrave;me');
		}));
	})
	.appendTo(themeContainer);
W.File.listDir(STheme.iconsDir, function(list) {
	var iconsThemes = {};
	for (var i = 0; i < list.length; i++) {
		var file = list[i];
		if (file.get('is_dir')) {
			iconsThemes[file.get('basename')] = file.get('basename');
		}
	}
	iconsSelector
		.selectButton('option', 'choices', iconsThemes)
		.selectButton('value', STheme.current.icons());
});

var animationsSelector = $.w.switchButton('Animations : ', STheme.current.animations())
	.bind('switchbuttonchange', function() {
		var value = animationsSelector.switchButton('value');
		console.log(value);
		confWindow.window('loading', true);
		STheme.current.changeAnimations(value, new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			response.triggerError('Impossible de modifier les options des animations');
		}));
	})
	.appendTo(themeContainer);