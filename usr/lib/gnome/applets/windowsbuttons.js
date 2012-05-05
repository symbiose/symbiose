/**
 * SWindowsButtonsApplet represente la barre contenant les boutons des fenetres.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SWindowsButtonsApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var buttons = $('<span></span>');
	
	$.w.window.buttons.appendTo(buttons);
	
	this.content.append(buttons);
}