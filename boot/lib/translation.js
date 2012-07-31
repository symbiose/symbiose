Webos.Translation = function WTranslation(data) {
	Webos.Model.call(this, data);
};
Webos.Translation.prototype = {
	get: function(original, variables) {
		var translation = this._get(original);
		
		if (!translation) {
			translation = original;
		}
		
		if (typeof variables == 'object') {
			for (var index in variables) {
				translation = translation.replace('${'+index+'}', variables[index]);
			}
		}
		
		return translation;
	}
};
Webos.inherit(Webos.Translation, Webos.Model); //Héritage de Webos.Model

Webos.Translation._language = null;
Webos.Translation._defaultLanguage = 'en_EN';
Webos.Translation.language = function() {
	return Webos.Translation._language;
};
Webos.Translation.load = function(callback, path, locale) {
	callback = Webos.Callback.toCallback(callback);
	locale = String(locale);
	
	var loadTranslationFn = function() {
		locale = ((locale && /[a-z]{2}_[A-Z]{2}/.test(locale)) ? locale : (Webos.Translation.language()) ? Webos.Translation.language() : Webos.Translation._defaultLanguage);
		var file = Webos.File.get('/usr/share/locale/' + locale + '/' + path + '.ini');
		
		if (locale == Webos.Translation._defaultLanguage) {
			callback.success(new Webos.Translation());
			return;
		}
		
		file.contents([function(contents) {
			var lines = contents.split('\n');
			var data = {};
			
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].charAt(0) == ';') {
					continue;
				}
				
				var words = lines[i].split('=');
				
				if (words.length < 2) {
					continue;
				}
				if (words[0].length == 0) {
					continue;
				}
				
				var original = words[0];
				var translation = '';
				for (var j = 1; j < words.length; j++) {
					if (j >= 2) {
						translation += '=';
					}
					translation += words[j];
				}
				
				if (translation.length == 0) {
					continue;
				}
				
				data[original] = translation;
			}
			
			callback.success(new Webos.Translation(data));
		}, function(response) {
			callback.success(new Webos.Translation());
		}]);
	};
	
	if (!Webos.Translation.language() && !(locale && /[a-z]{2}_[A-Z]{2}/.test(locale))) {
		Webos.Translation.loadUserLocale([function() {
			loadTranslationFn();
		}, callback.error]);
	} else {
		loadTranslationFn();
	}
};
Webos.Translation.loadUserLocale = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	new Webos.ServerCall({
		'class': 'TranslationController',
		method: 'getLanguage',
	}).load([function(response) {
		Webos.Translation._language = response.getData().language;
		
		callback.success();
	}, callback.error]);
};