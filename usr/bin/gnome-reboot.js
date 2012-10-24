//On initialise la fenetre de deconnexion
var rebootWindow = $.w.window.main({
	icon: new W.Icon('actions/reload'),
	title: 'Red&eacute;marrer',
	width: 350,
	resizable: false
});

var rebootWindowContents = rebootWindow.window('content');

//Contenu de la fenetre
$('<img />').attr('src', new W.Icon('actions/reload'))
	.css('float', 'left')
	.appendTo(rebootWindowContents);

rebootWindowContents.append('Voulez-vous vraiment quitter tous les programmes et red&eacute;marrer ?');
var buttonContainer = $.w.buttonContainer().appendTo(rebootWindowContents);
$.w.button('Annuler')
	.appendTo(buttonContainer)
	.click(function() {
		rebootWindow.window('close');
	});
$.w.button('Red&eacute;marrer')
	.click(function() {
		W.Cmd.execute('halt', new W.Callback(function() { window.location.reload(); }));
	})
	.appendTo(buttonContainer);

//On ouvre la fenetre
rebootWindow.window('open');