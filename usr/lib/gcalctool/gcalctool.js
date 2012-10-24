/**
 * GCalcTool represente une calculatrice.
 * @author Doppelganger & $imon
 * @version 1.3
 */
function GCalcTool() {
	this.mode = 'calcul';
	this.lastResult = '';
	this.toInsertMode = function() {// function qui test si l'utilisateur focus ou ajoute une valeur dans le textarea en mode resultat, on repasse alors en mode calcul
		if(this.mode == 'result') { //On détecte le mode de calcul
			this.mode = 'calcul'; // on repasse en mode calcul
			this.textarea.removeClass('result'); //On remet l'écriture normale
			this.insert(this.lastResult, true); // on replace le calcul
		}
	};
	this.insert = function(contentToAdd, replace, result) { // function qui gère l'ajout de contenu dans le textarea
		var newCalcul = false;
		if (this.mode == 'result' && !result) {
			this.toInsertMode(); //On passe en mode calcul
			newCalcul = true; //On demarre un nouveau calcul
		}
		
		if (replace == true) { //Si on veut remplacer le calcul precedant
			this.textarea.textAreaEntry('content').val(contentToAdd);
		} else { //Sinon
			//Si c'est un chiffre et que l'on demarre un nouveau calcul, on efface tout
			if (!isNaN(parseInt(contentToAdd)) && contentToAdd.length == 1 && newCalcul) {
				this.textarea.textAreaEntry('content').val(contentToAdd);
			} else { //Sinon on ajoute l'operateur au calcul precedant
				this.textarea.textAreaEntry('content').val(this.textarea.textAreaEntry('content').val() + contentToAdd);
			}
		}
	};
	
	this.execute = function() {
		var calcul = this.textarea.textAreaEntry('content').val();
		var originalCalcul = calcul;
		var result = '';

		if(this.mode == 'calcul') { // si on est en mode calcul
			this.mode = 'result'; // on passe en mode resultat
			this.textarea.addClass('result');
			
			try { // on essaye de faire le calcul

				calcul = calcul.toUpperCase(); // On met en majuscules, cela evite pas mal d'appels Javascript (/!\ fonction EVAL)
				
				calcul = calcul.replace(/,/g, '.'); // remplacer une virgule par un point
				
				calcul = calcul.replace(/([0-9.]+)\u00b2/g, '$1*$1'); // exposant 2
				calcul = calcul.replace(/\(([0-9.]+)\)\u00b2/g, '($1*$1)'); // exposant 2

				calcul = calcul.replace(/\u221A([0-9.]+)/g, 'Math.sqrt($1)'); // racine carrée
				calcul = calcul.replace(/\u221A\(([0-9.]+)\)/g, '(Math.sqrt($1))'); // racine carrée
				calcul = calcul.replace(/\u221A\((.*)\)/g, '(Math.sqrt($1))'); // racine carrée

				calcul = calcul.replace(/[Xx×]/g, '*'); // multiplication
				calcul = calcul.replace(/\u00D7/g, '*'); // multiplication (même caractère que multipliaction de ubuntu)
				calcul = calcul.replace(/\((.*)\)x\((.*)\)/g, '($1*$2)'); // multiplication
				calcul = calcul.replace(/\((.*)\)×\((.*)\)/g, '($1*$2)'); // multiplication
				calcul = calcul.replace(/([0-9.]+)\((.*)\)/g, '$1*$2'); // multiplication
				calcul = calcul.replace(/\((.*)\)\((.*)\)/g, '($1*$2)'); // multiplication

				calcul = calcul.replace(/\u00F7/g, '/'); // division

				calcul = calcul.replace(/([0-9.]+)%/g, '$1/100'); // pourcentage
				calcul = calcul.replace(/\((.*)\)%/g, '$1/100'); // pourcentage
				calcul = calcul.replace(/\((.*)%\)/g, '($1/100)'); // pourcentage

				result = eval(calcul);
			} catch(error){ // si ca ne marche pas on affiche un message d'erreur
				result = originalCalcul + "\n" + this.translations.get('Incorrect expression');
			} finally {
				this.lastResult = result;
				this.insert(result, true, true);
			}
		} else if(this.mode == 'result') { // si on est ne mode resultat, on affiche à nouveau le calcul
			this.mode = 'calcul'; // on passe en mode calcul
			this.textarea.removeClass('result');

			this.insert(this.lastResult, true, true); // on replace le calcul
		}
	};
	
	var gcalctool = this;
	
	Webos.Translation.load(function(t) {
		gcalctool.translations = t;
		
		gcalctool.window = $.w.window.main({
			title: t.get('Calculator'),
			icon: new W.Icon('apps/calculator'),
			width: 370,
			height: 197,
			stylesheet: 'usr/share/css/gcalctool/main.css',
			resizable: false
		});
		
		gcalctool.container = $.w.container().addClass('gcalctool');
		
		gcalctool.textarea = $.w.textAreaEntry();
		gcalctool.textarea.bind('keypress', function(event) {
			var touche_press = (!document.all) ? event.which : event.keyCode;
	
			if(touche_press == 13) {
				gcalctool.execute();
				event.preventDefault(); // Permet d'annuler la touche enter
			} else {
				gcalctool.toInsertMode(); // Permet de repasser en mode calcul si on est en mode resultat
			}
		});
		gcalctool.container.append(gcalctool.textarea);
		
		// 7, 8, 9, ÷, "Annuler", "Effacer"
		var container = $.w.container();
		
		var button = $.w.button('7');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('8');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('9');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('÷');
		button.addClass('pink');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button(t.get('Cancel'));
		button.addClass('gray');
		button.bind('click', function() {
			gcalctool.insert('', true);
		});
		container.append(button);
		
		var button = $.w.button(t.get('Delete'));
		button.addClass('gray');
		button.bind('click', function() {
			var nbrCar = gcalctool.textarea.textAreaEntry('value').length - 1;
			gcalctool.insert(gcalctool.textarea.textAreaEntry('value').substring(0, nbrCar), true);
		});
		container.append(button);
		
		gcalctool.container.append(container);
		
		// 4, 5, 6, x, (, )
		
		var container = $.w.container();
		
		var button = $.w.button('4');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('5');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('6');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('×');
		button.addClass('pink');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('(');
		button.addClass('gray');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button(')');
		button.addClass('gray');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		gcalctool.container.append(container);
		
		// 1, 2, 3, -, x², √
		
		var container = $.w.container();
		
		var button = $.w.button('1');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('2');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('3');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('-');
		button.addClass('pink');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('x²');
		button.addClass('blue');
		button.bind('click', function() {
			gcalctool.insert('²');
		});
		container.append(button);
		
		var button = $.w.button('√');
		button.addClass('blue');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		gcalctool.container.append(container);
		
		// 0, ".", "="
		
		var container = $.w.container();
		
		var button = $.w.button('0');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('.');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('%');
		button.addClass('violet');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('+');
		button.addClass('pink');
		button.bind('click', function() {
			gcalctool.insert($(this).html());
		});
		container.append(button);
		
		var button = $.w.button('=');
		button.addClass('enter');
		button.bind('click', function() {
			gcalctool.execute();
		});
		container.append(button);
		
		gcalctool.container.append(container);
		
		gcalctool.window.window('content').append(gcalctool.container);
		
		gcalctool.window.window('open');
	}, 'gcalctool');
}