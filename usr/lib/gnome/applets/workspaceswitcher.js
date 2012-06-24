/**
 * Webos.Dashboard.Applet.WorkspaceSwitcher represente le selecteur d'espace de travail.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.WorkspaceSwitcher = function WWorkspaceSwitcherApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	this.content.append(SWorkspace.switcher.attr('id', 'workspace-switcher'));
};