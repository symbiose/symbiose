/**
 * SCalendarApplet represente le menu affichant l'heure.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SCalendarApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet

	var content = $('<ul></ul>', { 'class': 'menu' });
	this.content.append(content);

	var menu = $('<li></li>').appendTo(content);
	var dateBox = $('<a></a>', { href: '#' }).appendTo(menu);
	
	var days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
	var months = ['janvier', 'f&eacute;vrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'a&ocirc;ut', 'septembre', 'octobre', 'novembre', 'd&eacute;cembre'];

	var showTime = function() {
		var myDate = new Date();
		var hour = myDate.getHours();
		var minute = myDate.getMinutes();
		var dayName = days[myDate.getDay()].substr(0, 3) + '.';
		var dayNbr = myDate.getDate();
		var month = months[myDate.getMonth()];
		if (hour < 10) { hour = '0' + hour; }
		if (minute < 10) { minute = '0' + minute; }
		var theDate = dayName + ' ' + dayNbr + ' ' + month + ', ' + hour + ':' + minute;
		dateBox.text(theDate);
		setTimeout(function() {
			showTime();
		}, 60000);
	};
	showTime();
}