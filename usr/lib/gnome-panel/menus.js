//Lors du clic sur un item de menu
$('ul.menu > li').die('click').live('click', function(event) {
	//On selectionne cet item
	$(this).addClass('hover');
	
	var $menu = $(this);
	
	var hideMenuFn = function() {
		//On cache le menu
		$menu.children('ul').first().hide();
		//On le deselectionne
		$menu.removeClass('hover');
		//On cache les sous-menus parents
		$menuParents = $menu.parents('ul.menu li');
		$menuParents.removeClass('hover');
		$menuParents.filter('ul.menu li ul li').hide();
	};
	
	//Lorsque l'on clique sur la page
	var clickFn = function(event) {
		//On enleve le callback
		$(document).unbind('click', clickFn);
		
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
	};
	$(document).click(clickFn);
	
	//Si cet item contient un sous-menu
	if ($(this).children('ul').length > 0 && $(this).children('ul').html() != '') {
		//On l'affiche
		$(this).children('ul').first().show();
	} else { //Sinon
		//On deselectionne cet item
		$(this).removeClass('hover');
	}
	//On n'execute pas l'action par defaut pour ne pas changer de page
	event.preventDefault();
});

//Si on survolle un item d'un sous-menu
$('ul.menu > li li').die('mouseenter mouseleave').live('mouseenter', function() {
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