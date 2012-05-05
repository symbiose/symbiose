// jQuery Context Menu Plugin
//
// Version 1.00
//
// Cory S.N. LaViska
// A Beautiful Site (http://abeautifulsite.net/)
//
// Visit http://abeautifulsite.net/notebook/80 for usage and more information
//
// Terms of Use
//
// This software is licensed under a Creative Commons License and is copyrighted
// (C)2008 by Cory S.N. LaViska.
//
// For details, visit http://creativecommons.org/licenses/by/3.0/us/
//
// REVU PAR DOPPELGANGER
// REVU PAR $IMON
if(jQuery)( function() {
	$.extend($.fn, {

		contextMenu: function(o, callback) {

			// Defaults
			if( o.menu == undefined ) return false;
			if( o.inSpeed == undefined ) o.inSpeed = 100;
			if( o.outSpeed == undefined ) o.outSpeed = 100;
			// 0 needs to be -1 for expected results (no fade)
			if( o.inSpeed == 0 ) o.inSpeed = -1;
			if( o.outSpeed == 0 ) o.outSpeed = -1;
			// Loop each context menu
			$(this).each(function() {
				var el = $(this);
				var offset = $(el).offset();
				// Add contextMenu class
				o.menu.addClass('contextMenu').appendTo('body');
				// Simulate a true right click
				$(this).bind("contextmenu", function(e) {
					var evt = e;
						// ajout par Doppelganger pour éviter les menus des parents en même temps que les enfants
						var test_si_menu_existe = $('#enregistrer_menu_contextuels').attr('class');

						var srcElement = $(this);
						if( test_si_menu_existe == 'menu_contextuel_libre') {

							$('#enregistrer_menu_contextuels').attr('class','menu_contextuel_occupe');// on dit qu'un menu est déja là

							// Hide context menus that may be showing
							$(".contextMenu").hide();
							// Get this context menu
							var menu = o.menu;
							if( $(el).hasClass('disabled') ) return false;
							
							// Detect mouse position
							var d = {}, x, y;
							if( self.innerHeight ) {
								d.pageYOffset = self.pageYOffset;
								d.pageXOffset = self.pageXOffset;
								d.innerHeight = self.innerHeight;
								d.innerWidth = self.innerWidth;
							} else if( document.documentElement && document.documentElement.clientHeight ) {
								d.pageYOffset = document.documentElement.scrollTop;
								d.pageXOffset = document.documentElement.scrollLeft;
								d.innerHeight = document.documentElement.clientHeight;
								d.innerWidth = document.documentElement.clientWidth;
							} else if( document.body ) {
								d.pageYOffset = document.body.scrollTop;
								d.pageXOffset = document.body.scrollLeft;
								d.innerHeight = document.body.clientHeight;
								d.innerWidth = document.body.clientWidth;
							}
							(e.pageX) ? x = e.pageX : x = e.clientX + d.scrollLeft;
							(e.pageY) ? y = e.pageY : x = e.clientY + d.scrollTop;

							// ajouts par Doppelganger
							var taille_y_content = menu.height(); // hauteur du menu
							var taille_x_content = menu.width(); // largeur du menu 

							var taille_y_fenetre = $(document).height(); // hauteur de la page
							var taille_x_fenetre = $(document).width(); // largeur de la page

							var total_hauteur = y + taille_y_content;
							var total_largeur = x + taille_x_content;

							$('ul.contextMenu li ul').css({'margin':'-27px 0px 0 '+taille_x_content+'px','-moz-box-shadow':'5px 4px 12px black','-webkit-box-shadow':'5px 4px 12px black','box-shadow':'5px 4px 12px black'}); // on dÃ©finie la faÃ§on dont apparaissent les sous-menus par dÃ©faut


							if(total_hauteur > taille_y_fenetre) { // si le curseur est en bas de page, on remonte le menu contextuel
							y = y - taille_y_content;
							}

							if(total_largeur > taille_x_fenetre) { // si le curseur est trop Ã  droite, on le dÃ©cale Ã  gauche
							x = x - taille_x_content;
							}

							if((total_largeur + taille_x_content) > taille_x_fenetre) { // si on dont les sous-menus apparaissent on modifie la faÃ§on dont les sous-menus apparaissent
		
							$('ul.contextMenu li ul').css({'margin':'-27px 0px 0 -'+taille_x_content+'px','-moz-box-shadow':'0px 4px 12px black','-webkit-box-shadow':'0px 4px 12px black','box-shadow':'0px 4px 12px black'});
							}
							
							var clickFn = function() {
								$(document).unbind('click', clickFn).unbind('keypress');
								$('#enregistrer_menu_contextuels').attr('class','menu_contextuel_libre'); // on dit que le menu est libre
								$(menu).fadeOut(o.outSpeed);
								return false;
							};

							// Show the menu
							$(document).unbind('click', clickFn);
							$(menu).css({ top: y, left: x }).fadeIn(o.inSpeed);
							// Hover events
							$(menu).find('a').mouseover( function() {
								$(menu).find('li.hover').removeClass('hover');
								$(this).parent().addClass('hover');
							}).mouseout( function() {
								$(menu).find('li.hover').removeClass('hover');
							});
							
							// Keyboard
							$(document).keypress( function(e) {
								switch( e.keyCode ) {
									case 38: // up
										if( $(menu).find('li.hover').size() == 0 ) {
											$(menu).find('li:last').addClass('hover');
										} else {
											$(menu).find('li.hover').removeClass('hover').prevAll('LI:not(.disabled)').eq(0).addClass('hover');
											if( $(menu).find('li.hover').size() == 0 ) $(menu).find('LI:last').addClass('hover');
										}
									break;
									case 40: // down
										if( $(menu).find('li.hover').size() == 0 ) {
											$(menu).find('li:first').addClass('hover');
										} else {
											$(menu).find('li.hover').removeClass('hover').nextAll('LI:not(.disabled)').eq(0).addClass('hover');
											if( $(menu).find('li.hover').size() == 0 ) $(menu).find('LI:first').addClass('hover');
										}
									break;
									case 13: // enter
										$(menu).find('LI.hover A').trigger('click');
									break;
									case 27: // esc
										$(document).trigger('click');
									break;
								}
							});
							
							// When items are selected
							var itemSelect = function() {
								$(document).unbind('click', clickFn).unbind('keypress');
								$('#enregistrer_menu_contextuels').attr('class','menu_contextuel_libre'); // on dit que les menus sont libres
								$(".contextMenu").fadeOut(o.outSpeed);
								// Callback
								if( callback ) callback( $(this).attr('href').substr(1), $(srcElement), {x: x - offset.left, y: y - offset.top, docX: x, docY: y} );
							};
							o.menu.find('a').unbind('click', itemSelect);
							o.menu.find('li:not(.disabled) a').click(itemSelect);
							
							// Hide bindings
							setTimeout( function() { // Delay for Mozilla
								$(document).click(clickFn);
							}, 0);
						}
				});
				
				// Disable text selection
				if( $.browser.mozilla ) {
					o.menu.each( function() { $(this).css({ 'MozUserSelect' : 'none' }); });
				} else if( $.browser.msie ) {
					o.menu.each( function() { $(this).bind('selectstart.disableTextSelect', function() { return false; }); });
				} else {
					o.menu.each(function() { $(this).bind('mousedown.disableTextSelect', function() { return false; }); });
				}
				// Disable browser context menu (requires both selectors to work in IE/Safari + FF/Chrome)
				$(el).add('UL.contextMenu').bind('contextmenu', function() { return false; });
				
			});
			return $(this);
		},
		
		// Disable context menu items on the fly
		disableContextMenuItems: function(o) {
			if( o == undefined ) {
				// Disable all
				$(this).find('LI').addClass('disabled');
				return( $(this) );
			}
			$(this).each( function() {
				if( o != undefined ) {
					var d = o.split(',');
					for( var i = 0; i < d.length; i++ ) {
						$(this).find('A[href="' + d[i] + '"]').parent().addClass('disabled');
						
					}
				}
			});
			return( $(this) );
		},
		
		// Enable context menu items on the fly
		enableContextMenuItems: function(o) {
			if( o == undefined ) {
				// Enable all
				$(this).find('LI.disabled').removeClass('disabled');
				return( $(this) );
			}
			$(this).each( function() {
				if( o != undefined ) {

					var d = o.split(',');
					for( var i = 0; i < d.length; i++ ) {
						$(this).find('A[href="' + d[i] + '"]').parent().removeClass('disabled');
						
					}
				}
			});
			return( $(this) );
		},
		
		// Disable context menu(s)
		disableContextMenu: function() {
			$(this).each( function() {
				$(this).addClass('disabled');
			});
			return( $(this) );
		},
		
		// Enable context menu(s)
		enableContextMenu: function() {
			$(this).each( function() {
				$(this).removeClass('disabled');
			});
			return( $(this) );
		},
		
		// Destroy context menu(s)
		destroyContextMenu: function() {
			// Destroy specified context menus
			$(this).each( function() {
				// Disable action
				$(this).unbind('contextmenu');
			});
			return( $(this) );
		}
		
	});
})(jQuery);

