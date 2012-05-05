/* ----------- uniqueid.js ----------- v1.0 ----------- Par Doppelganger ----------- Le  06/06/2011
==== CLASSE JAVASCRIPT QUI CREE DES ID UNIQUES ====
*/

Webos.UniqueId = function WUniqueId(options) {
	this.options = options; // on récupère les options que l'utilisateur a défini

	this.create_chaine = function (nombre_caracteres) { // méthode qui crée une chaine aleatoire
		this.caracteres = new Array('a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9');
		this.chaine_initiale = '';
		
		for(var i = 0; i < nombre_caracteres; i++) {

			this.chaine_initiale = this.chaine_initiale + this.caracteres[Math.floor(Math.random() * this.caracteres.length)];
		}

		return this.chaine_initiale; // on retourne la chaine sans les start/middle/stop
	};

	this.create_id = function () { // méthode qui crée une chaine aleatoire
		this.precision_ok = 10;

		// liste de condition pour utilier la precision de l'utilisateur
		if(options.precision != '' && options.precision != undefined && options.precision > 0 && options.precision <= 30 && isNaN(options.precision) == false) {
			this.precision_ok = options.precision;
		}
		
		this.chaine_1 = this.create_chaine(this.precision_ok);
		this.chaine_2 = this.create_chaine(this.precision_ok);
		
		var start_chaine = options.start;
		var middle_chaine = options.middle;
		var stop_chaine = options.stop;

		if(start_chaine == undefined) {
			start_chaine = '';
		}

		if(middle_chaine == undefined) {
			middle_chaine = '';
		}

		if(stop_chaine == undefined) {
			stop_chaine = '';
		}

		this.NewId = ''+start_chaine+''+this.chaine_1+''+middle_chaine+''+this.chaine_2+''+stop_chaine+'';
	};

	this.init = function () { // méthode qui s'occupe de l'initialisation
		this.create_id();
	};

	this.init(); // on lance l'initialisation
};