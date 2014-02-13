var $rootEl = Webos.UserInterface.Booter.current().element();

$rootEl.on('click', 'ul.menu > li', function (event) {
	var $menu = $(this);
	var $subMenu = $menu.children('ul').first();

	$menu.addClass('hover');

	var hideMenu = function() {
		//On cache le menu
		if ($subMenu.length > 0) {
			$subMenu.css({
				opacity: '',
				display: ''
			});
			$subMenu.removeClass('opened');
		}
		//On le deselectionne
		$menu.removeClass('hover');
		//On cache les sous-menus parents
		$menuParents = $menu.parents('ul.menu li');
		$menuParents.removeClass('hover');
		$menuParents.filter('ul.menu li ul li').hide();
	};

	$(document).on('click.menu.elementary', function (e) {
		var $elementMenu = $(e.target).parents().filter($menu);
		//Si on clique sur le menu
		if ($elementMenu.length > 0) {
			//On n'execute pas l'action par defaut pour ne pas changer de page
			e.preventDefault();
			
			var $thisMenu = ($(e.target).is('li')) ? $(e.target) : $(e.target).parents('li').first();

			//Si cet item contient un sous-menu
			if ($thisMenu.children('ul').length > 0 && $thisMenu.children('ul').html() != '') {
				//On l'affiche
				$thisMenu.children('ul').first().show();
				return;
			} //Sinon, c'est un item simple (sans sous-menu)
		} //Sinon, on clique sur autre chose que le menu
		
		hideMenu();
		$(this).off('click.menu.elementary');
	});

	//Si cet item contient un sous-menu
	if ($menu.children('ul').length > 0 && $menu.children('ul').children().length > 0) {
		//On l'affiche
		if ($subMenu.is(':hidden')) {
			var parentPosition = $menu.parent().offset();
			var subMenuPosition = {
				top: parentPosition.top + $menu.outerHeight() + 18,
				left: 0,
				opacity: 0
			};
			$subMenu.css(subMenuPosition).show();

			var subMenuOffset = $subMenu.offset();
			var maxX = subMenuOffset.left + ($subMenu.outerWidth() + $subMenu.outerWidth(true)) / 2;

			if(maxX > $(document).width()) { // Si le menu est trop a droite, on le decale a gauche
				subMenuPosition.left = subMenuPosition.left - (maxX - $(document).width());
				$subMenu.css('left', subMenuPosition.left);
			}

			$subMenu.css({
				opacity: '',
				display: ''
			});

			$subMenu.addClass('opened');
		}
	} else { //Sinon
		//On deselectionne cet item
		$(this).removeClass('hover');
	}
	//On n'execute pas l'action par defaut pour ne pas changer de page
	event.preventDefault();
});

//Si on survolle un item d'un sous-menu
//Deprecated ?
$rootEl.on('mouseenter', 'ul.menu > li li', function (event) {
	//On selectionne l'item du sous-menu
	$(event.target).addClass('hover');
	
	//Si cet item contient lui-meme un sous-menu
	if ($(event.target).children('ul').length > 0) {
		//On l'affiche
		$(event.target).children('ul').first().show();
	}
}).on('mouseleave', 'ul.menu > li li', function (event) { //Quand la souris sort de l'item
	//On deselectionne l'item
	$(event.target).removeClass('hover');
	
	//Si cet item contient lui-meme un sous-menu
	if ($(event.target).children('ul').length > 0) {
		//On cahe le sous-menu
		$(event.target).children('ul').first().hide();
	}
});