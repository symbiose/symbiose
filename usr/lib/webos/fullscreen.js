var browserPrefixes = 'webkit moz o ms khtml'.split(' ');

Webos.fullscreen = {
	support: false,
	isFullScreen: function() { return false; },
	request: function() {},
	cancel: function() {},
	eventName: '',
	prefix: ''
};

//check for native support
if (typeof document.cancelFullScreen != 'undefined') {
	Webos.fullscreen.support = true;
} else {
	//	check for fullscreen support by vendor prefix
	for (var i = 0, il = browserPrefixes.length; i < il; i++ ) {
		Webos.fullscreen.prefix = browserPrefixes[i];

		if (typeof document[Webos.fullscreen.prefix + 'CancelFullScreen' ] != 'undefined' ) {
			Webos.fullscreen.support = true;
			break;
		}
	}
}

//update methods to do something useful
if (Webos.fullscreen.support) {
	Webos.fullscreen.eventName = Webos.fullscreen.prefix + 'fullscreenchange';

	Webos.fullscreen.isFullScreen = function() {
		switch (this.prefix) {
			case '':
				return document.fullScreen;
			case 'webkit':
				return document.webkitIsFullScreen;
			default:
				return document[this.prefix + 'FullScreen'];
		}
	};
	Webos.fullscreen.request = function(el) {
		return (this.prefix === '') ? el.requestFullScreen() : el[this.prefix + 'RequestFullScreen']();
	};
	Webos.fullscreen.cancel = function() {
		return (this.prefix === '') ? document.cancelFullScreen() : document[this.prefix + 'CancelFullScreen']();
	};
}

//jQuery plugin
if (typeof jQuery != 'undefined') {
	jQuery.fn.requestFullScreen = function() {
		return this.each(function() {
			if (Webos.fullscreen.support) {
				Webos.fullscreen.request(this);
			}
		});
	};
}