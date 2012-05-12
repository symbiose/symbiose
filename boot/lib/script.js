if (!window.Webos) {
	window.Webos = {};
	window.W = window.Webos;
}

//Executer un script JS en mode "sandbox"
Webos.Script = function WScript(js, args) {
	this.js = js;
	this.args = args;
	
	if (typeof args == 'undefined') { //Si les arguments sont vides
		args = new W.Arguments({});
	}
	
	var options = args.getOptions(), params = args.getParams(), paramsString;
	
	if (params.length > 0) { //On transfore les parametres envoyes au script en chaine de caracteres
		paramsString = '"'+params.join('", "')+'"';
	} else {
		paramsString = '';
	}
	
	if (js != '' && js != null) {
		js = 'try {'+js+"\n"+'} catch(error) { W.Error.catchError(error); }';
	}
	
	//On ajoute la sandbox
	js = '(function(args) { '+js+' })(new W.Arguments({ options: '+JSON.stringify(options)+', params: ['+paramsString+'] }));';
	Webos.Script.runScript(js); //On execute le tout
};

//Executer un script Javascript
Webos.Script.runScript = function runScript(js) {
	js = js.replace(/\/\*([\s\S]*?)\*\//g, ''); //On enleve les commentaires
	var scriptTag = document.createElement('script');
	scriptTag.setAttribute('type', 'text/javascript');
	var scriptText = document.createTextNode(js);
	scriptTag.appendChild(scriptText);
	$('body').append(scriptTag);
};

Webos.ScriptFile = function WScriptFile(path) { //Permet d'inclure un fichier Javascript
	if (typeof W.ScriptFile.cache[path] != 'undefined') {
		return W.ScriptFile.cache[path];
	}
	
	W.ScriptFile.cache[path] = this;
	
	this.ajax = $.ajax({
		url: path,
		method: 'get',
		async: false,
		dataType: 'text',
		success: function(js, textStatus, jqXHR) {
			if (js != '' && js != null) {
				js = 'try {'+js+"\n"+'} catch(error) { W.Error.catchError(error); }';
			}
			Webos.Script.runScript(js);
		}
	});
};
Webos.ScriptFile.cache = {};

function include(path, args) {
	this.ajax = $.ajax({
		url: path,
		method: 'get',
		async: false,
		dataType: 'text',
		success: function(data, textStatus, jqXHR) {
			if (typeof args == 'undefined') { //Si les arguments sont vides
				args = new W.Arguments({});      
			}
			
			var fn = new Function('args', data);
			fn(args);
		}
	});
}

//Permet de specifier des options et des arguments a un script
Webos.Arguments = function WArguments(args) {
	if (typeof args == 'undefined') {
		args = {};
	}
	
	this.args = args;
	if (typeof this.args.options == 'undefined') { this.args.options = {}; }
	if (typeof this.args.params == 'undefined') { this.args.params = []; }
	
	var paramsArray = [];
	for (var nbr in this.args.params) {
		paramsArray.push(this.args.params[nbr]);
	}
	
	this.args.params = paramsArray;
	
	this.isOption = function(name) { //Une option est-elle definie ?
		return (typeof this.args.options[name] != 'undefined');
	};
	this.getOption = function(name) { //Recuperer le contenu de l'option
		return this.args.options[name];
	};
	this.getOptions = function() { //Recuperer ttes les options
		return this.args.options;
	};
	this.countNbrParams = function() { //Compter le nbr de parametres
		return this.args.params.length;
	};
	this.isParam = function(no) { //Un parametre existe-t-il ?
		return (typeof this.args.params[no] != 'undefined');
	};
	this.getParam = function(no) { //Recuperer un parametre
		return this.args.params[no];
	};
	this.getParams = function() { //Recuperer ts les parametres
		return this.args.params;
	};
};

Webos.Arguments.parse = function(cmd) {
	var cmdArray = cmd.split(' ');
	cmdArray.shift(); //On enleve le premier element : c'est la commande
	var argsStr = cmdArray.join(' ');
	
	var args = {
		options: {},
		params: []
	};
	var cacheBase = {
		strStarted: false,
		strType: '',
		strIndex: '',
		strContent: '',
		previous: '',
		strOptionType: '',
		strStage: 'index'
	};
	var cache = cacheBase;
	
	for (var i = 0; i < argsStr.length; i++) { //Pour chaque caractere char
		var char = argsStr[i];
		
		if (char == '"') { //Delimiteur de chaine
			if (cache.previous == '\\') { //Si on a echappe le delimiteur
				if (cache.strStage == 'content') { //Si on remplit le contenu
					cache.strContent = cache.strContent.substr(0, -1); //On enleve le \
					cache.strContent += char; //On ajoute le "
				} else { //Sinon on remplit l'index
					cache.strIndex = cache.strIndex.substr(0, -1); //on enleve le \
					cache.strIndex += char; //On ajoute le "
				}
			} else {
				if (cache.strStarted == false) { //Si c'est le premier
					cache.strStarted = true; //On le sauvegarde
				} else { //Sinon, fin de chaine
					cache.strStarted = false;
				}
			}
		} else if (char == ' ' && cache.strStarted != true) { //Si c'est un espace et qu'on n'est pas dans une chaine
			if (cache.strType == 'options') { //Si c'est une option
				args.options[cache.strIndex] = cache.strContent; //On sauvegarde
			} else { //Sinon, c'est un argument
				args.params.push(cache.strIndex); //On sauvegarde
			}
			cache = cacheBase; //On remet le cache a zero
		} else if (char == '-') { //Si c'est un tiret
			if (cache.previous == '-') { //Si le caractere precedant etait aussi un tiret, c'est une option type --fruit=abricot
				cache.strOptionType = 'long'; //Type de l'option
			} else if (cache.previous == ' ' || cache.previous == '') { //Si c'etait un espace blanc, c'est une option type -aBv
				cache.strType = 'options'; //C'est une option
				cache.strOptionType = 'short'; //Type de l'option
				cache.strStage = 'index'; //On remplit l'index
			} else { //Sinon, ce n'est pas une option (e.g. fruit-de-mer)
				if (cache.strStage == 'content') { //Si on remplit le contenu
					cache.strContent += char; //On ajoute le -
				} else { //Sinon, on remplit l'index
					cache.strIndex += char; //On ajoute le -
				}
			}
		} else if (char == '=') { //Si c'est un =
			if (cache.strType == 'options' && cache.strOptionType == 'long') { //Si c'est une option type --fruit=abricot
				cache.strStage = 'content'; //On remplit maintenant le contenu
			}
		} else { //Autre caractere
			if (cache.strStage == 'content') { //Si on remplit le contenu
				cache.strContent += char; //On ajoute le caractere
			} else { //Sinon on remplit l'index
				if (cache.strType == 'options') { //Si c'est une option
					if (cache.strOptionType == 'long') { //Si c'est une option type --fruit=abricot
						cache.strIndex += char; //On remplit l'index
					} else { //Sinon, c'est une option type -aBv
						args.options[char] = ''; //On ajoute l'option
						//On definit les parametres au cas ou il y a une autre option apres
						cache = cacheBase; //On reinitialise le cache
						cache.strType = 'options'; //C'est une option
						cache.strOptionType = 'short'; //C'est une option type -aBv
						cache.strStage = 'index'; //On remplit l'index
					}
				} else { //Sinon c'est un argument
					cache.strIndex += char; //On ajoute le caractere
				}
			}
		}
		cache.previous = char; //On definit le caractere precedant
	}
	
	//On vide le cache du dernier caractere
	if (cache.strIndex != '') {
		if (cache.strType == 'options') {
			args.options[cache.strIndex] = cache.strContent;
		} else {
			args.params.push(cache.strIndex);
		}
	}
	
	return new Webos.Arguments(args);
};