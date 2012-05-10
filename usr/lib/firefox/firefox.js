function FirefoxWindow() {
	this.window = $.w.window({
		title: 'Firefox',
		width: 500,
		height: 400,
		stylesheet: 'usr/share/css/firefox/main.css'
	});
	
	var that = this;
	
	this._toolbar = $.w.toolbarWindowHeader().appendTo(this.window.window('header'));
	$.w.toolbarWindowHeaderItem('<-')
		.click(function() {
			that.previous();
		})
		.appendTo(this._toolbar);
	$.w.toolbarWindowHeaderItem('->')
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
		.appendTo(this._toolbar);
	
	var windowsContent = this.window.window('content');
	
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
		var url;
		if (typeof location == 'string') {
			url = location;
			this.history.push(url);
			this.historyLocation++;
		} else if (typeof this.history[location] != 'undefined') {
			url = this.history[location];
		}
		
		if (typeof this._iframe != 'undefined') {
			this._iframe.remove();
		}
		
		this._urlInput.val(url);
		
		if (url == 'about:startpage') {
			url = 'http://www.duckduckgo.com/?kd=-1&kn=-1';
		}
		
		this._iframe = $('<iframe></iframe>', { src: url }).appendTo(windowsContent);
		
		this._iframe.load(function() {
			/*var iframeEl = that._iframe[0];
			if ( iframeEl.contentDocument ) { // DOM
			    var iframeContent = $(iframeEl.contentDocument);
			} else if ( iframeEl.contentWindow ) { // IE win
			    var iframeContent = $(iframeEl.contentWindow.document);
			}
			
			iframeContent.find('body').append('<a href="./servercall.php">Test !</a>');
			
			iframeContent.find('a').css('color','red').click(function(e) {
				that.browse($(this).attr('href'));
				e.preventDefault();
			});*/
		});
	};
	
	this.window.window('open');
	
	if (typeof url != 'undefined') {
		this.browse(url);
	} else {
		this.browse('about:startpage');
	}
}