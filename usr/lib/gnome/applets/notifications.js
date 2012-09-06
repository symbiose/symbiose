/**
 * Webos.Dashboard.Applet.NotificationsArea represente la zone de notification.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.NotificationsArea = function WNotificationsAreaApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	this.content.append(SIndicator.container);
};