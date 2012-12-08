var $confWindow = args.getParam(0);
var $content = $confWindow.window('content');

$confWindow.window('dialog', true);

var entries = {};

var $form = $.w.entryContainer().appendTo($content);

entries.shutdownScreen = $.w.selectButton('&Eacute;teindre l\'&eacute;cran si inactif depuis :', {
	0: 'Jamais',
	1: '1 minute',
	2: '2 minutes',
	3: '3 minutes',
	5: '5 minutes',
	10: '10 minutes',
	30: '30 minutes',
	60: '1 heure'
}).appendTo($form);

$form.append('<br />');
$.w.label('<strong>Verrouiller</strong>').appendTo($form);

entries.lockScreenEnabled = $.w.switchButton().appendTo($form);

entries.lockScreenTime = $.w.selectButton('Verrouiller l\'&eacute;cran apr&egrave;s :', {
	0: 'Extinction de l\'&eacute;cran',
	0.5: '30 secondes',
	1: '1 minute',
	2: '2 minutes',
	3: '3 minutes',
	5: '5 minutes',
	10: '10 minutes',
	30: '30 minutes',
	60: '1 heure'
}).appendTo($form);

$form.append('<br />');
$.w.label('<strong>Fermeture de session</strong>').appendTo($form);

entries.askOnExit = $.w.switchButton('Demander une confirmation avant de quitter ').appendTo($form);
entries.saveSessionOnExit = $.w.switchButton('Se souvenir des fen&ecirc;tres ouvertes lors de la d&eacute;connexion ').appendTo($form);

var forEachEntry = function(fn) {
	for (var key in entries) {
		var $entry = entries[key];

		var type, changeEvent;
		if ($.webos.widget.is($entry, 'selectButton')) {
			type = 'selectButton';
			changeEvent = 'selectbuttonchange';
		} else if ($.webos.widget.is($entry, 'switchButton')) {
			type = 'switchButton';
			changeEvent = 'switchbuttonchange';
		}

		fn.call($entry[0], {
			key: key,
			type: type,
			changeEvent: changeEvent
		});
	}
};

$confWindow.window('loading', true);
Webos.ConfigFile.loadUserConfig('~/.config/exiting.xml', null, [function(configFile) {
	var getConfig = function() {
		forEachEntry(function(entryData) {
			if (configFile.exists(entryData.key)) {
				$(this)[entryData.type]('value', configFile.get(entryData.key));
			}

			$(this)
				.unbind(entryData.changeEvent+'.exiting.gconf.webos')
				.bind(entryData.changeEvent+'.exiting.gconf.webos', function(e, eventData) {
					var value = eventData.value;

					if (entryData.type == 'switchButton') {
						value = (eventData.value) ? 1 : 0;
					}

					configFile.set(entryData.key, eventData.value);

					configFile.sync([function() {
						$confWindow.window('loading', false);

						if (entryData.key == 'saveSessionOnExit') {
							Webos.Compiz.Reviver.loadConfig();
						} else {
							GnomeScreenSaver.loadConfig();
						}
					}, function(response) {
						$confWindow.window('loading', false);
						getConfig();
						response.triggerError();
					}]);
				});
		});
	};

	getConfig();
	
	$confWindow.window('loading', false);
}, function(response) {
	$confWindow.window('loading', false);
	response.triggerError();
}]);