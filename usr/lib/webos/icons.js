(function () {

if (Webos.Icon) {
	return;
}

var deps = ['/usr/lib/webos/theme.js'], iconsIndex = null;
if (Webos.standalone) { //Preload index file
	deps.push({
		path: '/usr/share/icons/index.json',
		process: function (contents) {
			iconsIndex = $.parseJSON(contents);
		}
	});
}


Webos.require(deps, function () {
	Webos.Icon = function (name, size, theme) {
		if (typeof name == 'undefined') {
			name = 'apps/default';
		}

		if (typeof Webos.Icon.sizes[size] != 'undefined') {
			size = Webos.Icon.sizes[size];
		}
		
		this._originalName = name;
		this.setSize((typeof size == 'undefined') ? 48 : size);
		this.setTheme(theme);
		this.setName(name);

		if (!/^[\/(~\/)]/.test(this.name)) {
			Webos.Icon._cache[this.id()] = this;
		}
	};
	Webos.Icon.prototype = {
		id: function (size, theme) {
			if (/^[\/(~\/)]/.test(this.name)) {
				return;
			}
			
			size = (typeof size == 'undefined') ? this.size : size;
			
			if (typeof Webos.Icon._cache[this.name] != 'undefined' && Webos.Icon._cache[this.name].size >= size) {
				return Webos.Icon._cache[this.name].id(size, theme);
			}
			
			if (this.type == 'themes') {
				theme = (typeof theme == 'undefined') ? ((typeof this.theme == 'undefined') ? Webos.Theme.current().get('icons') : this.theme) : size;
				return this.type+'/'+theme+'/'+size+'/'+this.name;
			} else {
				return this.type+'/'+size+'/'+this.name;
			}
		},
		path: function (size, theme) {
			var id = this.id(size, theme);
			if (typeof id == 'undefined') {
				return this.name;
			} else {
				return Webos.Icon._path+'/'+id+'.png';
			}
		},
		realpath: function (size, theme) {
			var id = this.id(size, theme);

			var url = '';
			if (typeof id == 'undefined') {
				var iconName = this.name;
				if (this.extension) {
					iconName += '.'+this.extension;
				}

				var iconFile = W.File.get(iconName);
				url = iconFile.get('realpath');
			} else {
				if (Webos.standalone) {
					var iconPath = '', availableIcon = Webos.Icon._findInIndex(this);
					if (availableIcon) {
						iconPath = Webos.Icon._path+'/'+availableIcon.originalName();
					} else {
						//url = Webos.Icon.toIcon().realpath();
					}

					if (iconPath) {
						var iconFile = W.File.get(iconPath);
						url = iconFile.get('realpath');
					}
				} else {
					url = 'sbin/rawdatacall.php?type=icon&index='+id;

					if (Webos.Icon.supportsSvg()) {
						url += '&svg=1';
					}
				}
			}

			return url;
		},
		is: function (icon) {
			icon = Webos.Icon.toIcon(icon);
			
			if (this.type == icon.type && this.name == icon.name) {
				return true;
			}
			
			return false;
		},
		matches: function (icon) {
			if (!this.is(icon)) {
				return 0;
			}

			var score = 1;

			if (this.size <= icon.size) {
				score++;
			}
			if (this.size == icon.size || icon.size == 'scalable') {
				score++;
			}
			if (this.theme == icon.theme) {
				score++;
			}

			return score;
		},
		setName: function (name) {
			var ext = (/\./.test(name)) ? /[^.]+$/.exec(name)[0] : '';
			if (ext) {
				name = name.substr(0, name.lastIndexOf('.'));

				this.setExtension(ext);
			}

			var nameArray = name.split('/'),
				type = Webos.Icon.types[0];
			if (~$.inArray(nameArray[0], Webos.Icon.types)) {
				type = nameArray.shift();
			}

			if (type == 'themes' && nameArray.length == 4) {
				this.setTheme(nameArray.shift());
			}
			if ((type == 'themes' && nameArray.length == 3) || (type != 'themes' && nameArray.length == 2)) {
				this.setSize(nameArray.shift());
			}

			name = nameArray.join('/');
			
			this.name = name;
			this.type = type;
		},
		setSize: function (size) {
			if (size != 'scalable') {
				size = parseInt(size);

				if (isNaN(size)) {
					return false;
				}
			}

			this.size = size || 48;
		},
		setTheme: function (theme) {
			this.theme = theme || Webos.Theme.current().get('icons');
		},
		setExtension: function (ext) {
			this.extension = ext;
		},
		originalName: function () {
			return this._originalName;
		},
		toString: function () {
			return this.realpath();
		}
	};

	Webos.Icon.types = ['themes', 'applications', 'categories'];
	Webos.Icon._path = '/usr/share/icons';
	Webos.Icon.sizes = {
		button: 24
	};
	Webos.Icon._cache = {};
	Webos.Icon._index = iconsIndex;
	Webos.Icon.toIcon = function(arg) {
		if (arg instanceof Webos.Icon) {
			return arg;
		}
		
		if (arg instanceof Array) {
			if (typeof arg[0] == 'string') {
				return new Webos.Icon(arg[0], arg[1], arg[2]);
			}
		}
		
		switch (typeof arg) {
			case 'object':
				if (arg.name) {
					return new Webos.Icon(arg.name, arg.size, arg.theme);
				}
			case 'string':
				return new Webos.Icon(arg);
			default:
				return new Webos.Icon();
		}
	};
	Webos.Icon.supportsSvg = function () {
		return (!! document.createElementNS &&
				!! document.createElementNS (
					'http://www.w3.org/2000/svg',
					"svg"
				).createSVGRect);
	};

	Webos.Icon._findInIndex = function (iconToFind) {
		iconToFind = W.Icon.toIcon(iconToFind);

		var matches = [];
		for (var i = 0; i < Webos.Icon._index.length; i++) {
			var icon = Webos.Icon._index[i];

			if (typeof icon == 'string') {
				icon = Webos.Icon.toIcon(icon);
				Webos.Icon._index[i] = icon;
			}

			var score = iconToFind.matches(icon);
			if (score > 0) {
				matches.push({
					icon: icon,
					score: score
				});
			}
		}

		if (!matches.length) {
			return null;
		}

		matches.sort(function (a, b) {
			return b.score - a.score;
		});

		return matches[0].icon;
	};
});

})();