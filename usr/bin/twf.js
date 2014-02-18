W.require([], function() {
	W.xtag.loadUI('/usr/share/templates/twf/main.html', function(twfWindow) {
		$(twfWindow).window('open');
	});
});