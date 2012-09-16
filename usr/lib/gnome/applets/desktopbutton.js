/**
 * Webos.Dashboard.Applet.DesktopButton represente le bouton permettantd'afficher ou cacher toutes les fenetres.
 * @param data Les donnees de l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.DesktopButton = function WDesktopButtonApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var showed = {};
	var button = $('<span></span>', { 'class': 'desktop-button' }).click(function() {
		var list = $.w.window.workspace.getCurrent().getWindows();
		var workspaceId = $.w.window.workspace.getCurrent().getId();
		if (typeof showed[workspaceId] == 'undefined') {
			showed[workspaceId] = true;
		}
		for(var i = 0; i < list.length; i++) {
			if ((list[i].is(':visible') && showed[workspaceId])) {
				list[i].window('hide');
			}
			if ((!list[i].is(':visible') && !showed[workspaceId])) {
				list[i].window('show');
			}
		}
		showed[workspaceId] = (showed[workspaceId]) ? false : true;
	});
	var separator = $('<img />', { src: 'usr/share/images/gnome/separator.png', 'class': 'separator' });
	this.content.append(button).append(separator);
};