//On initialise la fenetre
var testWindow = $.w.window({
	title: 'The widget factory',
	width: 400
});

var content = testWindow.window('content');

//On ajoute le contenu
var image = $.w.image(new W.Icon('applications/default', 32));
image.css('float', 'right');
content.append(image);
content.append($.w.label('Ceci est une fen&ecirc;tre de test.'));

var tabs = $.w.tabs().appendTo(content);

var widgets = {
	'Formulaires': {
		'button': function() {
			return [$.w.button('Bouton'), $.w.button('Un autre bouton'), $.w.button('Bouton').button('option', 'disabled', true)];
		},
		'textEntry': function() {
			return [$.w.textEntry('Zone de texte'), $.w.textEntry('Zone de texte').textEntry('option', 'disabled', true)];
		},
		'passwordEntry': function() {
			return [$.w.passwordEntry('Mot de passe'), $.w.passwordEntry('Mot de passe').passwordEntry('option', 'disabled', true)];
		},
		'radioButton': function() {
			var radioContainer1 = $.w.radioButtonContainer();
			radioContainer1.append($.w.radioButton());
			radioContainer1.append($.w.radioButton('', true));
			var radioContainer2 = $.w.radioButtonContainer();
			radioContainer2.append($.w.radioButton().radioButton('option', 'disabled', true));
			radioContainer2.append($.w.radioButton('', true).radioButton('option', 'disabled', true));
			return [radioContainer1, radioContainer2];
		},
		'checkButton': function() {
			return [$.w.checkButton(), $.w.checkButton('', true), $.w.checkButton().checkButton('option', 'disabled', true), $.w.checkButton('', true).checkButton('option', 'disabled', true)];
		}
	},
	'Autres': {
		'switchButton': function() {
			return [$.w.switchButton(), $.w.switchButton('', true), $.w.switchButton().switchButton('option', 'disabled', true), $.w.switchButton('', true).switchButton('option', 'disabled', true)];
		},
		'progressbar': function() {
			return [$.w.progressbar(50)];
		}
	}
};

for (var tabTitle in widgets) {
	var tabContents = tabs.tabs('tab', tabTitle);
	var tabWidgets = widgets[tabTitle];
	for (var name in tabWidgets) {
		var elements = tabWidgets[name]();
		for (var i = 0; i < elements.length; i++) {
			tabContents.append(elements[i]);
		}
	}
}

//On ouvre la fenetre
testWindow.window('open');
