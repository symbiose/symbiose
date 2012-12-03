Webos.Translation = function WTranslation(data) {
	Webos.Model.call(this, data);
};
Webos.Translation.prototype = {
	get: function $_WTranslation_get(original, variables) {
		var translation = this._get(original);
		
		if (!translation) {
			translation = original;
		}
		
		if (typeof variables == 'object') {
			var replaceVariablesFn = function(translation) {
				while(/\$\{.+\}/.test(translation)) {
					translation = translation.replace(/\$\{(.+?)\}/, function(match, str) {
						var strArray = str.split('|', 3);
						if (strArray.length > 1) {
							isCondition = true;
							var condition = strArray[0], ifValue = strArray[1], elseValue = strArray[2] || '';
							if (typeof variables[condition] == 'undefined') {
								return str;
							} else if (variables[condition]) {
								return replaceVariablesFn(ifValue);
							} else {
								return replaceVariablesFn(elseValue);
							}
						} else {
							if (typeof variables[str] != 'undefined') {
								return variables[str];
							} else {
								return str;
							}
						}
					});
				}
				
				return translation;
			};
			
			translation = replaceVariablesFn(translation);
		}
		
		return translation;
	}
};
Webos.inherit(Webos.Translation, Webos.Model); //Héritage de Webos.Model

Webos.Translation._language = null;
Webos.Translation.language = function $_WTranslation_language() {
	return Webos.Translation._language;
};
Webos.Translation.parse = function $_WTranslation_parse(contents) {
	if (!contents) {
		return {};
	}

	var lines = String(contents).split('\n');
	var data = {};
	var inComment = false;
	
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].replace(/\r$/, ''); //Important : sinon il y a un retour chariot a la fin de la chaine
		
		if (/\/\*/.test(line)) {
			inComment = true;
			line = line.replace(/$(.*)\/\*/, '$1');
		}
		if (/\*\//.test(line)) {
			inComment = false;
			line = line.replace(/\*\/(.*)^/, '$1');
		}
		if (inComment) {
			continue;
		}
		if (line.charAt(0) == ';') {
			continue;
		}
		if (line.substr(0, 2) == '//') {
			continue;
		}
		
		var words = line.split('=');
		
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
	
	return data;
};
Webos.Translation.load = function $_WTranslation_load(callback, path, locale) {
	callback = Webos.Callback.toCallback(callback);
	locale = String(locale);
	
	var loadTranslationFn = function() {
		locale = ((locale && /[a-z]{2}_[A-Z]{2}/.test(locale)) ? locale : (Webos.Translation.language()) ? Webos.Translation.language() : Webos.Locale._defaultLocale);
		var file = Webos.File.get('/usr/share/locale/' + locale + '/' + path + '.ini');
		
		if (locale == Webos.Locale._defaultLocale) {
			callback.success(new Webos.Translation());
			return;
		}
		
		file.contents([function(contents) {
			callback.success(new Webos.Translation(Webos.Translation.parse(contents)));
		}, function(response) {
			callback.success(new Webos.Translation());
		}]);
	};
	
	if (!Webos.Translation.language() && !(locale && /[a-z]{2}_[A-Z]{2}/.test(locale))) {
		Webos.Locale.load([function() {
			loadTranslationFn();
		}, callback.error]);
	} else {
		loadTranslationFn();
	}
};
Webos.Translation.setLanguage = function $_WTranslation_setLanguage(locale, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!Webos.Locale.exists(locale)) {
		callback.error();
		return;
	}
	
	var conf = Webos.ConfigFile.get('~/.config/locale.xml');
	conf.set('language', locale);
	conf.sync([function() {
		Webos.Translation._language = locale;
		callback.success();
	}, callback.error]);
};

Webos.Locale = function WLocale(data, functions, name) {
	this._name = name;
	this._data = data;
	
	for (var index in functions) {
		this[index] = functions[index];
	}
	if (name != Webos.Locale._defaultLocale) {
		var defaultLocale = Webos.Locale.get(Webos.Locale._defaultLocale);
		for (var index in defaultLocale) {
			if (typeof this[index] == 'undefined') {
				this[index] = defaultLocale[index];
			}
		}
	}
	
	Webos.Locale._list[name] = this;
};
Webos.Locale.prototype = {
	name: function $_WLocale_name() {
		return this._name;
	},
	_get: function $_WLocale__get(index) {
		return this._data[index];
	},
	title: function $_WLocale_title() {
		return this._get('title');
	},
	toString: function $_WLocale_toString() {
		return this.name();
	}
};

