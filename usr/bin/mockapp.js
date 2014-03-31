var proc = this, args = proc.getArguments(), term = proc.getTerminal();

(function () {
	var osName = 'Elementary OS';

	var downloadOs = function () {
		window.open('http://www.elementaryos-fr.org/telecharger-elementary-os/');
	};

	var mockapps = {
		geary: {
			title: 'Geary'
		},
		maya: {
			title: 'Calendar'
		}
	};

	if (args.isOption('download')) {
		downloadOs();
		proc.stop();
		return;
	}

	var appName = args.getParam(0);
	if (!appName) {
		term.echo('usage: mockapp app');
		proc.stop();
		return;
	}

	var app = mockapps[appName];
	if (!app) {
		term.echo('"'+appName+'": no matching app found');
		proc.stop();
		return;
	}

	W.xtag.loadUI('/usr/share/templates/mockapp/'+appName+'.html', function(windows) {
		var $win = $(windows).filter(':eq(0)');

		$win.find('img').on('load', function () {
			$win.window('center');
		});

		var $itsJustAMockApp = $.w.entryContainer().appendTo($win.window('content')).hide().css({
			position: 'absolute',
			top: 0,
			left: 0,
			height: '100%',
			width: '100%',
			backgroundColor: 'rgba(0,0,0,0.8)',
			color: 'white',
			textAlign: 'center',
			paddingTop: '100px'
		});

		$itsJustAMockApp.append('<h1>Il s\'agit seulement d\'une demo !</h1>');
		$itsJustAMockApp.append('<p>Pour pouvoir utiliser pleinement '+osName+', vous devez le t&eacute;l&eacute;charger.</p>');

		$btns = $('<p></p>').css('margin-top', '20px').appendTo($itsJustAMockApp);
		$gotItBtn = $.w.button('J\'ai compris !').click(function () {
			$itsJustAMockApp.fadeOut('fast');
		}).appendTo($btns);
		$downloadBtn = $.w.button('T&eacute;l&eacute;charger '+osName, true).click(function () {
			downloadOs();
		}).appendTo($btns);

		$win.window('content').add($win.window('header')).click(function () {
			if (!$itsJustAMockApp.is(':animated')) {
				$itsJustAMockApp.fadeIn('fast');
			}
		});

		$win.window('open');
	});
})();