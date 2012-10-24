function FirefoxWindow(url) {
	this._window = $.w.window.main({
		title: 'Firefox',
		icon: new W.Icon('applications/firefox'),
		width: 500,
		height: 400,
		maximized: true,
		stylesheet: 'usr/share/css/firefox/main.css'
	});
	
	var that = this;
	
	this.history = [];
	this.historyLocation = -1;
	
	this.previous = function(diff) {
		if (typeof diff == 'undefined') {
			diff = 1;
		}
		
		if (this.historyLocation - diff < 0) {
			return;
		}
		
		this.historyLocation -= diff;
		
		this.browse(this.historyLocation);
	};
	
	this.next = function(diff) {
		if (typeof diff == 'undefined') {
			diff = 1;
		}
		
		if (this.historyLocation + diff >= this.history.length) {
			return;
		}
		
		this.historyLocation += diff;
		
		this.browse(this.historyLocation);
	};
	
	this.browse = function(location) {
		var url = '';
		if (Webos.isInstanceOf(location, Webos.File)) {
			url = file.get('realpath');
			this.history.push(url);
			this.historyLocation++;
		} else if (typeof location == 'string') {
			url = location;
			this.history.push(url);
			this.historyLocation++;
		} else if (typeof this.history[location] != 'undefined') {
			url = this.history[location];
		}
		if (url == 'about:startpage') {
			url = 'http://www.duckduckgo.com/?kd=-1&kn=-1';
		}
		
		if (typeof this._iframe != 'undefined') {
			this._iframe.empty().remove();
		}
		
		this._urlInput.removeClass('unsynced').val(url);
		
		this._iframe = $('<iframe></iframe>', { src: url }).appendTo(this._window.window('content'));
		
		var loaded = false;
		this._iframe.unload(function() {
			
		}).load(function() {
			if (loaded) {
				that._urlInput.addClass('unsynced');
			}
			loaded = true;
		}).error(function() {
			W.Error.trigger('Impossible d\'afficher la page : une erreur du navigateur est survenue.');
		});
	};
	
	this._toolbar = $.w.toolbarWindowHeader().appendTo(this._window.window('header'));
	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-previous'))
		.click(function() {
			that.previous();
		})
		.appendTo(this._toolbar);
	$.w.toolbarWindowHeaderItem('', new W.Icon('actions/go-next'))
		.click(function() {
			that.next();
		})
		.appendTo(this._toolbar);
	
	this._urlInput = $('<input />', { type: 'text' })
		.keydown(function(e) {
			if (e.keyCode == 13) {
				that.browse($(this).val());
				e.preventDefault();
			}
		})
		.appendTo($('<li></li>', { 'class': 'input-container' }).appendTo(this._toolbar));
	
	this._window.window('open');
	
	if (url) {
		this.browse(url);
	} else {
		this.browse('about:startpage');
	}
}