Webos.Observable.build(Webos.Locale);

Webos.Locale._locale = null;
Webos.Locale._defaultLocale = 'en_EN';
Webos.Locale._list = {};
Webos.Locale._check = function $_WLocale__check(locale) {
	return /[a-z]{2}_[A-Z]{2}/.test(locale);
};
Webos.Locale.getAll = function $_WLocale_getAll() {
	return Webos.Locale._list;
};
Webos.Locale.get = function $_WLocale_get(name) {
	return Webos.Locale._list[name] || Webos.Locale._list[Webos.Locale._defaultLocale];
};
Webos.Locale.getDefault = function $_WLocale_getDefault() {
	return Webos.Locale.get(Webos.Locale._defaultLocale);
};
Webos.Locale.exists = function $_WLocale_exists(name) {
	return (typeof Webos.Locale._list[name] != 'undefined');
};
Webos.Locale.current = function $_WLocale_current() {
	return (Webos.Locale._locale) ? Webos.Locale.get(Webos.Locale._locale) : (Webos.Locale.detect()) ? Webos.Locale.get(Webos.Locale.detect()) : Webos.Locale.get(Webos.Locale._defaultLocale);
};
Webos.Locale.load = function $_WLocale_load(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	var getUserLanguageFn = function() {
		new Webos.ServerCall({
			'class': 'TranslationController',
			method: 'getLanguage',
		}).load([function(response) {
			Webos.Translation._language = response.getData().language;
			
			var locale = response.getData().locale;
			if (Webos.Locale._locale != locale) {
				Webos.Locale._locale = locale;
				Webos.Locale.notify('change', { name: locale, locale: Webos.Locale.get(locale) });
			}
			
			callback.success();
		}, callback.error]);
	};
	
	Webos.User.get([function(user) {
		if (user) {
			getUserLanguageFn();
		} else {
			var locale = Webos.Locale.detect();
			if (locale) {
				Webos.Translation._language = locale;
				
				if (Webos.Locale._locale != locale) {
					Webos.Locale._locale = locale;
					Webos.Locale.notify('change', { name: locale, locale: Webos.Locale.get(locale) });
				}
				
				callback.success();
			} else {
				getUserLanguageFn();
			}
		}
	}, function(response) {
		getUserLanguageFn();
	}]);
};
Webos.Locale.detect = function $_WLocale_detect() {
	if (!navigator.language && !navigator.browserLanguage) {
		return;
	}
	
	var lang = navigator.language || navigator.browserLanguage;
				
	lang = lang.replace('-', '_');
	var parts = lang.split('_');
	parts[0] = parts[0].toLowerCase();
	if (!parts[1]) {
		parts[1] = parts[0].toUpperCase();
	}
	var locale = parts.join('_');
	if (Webos.Locale.exists(locale)) {
		return locale;
	}
	
	if (parts[0] != parts[1].toLowerCase()) {
		parts[1] = parts[0].toUpperCase();
	}
	locale = parts.join('_');
	if (Webos.Locale.exists(locale)) {
		return locale;
	}
	
	return Webos.Locale.getDefault().name();
};
Webos.Locale.set = function $_WLocale_set(locale, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!Webos.Locale.exists(locale)) {
		callback.error();
		return;
	}
	
	var conf = Webos.ConfigFile.get('~/.config/locale.xml');
	conf.set('locale', locale);
	conf.sync([function() {
		Webos.Locale._locale = locale;
		Webos.Locale.notify('change', { name: locale, locale: Webos.Locale.get(locale) });
		callback.success();
	}, callback.error]);
};

Webos.TranslatedLibrary = function WTranslatedLibrary() {
	this._loadTranslations();
};
Webos.TranslatedLibrary.prototype = {
	_translations: null,
	_translationsName: '',
	_loadTranslations: function $_WTranslatedLibrary__loadTranslations() {
		if (this._translations) {
			return;
		}
		
		if (!this._translationsName) {
			this.notify('translationsloaded', { translations: new Webos.Translation() });
			return;
		}
		
		var that = this;
		
		Webos.Translation.load(function(t) {
			that._translations = t;
			that.notify('translationsloaded', { translations: t });
		}, this._translationsName);
	}
};

