/* ----------- intermezzo.js -----------
 * v1.0
 * Par Doppelganger
 * Le  29/06/2011
 * 
 * v2.0
 * Par $imon
 * Le 10/12/2011
 * 
 * LECTEUR AUDIO & VIDEO
 * --- UTILISE FLASH ET JQUERY ---
 * Cette application requiert les libraires suivantes : 
 * -lib/intermezzo.js
 * -lib/UniqueId.js
*/
new W.ScriptFile('usr/lib/intermezzo/intermezzo.js');

 // on récupère les arguments passées en paramètres (console etc ...)
var IntermezzoPlayerFile = args.getParam(0);
var file; // variable qui enregistre le fichier wfile à lancer
if (typeof IntermezzoPlayerFile == 'string') { // si ce n'est pas un objet wfile on en cré un
	W.File.load(IntermezzoPlayerFile, new W.Callback(function(file) {
		new IntermezzoWindow({ // on lance Intermezzo
			file: file
		});
	}));
} else if (typeof IntermezzoPlayerFile == 'object') { // si c'est un objet (wfile) on ne le crée pas
	file = IntermezzoPlayerFile;
} else { // sinon on met false
	file = false;
}

if (typeof file != 'undefined') {
	new IntermezzoWindow({ // on lance Intermezzo
		file: file
	});
}