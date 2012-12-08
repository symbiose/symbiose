/**
 * Webos.Dashboard represente un tableau de bord.
 * @param id L'id du tableau de bord.
 * @param data Les informations sur le tableau de bord.
 * @param applets Les applets contenus dans ce tableau de bord.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard = function WDashboard(id, data, applets) {
	this.id = id;
	this.data = data;
	this.applets = applets;
	
	/**
	 * Initialiser le tableau de bord.
	 */
	this.init = function() {
		if (this.data.position == 'top') { //Position : haut
			this.content = $('#header');
		}
		if (this.data.position == 'bottom') { //Position : bas
			this.content = $('#footer');
		}
		
		//On insere chaque applet dans ca tableau de bord
		for (var i = 0; i < this.applets.length; i++) {
			this.applets[i].getContent().appendTo(this.content).trigger('insert');
		}
	};
	
	//On initialise le tableau de bord
	this.init();
};

Webos.Dashboard.list = []; //Liste des tableaux de bord

/**
 * Initialiser tous les tableaux de bord.
 */
Webos.Dashboard.init = function(userCallback) {
	var initFn = function(data) {
		data.find('dashboard').each(function() { //Pour chaque tableau de bord
			var id = parseInt($(this).attr('id')), data = {}, applets = [];
			
			//On stocke les attributs du tableau de bord de cote
			$(this).find('attributes').find('attribute').each(function() {
				data[$(this).attr('name')] = $(this).attr('value');
			});
			
			var nbrApplets = 0, loadedApplets = 0;
			var onAppletLoaded = function() {
				loadedApplets++;

				if (nbrApplets == loadedApplets) {
					//On ajoute a la liste le tableau de bord
					Webos.Dashboard.list.push(new Webos.Dashboard(id, data, applets));
				}
			};

			//Pour chaque applet contenu dans ce tableau de bord
			$(this).find('applets').find('applet').each(function() {
				var appletData = {};
				//On recupere les attributs de l'applet
				$(this).find('attribute').each(function() {
					appletData[$(this).attr('name')] = $(this).attr('value');
				});

				nbrApplets++;

				//On charge la bibliotheque de l'applet
				Webos.require(appletData.library, [function() {
					//Si la bibliotheque est chargee
					if (typeof Webos.Dashboard.Applet[appletData.name] != 'undefined') {
						//On initialise l'applet et on l'ajoute a la liste
						applets.push(new Webos.Dashboard.Applet[appletData.name](appletData));
					} else {
						W.Error.trigger('Impossible de charger l\'applet "'+appletData.name+'" : biblioth&egrave;que introuvable');
					}
					onAppletLoaded();
				}, function(response) {
					onAppletLoaded();
					response.triggerError();
				}]);
			});
		});
		
		if (typeof userCallback != 'undefined') {
			userCallback.success();
		}
	};
	
	Webos.User.getLogged(function(user) {
		if (user) {
			new W.XMLFile('~/.theme/'+Webos.UserInterface.Booter.current().name()+'/dashboards.xml', new W.Callback(initFn, function() {
				new W.XMLFile('/usr/etc/uis/'+Webos.UserInterface.Booter.current().name()+'/dashboards.xml', new W.Callback(initFn, function() {
					throw new W.Error('Fichier de configuration par d&eacute;faut introuvable');
				}));
			}));
		} else {
			new W.XMLFile('/usr/etc/uis/'+Webos.UserInterface.Booter.current().name()+'/dashboards.xml', new W.Callback(initFn, function() {
				throw new W.Error('Fichier de configuration par d&eacute;faut introuvable');
			}));
		}
	});
};

/**
 * Recuperer la liste des tableaux de bord.
 * @return Array La liste des tableaux de bord.
 */
Webos.Dashboard.getDashboards = function() {
	return Webos.Dashboard.list;
};

/**
 * Recuperer tous les applets portant un nom specifie.
 * @param name Le nom.
 * @return Array La liste des applets correspondants.
 */
Webos.Dashboard.getAppletsByName = function(name) {
	var list = Webos.Dashboard.getDashboards();
	var result = [];
	
	for(var i = 0; i < list.length; i++) {
		var applets = list[i].applets;
		for (var j = 0; j < applets.length; j++) {
			if (applets[j].getName() == name) {
				result.push(applets[j]);
			}
		}
	}
	
	return result;
};

/**
 * Webos.Dashboard.Applet represente un applet.
 * @param data Les informations sur l'applet (position, etc...)
 */
Webos.Dashboard.Applet = function WApplet(data) {
	this.data = data;
	
	/**
	 * Recuperer la structure HTML de l'applet.
	 * @return jQuery La structure HTML de l'applet.
	 */
	this.getContent = function() {
		return this.content;
	};
	
	/**
	 * Recuperer le nom de l'applet.
	 * @return String Le nom de l'applet.
	 */
	this.getName = function() {
		return this.data.name;
	};
	
	/**
	 * Recharger l'applet.
	 */
	this.reload = function() {
		var name = this.getName();
		var data = this.data;
		var content = this.content;
		
		window['S'+name+'Applet'].call(this, data);
		
		content.replaceWith(this.content);
	};
	
	this.content = $('<span></span>');
	
	//Position de l'applet
	if (this.data.position == 'right') {
		this.content.css('float','right');
	} else {
		this.content.css('float','left');
	}
};