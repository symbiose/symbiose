/**
 * SNotificationsApplet represente la zone de notification.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SNotificationsAreaApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	this.content.append(SIndicator.container);
}