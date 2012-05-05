function SIcon(name, size, theme) {
	if (typeof name == 'undefined') {
		name = 'apps/default';
	}
	
	var nameArray = name.split('/');
	var type = SIcon.types[0];
	if ($.inArray(nameArray[0], SIcon.types) != -1) {
		type = nameArray[0];
		nameArray.shift();
		name = nameArray.join('/');
	}
	
	this.name = name;
	this.type = type;
	
	if (typeof SIcon.sizes[size] != 'undefined') {
		size = SIcon.sizes[size];
	}
	
	this.size = (typeof size == 'undefined' || isNaN(parseInt(size))) ? 48 : parseInt(size);
	this.theme = theme;
	
	this.id = function(size, theme) {
		if (/^[\/(~\/)]/.test(this.name)) {
			return undefined;
		}
		
		size = (typeof size == 'undefined') ? this.size : size;
		
		if (typeof SIcon.cache[this.name] != 'undefined' && SIcon.cache[this.name].size >= size) {
			return SIcon.cache[this.name].id(size, theme);
		}
		
		if (this.type == 'themes') {
			var theme = (typeof theme == 'undefined') ? ((typeof this.theme == 'undefined') ? STheme.current.icons() : this.theme) : size;
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
			return SIcon.path+'/'+id+'.png';
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
		icon = SIcon.toIcon(icon);
		
		if (this.type == icon.type && this.name == icon.name) {
			return true;
		}
		
		return false;
	};
	
	if (!/^[\/(~\/)]/.test(this.name)) {
		SIcon.cache[this.id()] = this;
	}
}

SIcon.types = ['themes', 'applications'];
SIcon.path = '/usr/share/icons';
SIcon.sizes = {
	button: 32
};
SIcon.setTheme = function(theme) {
	SIcon.theme = theme;
};
SIcon.cache = {};
SIcon.toIcon = function(arg) {
	if (arg instanceof SIcon) {
		return arg;
	}
	
	if (arg instanceof Array) {
		if (typeof arg[0] == 'string') {
			return new SIcon(arg[0], (typeof arg[1] == 'string') ? arg[1] : undefined, (typeof arg[2] == 'string') ? arg[2] : undefined);
		}
	}
	
	switch (typeof arg) {
		case 'function':
			return new W.Callback(arg, arg);
		case 'object':
			if (typeof arg.name == 'string') {
				return new W.Callback(arg.name, arg.size, arg.theme);
			}
		case 'string':
			return new SIcon(arg);
		default:
			return new SIcon();
	}
};