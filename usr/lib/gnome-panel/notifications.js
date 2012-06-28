/* ----------- notifications.js ----------- v1.0 ----------- Par Doppelganger ----------- Le  01/06/2011


==== CLASSE JAVASCRIPT QUI GERE LES NOTIFICATION ( MESSAGES EN HAUT A DROITE )

Cette Classe requiert les fichiers suivants:

	-lib/imageload.js
	-lib/plugin-notifications.js

*/

new W.ScriptFile('usr/lib/gnome/jquery.jgrowl.js');

function SNotification (options) {

	this.options = options; // on récupère les options que l'utilisateur a défini

	var self = this; // on conserve l'objet

	this.init = function () { // méthode qui crée la notification demandée
		$.jGrowl(options.message, {
			imageURL: 		W.Icon.toIcon(options.icon).realpath(48),
			header: 		options.title,
			life: 			parseInt(options.life) * 1000,
			open: function(e,m,o) {
				$(e).hover(function(event){
					var position = $(e).offset();
					var dimentions = { height: $(e).outerHeight(), width: $(e).outerWidth() };
					$('body').mousemove(function(event) {
						if ((event.pageX < position.left || event.pageX > position.left + dimentions.width) &&
						(event.pageY < position.top || event.pageY > position.top + dimentions.height)) {
							$('body').unbind(event);
							//alert('mouse: x'+event.pageX+', y'+event.pageY+'; element: x'+position.left+', y'+position.top);
							$(e).show();
						}
					});
					$(e).hide();
				});
				
				if (options.open != undefined) {
					options.open(e,m,o);
				}
			}
		});
	};

	this.init(); // on lance l'initialisation
}

$.webos.notification = function(options) {
	return new SNotification(options);
};

Webos.AppIndicator = function WAppIndicator(options) {
	this.options = options;
	
	this.element = $('<li></li>').appendTo(SIndicator.container);
	var indicator = $('<a href="#"></a>').appendTo(this.element);
	$('<img />', { src: W.Icon.toIcon(options.icon).realpath(22), 'class': 'icon' }).appendTo(indicator);
	indicator.append(options.title);
	$('<ul></ul>').html((typeof options.menu != 'undefined') ? options.menu : '').appendTo(this.element);
	
	this.remove = function() {
		this.element.remove();
	};
	
	if (typeof options.click != 'undefined') {
		indicator.click(options.click);
	}
};

function SIndicator(item) {
	item.appendTo(SIndicator.container);
	
	this.remove = function() {
		item.remove();
	};
}

SIndicator.container = $('<ul></ul>', { 'class': 'menu' });