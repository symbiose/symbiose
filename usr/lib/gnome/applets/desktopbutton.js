/**
 * SDesktopButtonApplet represente le bouton permettantd'afficher ou cacher toutes les fenetres.
 * @param data Les donnees de l'applet.
 * @author $imon
 * @version 1.0
 */
function SDesktopButtonApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var showed = {};
	var button = $('<span></span>', { 'class': 'desktop-button' }).click(function() {
		var list = SWorkspace.getCurrent().getWindows();
		var workspaceId = SWorkspace.getCurrent().getId();
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
}