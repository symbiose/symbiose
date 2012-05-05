/**
 * SWorkspace represente un espace de travail.
 */
function SWorkspace() {
	this.id = SWorkspace.list.push(this) - 1;
	var id = this.id;
	
	var that = this;
	
	this.switchTo = function(workspaceId) {
		var windowsList = this.getWindows();
		var that = this;
		var desktopWidth = $('#desktop').width() * (SWorkspace.current - workspaceId);
		
		if (this.getId() == workspaceId) {
			var doWindowEffectFn = function(thisWindow) {
				thisWindow.addClass('animating').animate({
					left: '+='+desktopWidth+'px'
				}, 'normal', function() {
					$(this).removeClass('animating');
				});
				thisWindow.window('button').show();
			};
			
			this._button.addClass('selected','normal');
		} else {
			var doWindowEffectFn = function(thisWindow) {
				thisWindow.addClass('animating').animate({
					left: '+='+desktopWidth+'px'
				}, 'normal', function() {
					$(this).removeClass('animating');
					var leftX = $(this).offset().left;
					var rightX = leftX + $(this).width();
					if (rightX > 0 && leftX < $('#desktop').width()) {
						thisWindow.window('workspace', SWorkspace.get(workspaceId));
						thisWindow.window('button').show();
					}
				});
				thisWindow.window('button').hide();
			};
			
			this._button.removeClass('selected','normal');
		}
		
		for(var i=0; i < windowsList.length; i++) {
			if (!windowsList[i].is('.hidden-window')) {
				doWindowEffectFn(windowsList[i]);
			}
		}
	};
	
	this.hide = function() { //Cacher les fenetres de l'espace de travail
		var windowsList = this.getWindows();
		var that = this;
		var desktopWidth = $('#desktop').width();
		var doWindowEffectFn = function(thisWindow) {
			var position = thisWindow.position();
			thisWindow.addClass('animating').animate({
				left: '-='+desktopWidth+'px'
			}, 'normal', function() {
				$(this).removeClass('animating');
			});
		};
		for(var i=0; i < windowsList.length; i++) {
			if (!windowsList[i].is('.hidden-window')) {
				doWindowEffectFn(windowsList[i]);
			}
			windowsList[i].window('button').hide();
		}
		this._button.removeClass('selected','normal');
	};
	this.show = function() { //Afficher les fenetres de l'espace de travail
		var windowsList = this.getWindows();
		var that = this;
		var desktopWidth = $('#desktop').width();
		var doWindowEffectFn = function(thisWindow) {
			thisWindow.show();
			var position = thisWindow.position();
			thisWindow
				.addClass('animating')
				.animate({
					left: '+='+desktopWidth+'px'
				}, 'normal', function() {
					$(this).removeClass('animating');
					if ($(this).is(':visible')) {
						$(this).window('workspace', that);
					}
				});
		};
		for(var i=0; i < windowsList.length; i++) {
			if (!windowsList[i].is('.hidden-window')) {
				doWindowEffectFn(windowsList[i]);
			}
			windowsList[i].window('button').show();
		}
		this._button.addClass('selected','normal');
	};
	this.remove = function() { //Supprimer l'espace de travail
		var windowsList = this.getWindows();
		for(var i = 0; i < windowsList.length; i++) {
			windowsList[i].close();
		}
		
		this._button.remove();
		
		delete SWorkspace.list[this.id];
	};
	this.getId = function() { //Recuperer l'ID de l'espace de travail
		return this.id;
	};
	this.getWindows = function() { //Recuperer toutes les fenetres de l'espace de travail
		var list = [];
		var id = this.id;
		$.webos.window.getWindows().each(function() {
			if ($(this).window('workspace').getId() == id) {
				list.push($(this));
			}
		});
		return list;
	};
	
	this._button = $('<span></span>', { 'class': 'workspace-button', title: 'Espace de travail '+(id+1) })
		.click(function() {
			SWorkspace.switchTo(that.getId());
		})
		.appendTo(SWorkspace.switcher);
}

SWorkspace.switcher = $('<div></div>');
SWorkspace.list = []; //Liste de tous les espaces de travail
SWorkspace.current = undefined; //Espace de travail courrant
SWorkspace.get = function(id) {
	return SWorkspace.list[id];
};
SWorkspace.getCurrent = function() { //Recuperer l'espace de travail actuel
	return SWorkspace.get(SWorkspace.current);
};
SWorkspace.switchTo = function(id) { //Se deplacer vers un autre espace de travail
	if (SWorkspace.current == id) {
		return;
	}
	if (SWorkspace.current != undefined) {
		SWorkspace.list[SWorkspace.current].switchTo(id);
	}
	SWorkspace.list[id].switchTo(id);
	SWorkspace.current = id;
};