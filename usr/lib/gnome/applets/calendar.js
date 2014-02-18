/**
 * Webos.Dashboard.Applet.Calendar represente le menu affichant l'heure.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.Calendar = function WCalendarApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet

	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);

	var menu = $('<li></li>').appendTo(content);
	var dateBox = $('<a></a>', { href: '#' }).appendTo(menu);
	
	var showTime = function() {
		var locale = Webos.Locale.current();
		
		var theDate = locale.dateAbbreviation(new Date()) + ', ' + locale.time(new Date());
		
		dateBox.html(theDate);
	};
	
	setTimeout(function() { //Quand la minute actuelle est passee
		setInterval(function() { //On rafraichit l'heure toutes les minutes
			showTime();
		}, 60000);
		
		showTime();
	}, (60 - new Date().getSeconds()) * 1000);
	
	Webos.Locale.bind('change', function() { //Lors du changement des preferences de localisation, on rafraichit l'heure
		showTime();
	});
	
	showTime(); //On affiche l'heure
};