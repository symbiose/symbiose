/**
 * A translation dictionary.
 * @param {Object} data An object containing translations.
 * @constructor
 * @augments {Webos.Model}
 * @since 1.0alpha3
 */
Webos.Translation = function WTranslation(data) {
	Webos.Model.call(this, data);
};
Webos.Translation.prototype = {
	/**
	 * Get a translation.
	 * @param  {String} key       The translation's key.
	 * @param  {Object} variables An object containing variables.
	 * @returns {String}           The matching translation.
	 */
	get: function (key, variables) {
		var translation = this._get(key);
		
		if (!translation) {
			translation = key;
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

/**
 * The user's language.
 * @type {String}
 * @private
 */
Webos.Translation._language = null;

/**
 * Get the user's language.
 * @returns {String} The user's language.
 */
Webos.Translation.language = function () {
	return Webos.Translation._language;
};

/**
 * Parse a translation file.
 * @param  {String} contents The original translation.
 * @returns {Object}          An object containing translations.
 */
Webos.Translation.parse = function (contents) {
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
		
		var key = words[0];
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
		
		data[key] = translation;
	}
	
	return data;
};

/**
 * Load a translation file.
 * @param  {Webos.Callback} callback The callback.
 * @param  {String}         path     The path to the file.
 * @param  {String}         [locale] The translation's language.
 */
Webos.Translation.load = function (callback, path, locale) {
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

/**
 * Set the user's language.
 * @param {String}         locale   The user's language.
 * @param {Webos.Callback} callback The callback.
 */
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

/**
 * A locale.
 * It contains data and functions specific to the user's locale (i.e. date, numbers format).
 * @param {Object} data       The locale's data.
 * @param {String} data.title The locale's title.
 * @param {Object} functions  An object containing functions which are specific to the locale.
 * @param {String} name       The locale's name.
 */
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
	/**
	 * Get this locale's name.
	 * @returns {String} This locale's name.
	 */
	name: function () {
		return this._name;
	},
	/**
	 * Get a data relative to this locale.
	 * @param  {String} index The key.
	 * @returns               The data.
	 * @private
	 */
	_get: function (index) {
		return this._data[index];
	},
	/**
	 * Get this locale's title.
	 * @returns {String} This locale's title.
	 */
	title: function () {
		return this._get('title');
	},
	toString: function () {
		return this.name();
	}
};

Webos.Observable.build(Webos.Locale);

/**
 * The user's locale.
 * @type {Webos.Locale}
 * @private
 */
Webos.Locale._locale = null;

/**
 * The default locale.
 * @type {String}
 * @private
 */
Webos.Locale._defaultLocale = 'en_EN';

/**
 * A list of available locales.
 * @type {Object}
 * @private
 */
Webos.Locale._list = {};

/**
 * Check if a string represents a locale.
 * A locale is a string containing the language code followed by the region code, separated by an underscore (e.g. fr_FR, en_US...).
 * Language and region codes respects ISO 3166-1 alpha-2 (two lowercase letters).
 * @param  {String} locale The string.
 * @returns {Boolean}       True if the string represents a locale's name, false otherwise.
 */
Webos.Locale._check = function (locale) {
	return /[a-z]{2}_[A-Z]{2}/.test(locale);
};

/**
 * Get a list of all available locales.
 * @returns {Object} An iobject containing locales associated with their names.
 */
Webos.Locale.getAll = function () {
	return Webos.Locale._list;
};

/**
 * Get a locale.
 * @param  {String} name  The locale's name.
 * @returns {Webos.Locale} The locale.
 */
Webos.Locale.get = function (name) {
	return Webos.Locale._list[name] || Webos.Locale._list[Webos.Locale._defaultLocale];
};

/**
 * Get the default locale.
 * @returns {Webos.Locale} The locale.
 */
Webos.Locale.getDefault = function () {
	return Webos.Locale.get(Webos.Locale._defaultLocale);
};

/**
 * Check if a locale exists.
 * @param  {String} name The locale's name.
 * @returns {Boolean}     True if the locale is available, false otherwise.
 */
Webos.Locale.exists = function (name) {
	return (typeof Webos.Locale._list[name] != 'undefined');
};

/**
 * Get the current locale.
 * @returns {Webos.Locale} The locale.
 */
Webos.Locale.current = function () {
	return (Webos.Locale._locale) ? Webos.Locale.get(Webos.Locale._locale) : (Webos.Locale.detect()) ? Webos.Locale.get(Webos.Locale.detect()) : Webos.Locale.get(Webos.Locale._defaultLocale);
};

/**
 * Load the user's locale.
 * @param  {Webos.Callback} callback The callback.
 */
Webos.Locale.load = function (callback) {
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

/**
 * Detect the user's locale.
 * If the locale can't be detected, nothing won't be returned.
 * @returns {String} The locale's name.
 */
Webos.Locale.detect = function () {
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

/**
 * Set the user's locale.
 * @param {String}         locale   The locale's name.
 * @param {Webos.Callback} callback The callback.
 */
Webos.Locale.set = function (locale, callback) {
	callback = Webos.Callback.toCallback(callback);
	
	if (!Webos.Locale.exists(locale)) {
		callback.error();
		return;
	}
	
	var conf = Webos.ConfigFile.get('~/.config/locale.xml');
	conf.set('locale', locale);
	conf.sync([function() {
		if (Webos.Locale._locale == locale) {
			callback.success();
			return;
		}

		Webos.Locale._locale = locale;
		Webos.Locale.notify('change', { name: locale, locale: Webos.Locale.get(locale) });
		callback.success();
	}, callback.error]);
};

/**
 * A translated library.
 * @constructor
 * @since 1.0beta1
 */
Webos.TranslatedLibrary = function WTranslatedLibrary() {
	this._loadTranslations();
};
Webos.TranslatedLibrary.prototype = {
	/**
	 * The library's translations.
	 * @type {Webos.Translation}
	 */
	_translations: null,
	/**
	 * The library's translations name.
	 * @type {String}
	 */
	_translationsName: '',
	/**
	 * Load this library's translations.
	 * The event "translationsloaded" will be triggered after that.
	 */
	_loadTranslations: function () {
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


//Locales

//English (UK)
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

//French (France)
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

//German
new Webos.Locale({
	title: 'Deutsch',
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

//Italian
new Webos.Locale({
	title: 'Italian',
	integerGroupsSeparator: ' ',
	decimalSeparator: ',',
	days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	currency: '&#x20AC;'
}, {
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
	}
}, 'it_IT');

//Spanish (Spain)
new Webos.Locale({
	title: 'Espa&ntilde;ol (Espa&ntilde;a)',
	integerGroupsSeparator: ' ',
	decimalSeparator: ',',
	days: ['Domingo', 'Lunes', 'Martes', 'Mi&eacute;rcoles', 'Jueves', 'Viernes', 'S&aacute;bado'],
	months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
	monthsAbbreviations: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
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
}, 'es_ES');

//When the user logs in/out, reinitialize the language and the locale
Webos.User.bind('login logout', function() {
	Webos.Translation._language = null;
	Webos.Locale._locale = null;
	Webos.Locale.load();
});

//Load the locale
Webos.Locale.load();
