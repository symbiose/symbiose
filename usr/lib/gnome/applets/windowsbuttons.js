/**
 * Webos.Dashboard.Applet.WindowsButtons represente la barre contenant les boutons des fenetres.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.WindowsButtons = function WWindowsButtonsApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	var $buttons = $('<span></span>', { 'class': 'windows-buttons' });

	var onWindowOpen = function(thisWindow) {
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

		if (thisWindow.window('workspace').id() == $.w.window.workspace.getCurrent().id()) {
			button.fadeIn('fast');
		}
	};
	
	var buttons = {};
	$(document).bind('windowopen', function(e, data) {
		onWindowOpen($(data.window));
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
			delete buttons[thisWindow.window('id')];
		}
	});
	
	$.webos.window.setHidePosFn(function(thisWindow) {
		if (buttons[thisWindow.window('id')]) {
			return buttons[thisWindow.window('id')].offset();
		}
	});

	$.w.window.workspace.bind('switch', function(data) {
		for (var id in buttons) {
			var $thisWindow = $.webos.window.getWindowById(id);
			buttons[id].toggle(($thisWindow.window('workspace').id() == data.current));
		}
	});

	var $openedWindows = $.webos.window.getWindows();
	if ($openedWindows.length) {
		$openedWindows.each(function() {
			onWindowOpen($(this));
		});
	}
	
	this.content.append($buttons);
}