/**
 * SWorkspaceSwitcherApplet represente le selecteur d'espace de travail.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SWorkspaceSwitcherApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	this.content.append(SWorkspace.switcher.attr('id', 'workspace-switcher'));
}