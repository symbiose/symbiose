/**
 * An image loader.
 * @constructor
 * @since 1.0alpha1
 * @requires {Webos.UniqueId}
 * @author Doppelganger
 * @deprecated
 */
Webos.LoadImage = function WLoadImage(options) {
	this.options = options; // on récupère les options que l'utilisateur a défini

	this.ArrayImages = options.images;

	var self = this; // on conserve l'objet

	this.StartingDate = 0;

	this.NbrImageError = 0; // compte le nombre d'images non chargées

	this.SrcImageError = new Array(); // renvoi les URL dont le téléchargement a échoué

	this.NbrImageOk = 0; // compte le nombre d'images chargées correctement

	this.SrcImageOk = new Array(); // renvoi les URL dont le téléchargement s'est bien passé

	this.StartTimer = new Array(); // tableau contenant le début de chaque chargement d'image

	this.TimePerImage = new Array(); // tableau contenant le temps de chargement de chaque image

	this.ExecuteCallback = function (LoadingEnd) { // méthode qui exécute le callback et renvoi les informations du préchargement
		this.CallbackOptions = { // informations renvoyées pour le callback
			IsEnd: LoadingEnd, // IsEnd : true si toutes les images sont chargées, false si elles ne sont pas toutes chargées
			NbrTotal: self.NombreImages, // NbrTotal : contient le nombre total d'images qui étaient à charger
			NbrNotLoad: self.NbrImageError, // NbrNotLoad : contient le nombre d'images dont le téléchargement a échoué
			ArrayNotLoad: self.SrcImageError, // ArrayNotLoad : array qui contient toutes les images dont le téléchargement a échoué
			NbrLoad: self.NbrImageOk, // NbrLoad : contient le nombre d'images dont le téléchargement s'est bien effectué
			ArrayLoad: self.SrcImageOk, // ArrayLoad : array qui contient toutes les images dont le téléchargement s'est bien effectué
			TimePerImage: self.TimePerImage, // TimePerImage : temps de chargement de chaque image (sous forme de tableau)
			TotalLoadingTime: self.TestingTheTime // TotalLoadingTime : temps de chargement de toutes les images (en ms)
		};

		if(options.callback != '' && options.callback != undefined ) {
			try { // on essaye d'executer la fonction
				options.callback(this.CallbackOptions); // on effectue le callback demandé, on précise la variable options qui contient des informations de retour
			} catch (e) {
				W.Error.catchError(e);
			}
		}
	};

	this.LoadImage = function (nbr_de_limage) { // méthode qui précharge les images
		this.id = W.ServerCall.addCallToList(this);
		
		this.ImageId = new W.UniqueId({
			start: 'PreloadImageNotifications_',
			precision: 15
		}).NewId; // on crée un id aleatoire

		this.image = '<img class="PreloadImageNotifications" src="'+this.ArrayWithImages[nbr_de_limage]+'" title="" alt="" class="PreloadImageNotifications" id="'+this.ImageId+'" style="visibility:hidden;position:absolute;top:-9999999px;left:-99999999px;" />';

		$('body').append(this.image); // on ajoute cette image au body

		this.ImageCoursChargement = $('#'+this.ImageId+''); // on sélectionne le div grâce à son id généré aleatoirement

		this.StartTimer[nbr_de_limage] = new Date().getTime();

		// on attend qu'elle se charge
		this.ImageCoursChargement.load(function() { // si l'image est chargée correctement

			self.SrcImageOk[self.NbrImageOk] = $(this).attr('src'); // on ajoute le SRC de l'image qui est chargé

			self.NbrImageOk++; // on ajoute 1 erreur au compteur de chargement

			self.TestLoading(nbr_de_limage + 1); // on test l'image suivante

			$(this).remove(); // on retire l'image après qu'elle soit chargée
			
			W.ServerCall.callComplete(self);

		}).error(function() { // si l'image n'a pas pu être chargée, on continu quand même le processus de chargement des autres images

			self.SrcImageError[self.NbrImageError] = $(this).attr('src'); // on ajoute le SRC de l'image qui a eu une erreur

			self.NbrImageError++; // on ajoute 1 erreur au compteur d'erreurs

			self.TestLoading(nbr_de_limage + 1); // on test l'image suivante

			$(this).remove(); // on retire l'image après qu'elle soit chargée
			
			W.ServerCall.callComplete(self);
		});
	};

	this.VerifLoadingTime = function () { // méthode qui vérifie le temps écoulé à charger les images
		this.NowDate = new Date().getTime();

		if(this.StartingDate == 0) { // on cherche la date de départ de chargement
			this.StartingDate = new Date().getTime();
		}

		this.DelayStartNow = this.NowDate - this.StartingDate; // on calcul le délais entre chaque chargement

		return this.DelayStartNow; // on retourne le délais obtenu
	};


	this.TestLoading = function (nbr_de_limage) { // méthode qui test si on doit précharger les images
		this.TestingTheTime = this.VerifLoadingTime(); // on récupère le délais de chargement depuis le début

		if(nbr_de_limage > 0) { // si on a passé la 1ère image
			this.TimePerImage[nbr_de_limage - 1] = (new Date().getTime()) - (this.StartTimer[nbr_de_limage - 1]); // on trouve le temps de chargement de chaque image
		}

		if(this.TestingTheTime <= options.MaxLoadTime) { // si le temps de chargement est inférieur au temps maximum demandé on poursuit le chargement des images
			if(nbr_de_limage <= (this.NombreImages - 1) ) { // si il reste des images à précharger, on les précharge
				this.LoadImage(nbr_de_limage);
			} else { // si on a préchargé toutes les images, on execute le callback demandé
				this.ExecuteCallback(true); // on execute le callback, on précise que toutes les images sont chargées
			}
		} else if(options.CallbackFullTime == true) { // si on a dépassé le temps maximum demandé et que l'utilisateur autorise le callback
			this.ExecuteCallback(false); // on execute le callback, on précise que toutes les images ne sont pas chargées
		}

	};

	this.LoadingWithNoCallback = function () { // méthode qui précharge les images mais sans callback (c'est une sécurité en plus)
		var InitialiseNoCallPreload;
		this.PreloadingImageNoCall = new Array(); // array qui contiendra tous les objets images chargés

		for(InitialiseNoCallPreload = 0; InitialiseNoCallPreload <= (this.NombreImages - 1); InitialiseNoCallPreload++) {
			NbrImageNoCall = (this.NombreImages - 1) - InitialiseNoCallPreload; // de cette manière on commence à précharger les images par la dernière du tableau
			this.PreloadingImageNoCall[InitialiseNoCallPreload] = new Image();
			this.PreloadingImageNoCall[InitialiseNoCallPreload].src = this.ArrayWithImages[NbrImageNoCall];
		}
	};

	this.Cancel = function() { // méthode qui stop le chargement de l'image
		this.ImageCoursChargement.remove();
	};

	this.init = function () { // méthode qui s'occupe de l'initialisation
		this.ArrayWithImages = []; // on définit un Array

		if(isNaN(options.MaxLoadTime) == true || options.MaxLoadTime < 500 || options.MaxLoadTime > 60000 || options.MaxLoadTime == undefined || options.MaxLoadTime == '' || options.MaxLoadTime == null) {
			options.MaxLoadTime = 30000; // si les conditions ci dessus sont ok, on définie le temps maximum de chargement pour toutes les images
		}

		if(this.ArrayImages instanceof Array) { // si on a un tableau d'images
			this.NombreImages = this.ArrayImages.Length(); // on récupère le dernier nombre du tableau des images

			this.ArrayWithImages = this.ArrayImages;

			this.TestLoading(0); // on lance le chargement normal (par HTML) et avec Callback
		} else if(this.ArrayImages != undefined && this.ArrayImages != '' && this.ArrayImages != null) { // si on a une image mais que ce n'est pas un tableau, on crée le tableau avec une seule image
			this.NombreImages = 1; // on définit un tableau à une seule entrée

			this.ArrayWithImages[0] = this.ArrayImages; // on crée le tableau avec une seule image

			this.TestLoading(0); // on lance le chargement normal (par HTML) et avec Callback
		} else { //Sinon, on ne peut pas charger l'image (aucune image specifiee)
			return false;
		}

		if(options.DoubleLoad == undefined || options.DoubleLoad == '' || options.DoubleLoad != null || options.DoubleLoad == true) {
			this.LoadingWithNoCallback(); // on déclenche le double préchargement des images par liste inverse (en commençant par la dernière image) uniquement en JS
		}

		if(options.CallbackFullTime == undefined || options.CallbackFullTime == null) {
			options.CallbackFullTime = true; // CallbackFullTime permet d'executer le callback même quand le temps maximum est dépassé. Elles est true par défaut
		}
	};

	this.init(); // on lance l'initialisation
};
