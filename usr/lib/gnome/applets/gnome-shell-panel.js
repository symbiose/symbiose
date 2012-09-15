/**
 * Webos.Dashboard.Applet.GnomeShellPanel represente le menu principal de GNOME Shell.
 * @param data Les informations sur l'applet.
 * @author $imon
 * @version 1.0
 */
Webos.Dashboard.Applet.GnomeShellPanel = function WGnomeShellPanelApplet(data) {
	Webos.Dashboard.Applet.call(this, data); //Heritage de Webos.Dashboard.Applet
	
	new Webos.ScriptFile('usr/lib/gnome-shell/shell.js');
	
	var that = this;
	
	//On charge les traductions
	Webos.Translation.load(function(t) {
		var menuContent = $('<ul></ul>', { 'class': 'menu' });
		that.content.append(menuContent);
		
		var $menu = $('<li><a href="#">'+t.get('Activities')+'</a></li>').appendTo(menuContent);
		var $appMenu = $('<li id="shell-appmenu"><a href="#"></a></li>').appendTo(menuContent);
		
		Shell.bind('show', function() {
			$appMenu.hide();
			$menu.addClass('hover');
		});
		Shell.bind('hide', function() {
			$appMenu.show();
			$menu.removeClass('hover');
		});
		
		var mouseEntered = false, shellToggled = false;
		$menu.click(function(e) {
			Shell.toggle();
			
			e.stopPropagation();
			e.preventDefault();
		}).mouseenter(function(e) {
			mouseEntered = !(e.pageX == 0 && e.pageY == 0);
			
			if (e.pageY != 0) {
				shellToggled = false;
			}
		}).mousemove(function(e) {
			if (mouseEntered && !shellToggled && e.pageX < 10 && e.pageY < 10) {
				if (!$($.webos.window.getActive()).is('.dragging')) {
					Shell.toggle();
					shellToggled = true;
				}
			}
		});
		
		var appMenuWindow = $();
		$(document).bind('windowopen windowtoforeground', function(event, ui) {
			var thisWindow = $(ui.window);
			if (typeof thisWindow.window('option', 'parentWindow') != 'undefined' && thisWindow.window('option', 'parentWindow').length > 0) {
				thisWindow = thisWindow.window('option', 'parentWindow');
			}
			
			if (typeof appMenuWindow != 'undefined' && thisWindow.window('id') == appMenuWindow.window('id')) {
				return;
			}
			
			$appMenu.empty();
			var $appMenuTitle = $('<a></a>', { href: '#' }).appendTo($appMenu);
			var $iconContainer = $('<span></span>', { 'class': 'icon-container' }).appendTo($appMenuTitle);
			$('<img />', { src: thisWindow.window('option', 'icon').realpath(48), alt: '', 'class': 'icon' }).appendTo($iconContainer);
			$('<span></span>', { 'class': 'icon-overlay' }).appendTo($iconContainer);
			var loadingImg = $('<div></div>', { 'class': 'loading' }).appendTo($appMenuTitle);
			var $title = $('<span></span>', { 'class': 'title' }).html(thisWindow.window('option', 'title')).appendTo($appMenuTitle);
			$appMenuContent = $('<ul></ul>').appendTo($appMenu);
			var $quitItem = $('<li>'+t.get('Quit ${app}', { app: thisWindow.window('option', 'title') })+'</li>').click(function() {
				thisWindow.window('close');
			}).appendTo($appMenuContent);
			
			if (!thisWindow.window('is', 'loading')) {
				loadingImg.hide();
			}
			
			var loadingStartHandler = function() {
				loadingImg.show();
			};
			var loadingStopHandler = function() {
				loadingImg.hide();
			};
			var changeTitleHandler = function() {
				$title.html(thisWindow.window('option', 'title'));
				$quitItem.html(t.get('Quit ${app}', { app: thisWindow.window('option', 'title') }));
			};
			thisWindow
				.bind('windowloadingstart', loadingStartHandler)
				.bind('windowloadingstop', loadingStopHandler)
				.bind('windowchangetitle', changeTitleHandler)
				.one('windowclose windowtobackground', function() {
					thisWindow
						.unbind('windowloadingstart', loadingStartHandler)
						.unbind('windowloadingstop', loadingStopHandler)
						.unbind('windowchangetitle', changeTitleHandler);
				});
			
			appMenuWindow = thisWindow;
		}).bind('windowclose windowtobackground', function(event, ui) {
			if (ui.window.is(appMenuWindow)) {
				$appMenu.empty();
				appMenuWindow = undefined;
			}
		});
	}, 'gnome-shell');
};