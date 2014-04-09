Webos.require([
	'/usr/lib/empathy/main.js'
], function() {
	W.xtag.loadUI('/usr/share/templates/komunikado/main.html', function(windows) {
		var $win = $(windows).filter(':eq(0)');

		$win.window('open');
		
		//TODO
	});
});