/**
 * SContextMenu represente un menu contextuel.
 */
function SContextMenu(widget) {
	SContainer.call(this);
	this.widgetName = 'contextmenu';
	var self = this;
	
	this.setContent($('<ul></ul>'));
	
	this.__parent = {};
	
	this.setTarget = function(target) {
		this.target = target;
		this.target.contextMenu({
	        menu: self.content
	    }, function(action, el, pos) {
	        if (/^#/.test(action)) {
	        	action = action.replace(/^#/, '');
	        }
	        if (typeof self.callback != 'undefined') {
	        	self.callback(action, el, pos);
	        }
	    });
	};
	
	this.setWidgetTarget = function(widget) {
		this.setTarget(widget.getContent());
	};
	
	this.disable = function() {
		this.target.disableContextMenu();
	};
	
	this.enable = function() {
		this.target.enableContextMenu();
	};
	
	this.disableItem = function(item) {
		this.target.disableContextMenuItems('#'+item);
	};
	
	this.enableItem = function(item) {
		this.target.enableContextMenuItems('#'+item);
	};
	
	this.__parent.remove = this.remove;
	this.remove = function() {
		this.target.destroyContextMenu();
		this.__parent.remove();
	};
	
	this.setCallback = function(callback) {
		this.callback = callback;
	};
	
	if (typeof widget != 'undefined') {
		this.setWidgetTarget(widget);
	}
}

function SContextMenuItem(action, label, callback) {
	SWidget.call(this);
	this.widgetName = 'contextmenuitem';
	var self = this;
	
	this.action = action;
	
	this.label = $('<a></a>', { href: '#'+action });
	this.setContent($('<li></li>', { 'class': action }).html(this.label));
	
	this.setLabel = function(label) {
		this.label.html(label);
	};
	this.getAction = function() {
		return this.action;
	};
	this.separator = function() {
		this.content.addClass('separator');
	};
	this.setCallback = function(callback) {
		this.bind('click', function() {
			callback(self.action, self.content);
			return false;
		});
	};
	
	if (typeof label != 'undefined') {
		this.setLabel(label);
	}
	if (typeof callback != 'undefined') {
		this.setCallback(callback);
	}
}