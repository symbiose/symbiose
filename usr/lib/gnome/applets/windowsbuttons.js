/**
 * SWindowsButtonsApplet represente la barre contenant les boutons des fenetres.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
function SWindowsButtonsApplet(data) {
	SApplet.call(this, data); //Heritage de SApplet
	
	var $buttons = $('<span></span>', { 'class': 'windows-buttons' });
	
	var buttons = {};
	$('#desktop').bind('windowopen', function(e, data) {
		var thisWindow = $(data.window);
		
		if (thisWindow.window('option', 'parentWindow').length > 0) {
			return;
		}
		
		var button = $('<span></span>', { 'class': 'window-button' })
			.click(function() {
				thisWindow.window('hideOrShowOrToForeground');
			})
			.append(
				$('<img />', { src: thisWindow.window('option', 'icon').realpath(17), alt: 'icon' }),
				$('<span></span>', { 'class': 'title' }).html(thisWindow.window('option', 'title'))
			);
		
		buttons[thisWindow.window('id')] = button;
		
		button.hide().appendTo($buttons);
		button.fadeIn('fast');
	}).bind('windowtoforeground', function(e, data) {
		var thisWindow = $(data.window);
		
		if (buttons[thisWindow.window('id')]) {
			buttons[thisWindow.window('id')].addClass('active');
		} else if (thisWindow.window('option', 'parentWindow').length > 0) {
			buttons[thisWindow.window('option', 'parentWindow').window('id')].addClass('active');
		}
	}).bind('windowtobackground', function(e, data) {
		var thisWindow = $(data.window);
		
		if (buttons[thisWindow.window('id')]) {
			buttons[thisWindow.window('id')].removeClass('active');
		} else if (thisWindow.window('option', 'parentWindow').length > 0) {
			buttons[thisWindow.window('option', 'parentWindow').window('id')].removeClass('active');
		}
	}).bind('windowclose', function(e, data) {
		var thisWindow = $(data.window);
		
		if (buttons[thisWindow.window('id')]) {
			buttons[thisWindow.window('id')].remove();
		}
	});
	
	$.webos.window.setHidePosFn(function(thisWindow) {
		if (buttons[thisWindow.window('id')]) {
			return buttons[thisWindow.window('id')].offset();
		}
	});
	
	this.content.append($buttons);
}