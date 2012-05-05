/**
 * SDashboard represente un tableau de bord.
 * @param id L'id du tableau de bord.
 * @param data Les informations sur le tableau de bord.
 * @param applets Les applets contenus dans ce tableau de bord.
 * @author $imon
 * @version 1.0
 */
function SDashboard(id, data, applets) {
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
}

SDashboard.userConfigFile = '~/.gnome/dashboards.xml';
SDashboard.defaultConfigFile = '/usr/etc/gnome/dashboards.xml';
SDashboard.list = []; //Liste des tableaux de bord

/**
 * Initialiser tous les tableaux de bord.
 */
SDashboard.init = function(userCallback) {
	var successCallback = function(data) {
		data.find('dashboard').each(function() { //Pour chaque tableau de bord
			var id = parseInt($(this).attr('id'));
			var data = {};
			var applets = [];
			
			//On stocke les attributs du tableau de bord de cote
			$(this).find('attributes').find('attribute').each(function() {
				data[$(this).attr('name')] = $(this).attr('value');
			});
			
			//Pour chaque applet contenu dans ce tableau de bord
			$(this).find('applets').find('applet').each(function() {
				var appletData = {};
				//On recupere les attributs de l'applet
				$(this).find('attribute').each(function() {
					appletData[$(this).attr('name')] = $(this).attr('value');
				});
				
				//On charge la bibliotheque de l'applet
				new W.ScriptFile(appletData.library);
				
				//Si la bibliotheque est chargee
				if (typeof window['S'+appletData.name+'Applet'] != 'undefined') {
					//On initialise l'applet et on l'ajoute a la liste
					applets.push(new window['S'+appletData.name+'Applet'](appletData));
				} else {
					//Sinon on lance une erreur
					throw new W.Error('Impossible de charger l\'applet "'+appletData.name+'"');
				}
			});
			
			//On ajoute a la liste le tableau de bord
			SDashboard.list.push(new SDashboard(id, data, applets));
		});
		
		if (typeof userCallback != 'undefined') {
			userCallback.success();
		}
	};
	
	var callback = new W.Callback(successCallback, function() {
		new W.XMLFile(SDashboard.defaultConfigFile, new W.Callback(successCallback, function() {
			throw new W.Error('Fichier de configuration par d&eacute;faut introuvable');
		}));
	});
	
	new W.XMLFile(SDashboard.userConfigFile, callback);
};

/**
 * Recuperer la liste des tableaux de bord.
 * @return Array La liste des tableaux de bord.
 */
SDashboard.getDashboards = function() {
	return SDashboard.list;
};

/**
 * Recuperer tous les applets portant un nom specifie.
 * @param name Le nom.
 * @return Array La liste des applets correspondants.
 */
SDashboard.getAppletsByName = function(name) {
	var list = SDashboard.getDashboards();
	var result = [];
	
	for(var i = 0; i < list.length; i++) {
		var applets = list[i].applets;
		for (j = 0; j < applets.length; j++) {
			if (applets[j].getName() == name) {
				result.push(applets[j]);
			}
		}
	}
	
	return result;
};

/**
 * SApplet represente un applet.
 * @param data Les informations sur l'applet (position, etc...)
 */
function SApplet(data) {
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
		this.content.css('float','left')
	}
}