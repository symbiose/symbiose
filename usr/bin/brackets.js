var bracketsLibPath = '/usr/lib/brackets', bracketsSourcePath = bracketsLibPath + '/src';

Webos.require(bracketsLibPath+'/webos.js', function() {
	var $window = $.w.window.main({
		title: 'Brackets',
		icon: 'applications/brackets',
		width: 550,
		height: 400,
		maximized: true
	});

	$window.window('open');

	var $windowContent = $window.window('content');

	$windowContent.css('overflow', 'hidden');

	var $iframe = $('<iframe style="border:none;height:100%;width:100%;"></iframe>');
	$iframe.attr('src', './'+bracketsSourcePath+'/index.html');
	$iframe.appendTo($windowContent);

	if ($iframe[0].contentWindow) {
		brackets.app.quit = function() {
			$window.window('close');
		};

		$iframe[0].contentWindow.appshell = brackets;
		$iframe[0].contentWindow.brackets = brackets;
	}

	$window.window('loading', true, {
		lock: false
	});

	$iframe.load(function() {
		$window.window('loading', false);
	});
});