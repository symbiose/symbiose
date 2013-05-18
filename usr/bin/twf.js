W.require('/usr/lib/xtag/webos.js', function() {
	W.xtag.loadUI('/usr/share/templates/twf/main.html', function(twfWindow) {
		$(twfWindow).window('open');
	});
});