var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);

confWindow.window('stylesheet', '/usr/share/css/gconf/categories/appearance.css');

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
$('<strong></strong>').html('Wallpaper').appendTo(backgroundContainer);

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
		W.Error.trigger('Cannot change wallpaper');
		return;
	}
	
	confWindow.window('loading', true);
	
	W.Theme.current().sync(new W.Callback(function() {
		var path = Webos.File.get(bg).get('realpath');

		var successCallback = function() {
			confWindow.window('loading', false);

			bgTitle.html(name);
			background.attr('src', path);
			//actualBgItem.iconsListItem('option', 'icon', path);
			//callback.success();
		};
		var errorCallback = function() {
			confWindow.window('loading', false);

			//callback.error(W.ServerCall.Response.error('Cannot load wallpaper'));
		};

		var img = new Image();
		img.onload = successCallback;
		img.onerror = errorCallback;
		img.onabort = errorCallback;
		img.src = path;
	}, function(response) {
		confWindow.window('loading', false);
		response.triggerError('Cannot change wallpaper');
	}));
	
};

var themeContainer = $.w.container().appendTo(form);
$('<strong></strong>').html('Theme').appendTo(themeContainer);

var themesList = {};
themesList[W.Theme.current().get('desktop')] = W.Theme.current().get('desktop');
var themeSelector = $.w.selectButton('User interface theme: ', themesList)
	.change(function() {
		var theme = themeSelector.selectButton('value');
		
		if (!W.Theme.current().set('desktop', theme)) {
			W.Error.trigger('Cannot change theme');
			return;
		}
		
		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
			$.webos.window.confirm({
				title: 'Changing theme',
				label: 'The theme has been changed. Do you want to restart the user interface now to reflect this change ?',
				confirm: function() {
					W.UserInterface.load(W.UserInterface.Booter.current().name());
				},
				cancelLabel: 'No',
				confirmLabel: 'Restart now',
				parentWindow: confWindow
			}).window('open');
		}, function(response) {
			confWindow.window('loading', false);
			themeSelector.selectButton('value', W.Theme.current().get('desktop'));
			response.triggerError('Cannot change theme');
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
var iconsSelector = $.w.selectButton('Icon theme: ', iconsList)
	.change(function() {
		var icons = iconsSelector.selectButton('value');
		
		if (!W.Theme.current().set('icons', icons)) {
			W.Error.trigger('Cannot change icon theme');
			return;
		}
		
		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			iconsSelector.selectButton('value', W.Theme.current().icons());
			response.triggerError('Cannot change icon theme');
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

var animationsSelector = $.w.switchButton('Animations', W.Theme.current().get('animations'))
	.bind('switchbuttonchange', function() {
		var animations = animationsSelector.switchButton('value');

		if (!W.Theme.current().set('animations', animations)) {
			W.Error.trigger('Cannot change animations settings');
			return;
		}

		confWindow.window('loading', true);
		W.Theme.current().sync(new W.Callback(function() {
			confWindow.window('loading', false);
		}, function(response) {
			confWindow.window('loading', false);
			response.triggerError('Cannot change animations settings');
		}));
	})
	.appendTo(themeContainer);