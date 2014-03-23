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

var proc = this, args = proc.getArguments();

Webos.require('/usr/lib/intermezzo/intermezzo.js', function () {
	// On récupère les arguments passées en paramètres (console, etc ...)
	var file = (args.getParam(0)) ? W.File.get(args.getParam(0)) : null;
	if (file) {
		new IntermezzoWindow({
			file: file
		});
	} else {
		new IntermezzoWindow();
	}
});