new Webos.Locale({
	title: 'English (United Kingdom)',
	integerGroupsSeparator: ',',
	decimalSeparator: '.',
	days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	currency: '&#xA3;'
}, {
	number: function(nbr) {
		nbr = String(nbr);
		parts = nbr.split('.');
		
		var integer = '';
		var count = 0;
		for (var i = parts[0].length - 1; i >= 0; i--) {
			if (count % 3 == 0 && i != parts[0].length - 1) {
				integer = this._get('integerGroupsSeparator') + integer;
			}
			integer = parts[0].charAt(i) + integer;
			
			count++;
		}
		
		nbr = integer + this._get('decimalSeparator') + parts[1];
		
		return nbr;
	},
	day: function(nbr) {
		return this._get('days')[nbr];
	},
	dayAbbreviation: function(nbr) {
		return this.day(nbr).slice(0, 3) + '.';
	},
	month: function(nbr) {
		return this._get('months')[nbr];
	},
	monthAbbreviation: function(nbr) {
		return this.month(nbr).slice(0, 3) + '.';
	},
	date: function(date) {
		return this.day(date.getDay()) + ' ' + 
			date.getDate() + ' ' + 
			this.month(date.getMonth());
	},
	dateAbbreviation: function(date) {
		return this.dayAbbreviation(date.getDay()) + ' ' + 
			date.getDate() + ' ' + 
			this.monthAbbreviation(date.getMonth());
	},
	time: function(date, showSeconds) {
		var addZeroFn = function(nbr) {
			nbr = String(nbr);
			if (nbr.length == 1) {
				nbr = '0' + nbr;
			}
			return nbr;
		};
		
		return addZeroFn(date.getHours()) + ':' + 
			addZeroFn(date.getMinutes()) + 
			((showSeconds) ? (':' + addZeroFn(date.getSeconds())) : '');
	},
	completeDate: function(date) {
		return this.dateAbbreviation(date) + ' ' + 
			date.getFullYear() + ' ' + 
			this.time(date, true) + ' GMT' + Math.floor(date.getTimezoneOffset() / 60);
	},
	currency: function(value) {
		return this._get('currency') + this.number(value);
	}
}, 'en_EN');

new Webos.Locale({
	title: 'Fran&ccedil;ais (France)',
	integerGroupsSeparator: ' ',
	decimalSeparator: ',',
	days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
	months: ['Janvier', 'F&eacute;vrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'A&ocirc;ut', 'Septembre', 'Octobre', 'Novembre', 'D&eacute;cembre'],
	monthsAbbreviations: ['Jan.', 'F&eacute;v.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'A&ocirc;ut', 'Sept.', 'Oct.', 'Nov.', 'D&eacute;c.'],
	currency: '&#x20AC;'
}, {
	monthAbbreviation: function(nbr) {
		return this._get('monthsAbbreviations')[nbr];
	},
	date: function(date) {
		return this.day(date.getDay()) + ' ' + 
			date.getDate() + ' ' + 
			this.month(date.getMonth()).toLowerCase();
	},
	dateAbbreviation: function(date) {
		return this.dayAbbreviation(date.getDay()).toLowerCase() + ' ' + 
			date.getDate() + ' ' + 
			this.monthAbbreviation(date.getMonth()).toLowerCase();
	},
	completeDate: function(date) {
		return this.dateAbbreviation(date) + ' ' + 
			date.getFullYear() + ' ' + 
			this.time(date, true) + ' GMT' + Math.floor(date.getTimezoneOffset() / 60);
	},
	currency: function(value) {
		return this.number(value) + ' ' + this._get('currency');
	}
}, 'fr_FR');

new Webos.Locale({
	title: 'Deutsch (Deutschland)',
	integerGroupsSeparator: ' ',
	decimalSeparator: ',',
	days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
	months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
	monthsAbbreviations: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
	currency: '&#x20AC;'
}, {
	dayAbbreviation: function(nbr) {
		return this.day(nbr).slice(0, 2);
	},
	monthAbbreviation: function(nbr) {
		return this._get('monthsAbbreviations')[nbr];
	},
	date: function(date) {
		return this.day(date.getDay()) + ', den ' + 
			date.getDate() + '. ' + 
			this.month(date.getMonth()).toLowerCase();
	},
	dateAbbreviation: function(date) {
		return this.dayAbbreviation(date.getDay()).toLowerCase() + ', den ' + 
			date.getDate() + '. ' + 
			this.monthAbbreviation(date.getMonth()).toLowerCase();
	},
	currency: function(value) {
		return this.number(value) + ' ' + this._get('currency');
	}
}, 'de_DE');


Webos.User.bind('login logout', function() {
	//Lorsque l'utilisateur quitte sa session, on reinitialise la langue
	Webos.Translation._language = null;
	Webos.Locale._locale = null;
	Webos.Locale.load();
});

Webos.Locale.load();