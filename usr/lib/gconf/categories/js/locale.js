var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);

var list = {};
var locales = Webos.Locale.getAll();
for (var index in locales) {
	list[index] = locales[index].title();
}
var languageSelector = $.w.selectButton('Language: ', list).selectButton('value', Webos.Translation.language()).bind('selectbuttonchange', function() {
	confWindow.window('loading', true);
	Webos.Translation.setLanguage(languageSelector.selectButton('value'), [function() {
		confWindow.window('loading', false);
		$.webos.window.confirm({
			title: 'Loading language',
			label: 'The language has been changed. Do you want to restart the user interface now to apply changes?',
			confirm: function() {
				W.UserInterface.load(W.UserInterface.Booter.current().name());
			},
			cancelLabel: 'No',
			confirmLabel: 'Restart now',
			parentWindow: confWindow
		}).window('open');
	}, function() {
		confWindow.window('loading', false);
		localeSelector.selectButton('value', Webos.Locale.current());
	}]);
}).appendTo(content);

var localeSelector = $.w.selectButton('Display numbers, dates and currencies in the usual format for: ', list)
	.selectButton('value', Webos.Locale.current())
	.bind('selectbuttonchange', function() {
		confWindow.window('loading', true);
		Webos.Locale.set(localeSelector.selectButton('value'), [function() {
			confWindow.window('loading', false);
			generateExemplesFn();
		}, function() {
			confWindow.window('loading', false);
			localeSelector.selectButton('value', Webos.Locale.current());
		}]);
	}).appendTo(content);

var exemples = $.w.label().appendTo(content);

var generateExemplesFn = function() {
	var locale = Webos.Locale.current();
	exemples.html('<strong>Examples:</strong><br />' +
		'Number: ' + locale.number(1234567.89) + '<br />' +
		'Date: ' + locale.completeDate(new Date()) + '<br />' +
		'Currency: ' + locale.currency(20457.99));
};
generateExemplesFn();
