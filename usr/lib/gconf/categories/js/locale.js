var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);

var list = {};
var locales = Webos.Locale.getAll();
for (var index in locales) {
	list[index] = locales[index].title();
}
var languageSelector = $.w.selectButton('Langue :', list).selectButton('value', Webos.Translation.language()).bind('selectbuttonchange', function() {
	confWindow.window('loading', true);
	Webos.Translation.setLanguage(languageSelector.selectButton('value'), [function() {
		confWindow.window('loading', false);
		$.webos.window.confirm({
			title: 'Changement de langue',
			label: 'La langue a &eacute;t&eacute; chang&eacute;e. Voulez-vous red&eacute;marrer l\'interface utilisateur maintenant pour prendre en compte cette modification ?',
			confirm: function() {
				W.UserInterface.load(W.UserInterface.Booter.current().name());
			},
			cancelLabel: 'Non',
			confirmLabel: 'Red&eacute;marrer maintenant',
			parentWindow: confWindow
		}).window('open');
	}, function() {
		confWindow.window('loading', false);
		localeSelector.selectButton('value', Webos.Locale.current());
	}]);
}).appendTo(content);

var localeSelector = $.w.selectButton('Afficher les nombres, dates et devises dans le format habituel pour :', list).selectButton('value', Webos.Locale.current()).bind('selectbuttonchange', function() {
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
	exemples.html('Exemples :<br />' +
		'Nombre : ' + locale.number(1234567.89) + '<br />' +
		'Date : ' + locale.completeDate(new Date()) + '<br />' +
		'Devise : ' + locale.currency(20457.99));
};
generateExemplesFn();
