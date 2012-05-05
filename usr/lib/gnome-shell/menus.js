//Lors du clic sur un item de menu
$('ul.menu > li, ul.webos-menuwindowheader > li').live('click', function(event) {
	//On selectionne cet item
	$(this).addClass('hover');
	
	var $menu = $(this);
	
	var hideMenuFn = function() {
		//On cache le menu
		var $subMenu = $menu.children('ul').first();
		if ($subMenu.length > 0) {
			//Effets
			if ($menu.parent().is('ul.menu') && !$.fx.off) {
				$subMenu.animate({
					top: '+=20',
					opacity: 0
				}, 'fast', function() {
					$(this).hide();
				});
			} else {
				$subMenu.hide();
			}
		}
		//On le deselectionne
		$menu.removeClass('hover');
		//On cache les sous-menus parents
		$menuParents = $menu.parents('ul.menu li, ul.webos-menuwindowheader li');
		$menuParents.removeClass('hover');
		$menuParents.filter('ul.menu li ul li, ul.webos-menuwindowheader li ul li').hide();
	};

	$(document).one('click', function(event) {
		var $elementMenu = $(event.target).parents().filter($menu);
		//Si on clique sur le menu
		if ($elementMenu.length > 0) {
			//On n'execute pas l'action par defaut pour ne pas changer de page
			event.preventDefault();
			
			var $thisMenu = ($(event.target).is('li')) ? $(event.target) : $(event.target).parents('li').first();
			
			//Si cet item contient un sous-menu
			if ($thisMenu.children('ul').length > 0 && $thisMenu.children('ul').html() != '') {
				//On l'affiche
				$thisMenu.children('ul').first().show();
				return;
			} //Sinon, c'est un item simple (sans sous-menu)
		} //Sinon, on clique sur autre chose que le menu
		
		hideMenuFn();
	});
	
	//Si cet item contient un sous-menu
	if ($menu.children('ul').length > 0 && $menu.children('ul').html() != '') {
		//On l'affiche
		var $subMenu = $menu.children('ul').first();
		if ($subMenu.is(':hidden')) {
			if ($menu.parent().is('ul.menu')) {
				var parentPosition = $menu.parent().offset();
				var subMenuPosition = {
					top: parentPosition.top + $menu.outerHeight() + 18,
					left: 0
				};
				$subMenu.css(subMenuPosition).show();
				
				var subMenuOffset = $subMenu.offset();
				var maxX = subMenuOffset.left + ($subMenu.outerWidth() + $subMenu.outerWidth(true)) / 2;
				
				if(maxX > $(document).width()) { // Si le menu est trop a droite, on le decale a gauche
					subMenuPosition.left = subMenuPosition.left - (maxX - $(document).width());
					$subMenu.css('left', subMenuPosition.left);
				}
				
				//Effets
				if (!$.fx.off) {
					$subMenu.css({ top: subMenuPosition.top - 20, opacity: 0 }).animate({
						top: '+=20',
						opacity: 1
					}, 'fast');
				} else {
					$subMenu.css('opacity', 1);
				}
			} else {
				$subMenu.show();
			}
		}
	} else { //Sinon
		//On deselectionne cet item
		$(this).removeClass('hover');
	}
	//On n'execute pas l'action par defaut pour ne pas changer de page
	event.preventDefault();
});

//Si on survolle un item d'un sous-menu
$('ul.menu > li li, ul.webos-menuwindowheader > li li').live('mouseenter', function() {
	//On selectionne l'item du sous-menu
	$(this).addClass('hover');
	
	//Si cet item contient lui-meme un sous-menu
	if ($(this).children('ul').length > 0) {
		//On l'affiche
		$(this).children('ul').first().show();
	}
}).live('mouseleave', function() { //Quand la souris sort de l'item
	//On deselectionne l'item
	$(this).removeClass('hover');
	
	//Si cet item contient lui-meme un sous-menu
	if ($(this).children('ul').length > 0) {
		//On cahe le sous-menu
		$(this).children('ul').first().hide();
	}
});