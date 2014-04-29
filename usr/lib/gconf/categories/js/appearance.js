var confWindow = args.getParam(0);
var $winCtn = confWindow.window('content');

confWindow.window('option', {
	dialog: true,
	stylesheet: '/usr/share/css/gconf/categories/appearance.css'
}).window('loading', true);

var init = function (isLoggedIn) {
	var $tabs = $.w.tabs().appendTo($winCtn);

	var updateTheme = function (themeProps) {
		var op = Webos.Operation.create();

		var theme = W.Theme.current();

		for (var prop in themeProps) {
			var value = themeProps[prop];

			if (theme.set(prop, value) === false) {
				W.Error.trigger('Cannot change theme');
				op.setCompleted(false);
				return op;
			}
		}

		confWindow.window('loading', true);
		theme.sync([function () {}, function (resp) {
			resp.triggerError('Cannot change theme');
		}]).always(function (result) {
			confWindow.window('loading', false);
			op.setCompleted(result);
		});

		return op;
	};

	//Background
	var form = $.w.entryContainer();
	$tabs.tabs('tab', 'Background', form);

	var backgroundContainer = $.w.container().appendTo(form);

	var backgroundsList = $.w.iconsList().addClass('bg-list').appendTo(backgroundContainer);

	var actualBgFile = Webos.File.get(W.Theme.current().get('background'));
	var actualBgItem = $.w.iconsListItem(actualBgFile.get('realpath')).click(function() {
		updateTheme({
			background: actualBgFile.get('path')
		});
	}).iconsListItem('active', true).appendTo(backgroundsList);

	var $bgOpts = $.w.container().addClass('bg-options').appendTo(form);

	var currentMode = 'cover';
	if (W.Theme.current().get('hideBackground')) {
		currentMode = 'color';
	}
	if (W.Theme.current().get('backgroundRepeat') != 'no-repeat') {
		currentMode = 'repeat';
	}
	var $bgMode = $.w.selectButton('', {
		color: 'Plain color',
		cover: 'Zoom',
		repeat: 'Repeat'
	})
		.selectButton('option', 'value', currentMode)
		.change(function() {
			var mode = $bgMode.selectButton('value');

			updateTheme({
				hideBackground: (mode == 'color'),
				backgroundRepeat: (mode == 'repeat') ? 'repeat' : 'no-repeat'
			});
		})
		.appendTo($bgOpts);

	$.webos.colorPickerBtn(function (color) {
		updateTheme({
			backgroundColor: color
		});
	}, {
		value: W.Theme.current().get('backgroundColor')
	}).appendTo($bgOpts);

	confWindow.window('loading', true);
	W.File.listDir(W.Theme.backgroundsDir, function(files) {
		backgroundsList.empty();
		var actualBgListed = false;

		var handleFile = function (file) {
			if (file.get('is_dir')) {
				return;
			}
			
			var thumbnailsDirArray = file.get('realpath').split('/');
			delete thumbnailsDirArray[thumbnailsDirArray.length - 1];
			var thumbnailsDir = thumbnailsDirArray.join('/')+'/thumbnails';
			var item =  $.w.iconsListItem(thumbnailsDir+'/'+file.get('basename')).click(function() {
				updateTheme({
					background: file.get('path')
				});
			});
			
			if (W.Theme.current().get('background') == file.get('path')) {
				actualBgItem = item;
				actualBgListed = true;
				item.iconsListItem('active', true);
				backgroundsList.prepend(item);
			} else {
				backgroundsList.append(item);
			}
		};
		
		for (var index in files) {
			handleFile(files[index]);
		}
		
		if (!actualBgListed) {
			actualBgItem = $.w.iconsListItem(actualBgFile.get('realpath')).click(function() {
				updateTheme({
					background: actualBgFile.get('path')
				});
			}).iconsListItem('active', true).prependTo(backgroundsList);
		}
	}).always(function () {
		confWindow.window('loading', false);
	});

	//Theme
	form = $.w.entryContainer();
	$tabs.tabs('tab', 'Theme', form);

	var themeContainer = $.w.container().appendTo(form);

	var themesList = {};
	themesList[W.Theme.current().get('desktop')] = W.Theme.current().get('desktop');
	var themeSelector = $.w.selectButton('User interface theme: ', themesList)
		.change(function() {
			var theme = themeSelector.selectButton('value');

			updateTheme({
				desktop: theme
			}).done(function () {
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
			}).fail(function () {
				themeSelector.selectButton('value', W.Theme.current().get('desktop'));
			});
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
			updateTheme({
				icons: iconsSelector.selectButton('value')
			}).fail(function () {
				iconsSelector.selectButton('value', W.Theme.current().get('icons'));
			});
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
			updateTheme({
				animations: animationsSelector.switchButton('value')
			}).fail(function () {
				iconsSelector.selectButton('value', W.Theme.current().get('animations'));
			});
		})
		.appendTo(themeContainer);
};

W.User.getLogged(function (user) {
	init(!!user);
});