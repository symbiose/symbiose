/**
 * $.w.window.workspace represente un espace de travail.
 */
$.w.window.workspace = function WWindowWorkspace() {
	Webos.Observable.call(this);
	
	this._id = $.w.window.workspace.list.push(this) - 1;
	var id = this._id;
	
	var that = this;
	
	this.switchTo = function(workspaceId) {
		var windowsList = this.windows();
		var that = this;
		/*var desktopWidth = $('#desktop').width() * ($.w.window.workspace.current - workspaceId);*/
		
		if (this.id() == workspaceId) {
			var doWindowEffectFn = function(thisWindow) {
				/*thisWindow.addClass('animating').animate({
					left: '+='+desktopWidth+'px'
				}, 'normal', function() {
					$(this).removeClass('animating');
				});*/
				thisWindow.show();
			};
			
			this._button.addClass('selected','normal');
		} else {
			var doWindowEffectFn = function(thisWindow) {
				/*thisWindow.addClass('animating').animate({
					left: '+='+desktopWidth+'px'
				}, 'normal', function() {
					$(this).removeClass('animating');
					var leftX = $(this).offset().left;
					var rightX = leftX + $(this).width();
					if (rightX > 0 && leftX < $('#desktop').width()) {
						thisWindow.window('workspace', $.w.window.workspace.get(workspaceId));
						thisWindow.window('button').show();
					}
				});*/
				thisWindow.window('toBackground').hide();
			};
			
			this._button.removeClass('selected','normal');
		}
		
		for(var i=0; i < windowsList.length; i++) {
			doWindowEffectFn(windowsList[i]);
		}
	};

	this.remove = function() { //Supprimer l'espace de travail
		var windowsList = this.windows();
		for(var i = 0; i < windowsList.length; i++) {
			windowsList[i].window('close');
		}
		
		this._button.remove();
	};
	this.id = function() { //Recuperer l'ID de l'espace de travail
		return this._id;
	};
	this.getId = function() {
		return this.id();
	};
	this.windows = function() { //Recuperer toutes les fenetres de l'espace de travail
		var list = [];
		var id = this._id;
		$.webos.window.getWindows().each(function() {
			if ($(this).window('workspace').id() == id) {
				list.push($(this));
			}
		});
		return list;
	};
	this.getWindows = function() {
		return this.windows();
	};
	
	this._button = $('<span></span>', { 'class': 'workspace-button', title: 'Espace de travail '+(id+1) })
		.click(function() {
			$.w.window.workspace.switchTo(that.getId());
		})
		.appendTo($.w.window.workspace.switcher);
	
	if (!$.w.window.workspace.getCurrent()) {
		$.w.window.workspace.switchTo(this.id());
	}
};
Webos.inherit($.w.window.workspace, Webos.Observable);
Webos.Observable.build($.w.window.workspace);

$.w.window.workspace.switcher = $('<div></div>');
$.w.window.workspace.list = []; //Liste de tous les espaces de travail
$.w.window.workspace.current = undefined; //Espace de travail courrant
$.w.window.workspace.get = function(id) {
	for (var i = 0; i < $.w.window.workspace.list.length; i++) {
		if ($.w.window.workspace.list[i].id() === id) {
			return $.w.window.workspace.list[i];
		}
	}
};
$.w.window.workspace.getList = function() {
	return $.w.window.workspace.list;
};
$.w.window.workspace.getCurrent = function() { //Recuperer l'espace de travail actuel
	return $.w.window.workspace.get($.w.window.workspace.current);
};
$.w.window.workspace.switchTo = function(id) { //Se deplacer vers un autre espace de travail
	if ($.w.window.workspace.current === id) {
		return;
	}
	
	var workspace = $.w.window.workspace.get(id);
	if (typeof workspace == 'undefined') {
		return;
	}
	
	var old = $.w.window.workspace.current;
	if (typeof $.w.window.workspace.current != 'undefined') {
		$.w.window.workspace.getCurrent().switchTo(id);
	}
	workspace.switchTo(id);
	$.w.window.workspace.current = id;
	
	$.w.window.workspace.notify('switch', { old: old, current: id });
};
$.w.window.workspace.remove = function(id) {
	if ($.w.window.workspace.current === id) {
		return;
	}
	
	var workspace = $.w.window.workspace.get(id);
	if (!workspace) {
		return;
	}
	
	workspace.remove();
	
	var newList = [], actualList = $.w.window.workspace.getList();
	for (var i = 0; i < actualList.length; i++) {
		if (actualList[i].id() != id) {
			newList.push(actualList[i]);
		}
	}
	$.w.window.workspace.list = newList;
	
	$.w.window.workspace.notify('remove', { removed: id });
};
