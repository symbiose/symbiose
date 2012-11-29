Webos.Icon = function WIcon(name, size, theme) {
	if (typeof name == 'undefined') {
		name = 'apps/default';
	}
	
	var nameArray = name.split('/');
	var type = Webos.Icon.types[0];
	if ($.inArray(nameArray[0], Webos.Icon.types) != -1) {
		type = nameArray[0];
		nameArray.shift();
		name = nameArray.join('/');
	}
	
	this.name = name;
	this.type = type;
	
	if (typeof Webos.Icon.sizes[size] != 'undefined') {
		size = Webos.Icon.sizes[size];
	}
	
	this.size = (typeof size == 'undefined' || isNaN(parseInt(size))) ? 48 : parseInt(size);
	this.theme = theme;
	
	this.id = function(size, theme) {
		if (/^[\/(~\/)]/.test(this.name)) {
			return undefined;
		}
		
		size = (typeof size == 'undefined') ? this.size : size;
		
		if (typeof Webos.Icon._cache[this.name] != 'undefined' && Webos.Icon._cache[this.name].size >= size) {
			return Webos.Icon._cache[this.name].id(size, theme);
		}
		
		if (this.type == 'themes') {
			var theme = (typeof theme == 'undefined') ? ((typeof this.theme == 'undefined') ? Webos.Theme.current().get('icons') : this.theme) : size;
			return this.type+'/'+theme+'/'+size+'/'+this.name;
		} else {
			return this.type+'/'+size+'/'+this.name;
		}
	};
	
	this.path = function(size, theme) {
		var id = this.id();
		if (typeof id == 'undefined') {
			return this.name;
		} else {
			return Webos.Icon.path+'/'+id+'.png';
		}
	};
	
	this.realpath = function(size, theme) {
		var id = this.id(size, theme);
		if (typeof id == 'undefined') {
			return 'sbin/filecall.php?file='+this.name;
		} else {
			return 'sbin/filecall.php?file='+id+'&type=icon';
		}
	};
	
	this.toString = function() {
		return this.realpath();
	};
	
	this.is = function(icon) {
		icon = Webos.Icon.toIcon(icon);
		
		if (this.type == icon.type && this.name == icon.name) {
			return true;
		}
		
		return false;
	};
	
	if (!/^[\/(~\/)]/.test(this.name)) {
		Webos.Icon._cache[this.id()] = this;
	}
};

Webos.Icon.types = ['themes', 'applications'];
Webos.Icon.path = '/usr/share/icons';
Webos.Icon.sizes = {
	button: 24
};
Webos.Icon._cache = {};
Webos.Icon.toIcon = function(arg) {
	if (arg instanceof Webos.Icon) {
		return arg;
	}
	
	if (arg instanceof Array) {
		if (typeof arg[0] == 'string') {
			return new Webos.Icon(String(arg[0]), String(arg[1]), String(arg[2]));
		}
	}
	
	switch (typeof arg) {
		case 'object':
			if (arg.name) {
				return new Webos.Icon(String(arg.name), String(arg.size), String(arg.theme));
			}
		case 'string':
			return new Webos.Icon(arg);
		default:
			return new Webos.Icon();
	}
};