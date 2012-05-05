//On charge la bibliotheque de la logitheque
new W.ScriptFile('usr/lib/software-center/software-center.js');

if (args.isParam(0)) { //Si un parametre est fourni
	//On affiche le paquet specifie
	var app = new SoftwareCenter(args.getParam(0));
} else { //Sinon on ouvre simplement la logitheque
	var app = new SoftwareCenter();
}