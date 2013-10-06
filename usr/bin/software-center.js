Webos.require('usr/lib/software-center/software-center.js', function() {
	if (args.isParam(0)) { //Si un parametre est fourni
		//On affiche le paquet specifie
		var app = new SoftwareCenter(args.getParam(0));
	} else { //Sinon on ouvre simplement la logitheque
		var app = new SoftwareCenter();
	}
});
