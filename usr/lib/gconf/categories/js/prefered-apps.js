var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);

var types = {
	'web-browser': {
		title: 'Websites',
		icon: 'apps/web-browser'
	},
	'email-client': {
		title: 'E-mails',
		icon: 'apps/email-client'
	},
	'calendar': {
		title: 'Calendar',
		icon: 'apps/calendar'
	},
	'audio-player': {
		title: 'Music',
		icon: 'apps/audio-player'
	},
	'video-player': {
		title: 'Videos',
		icon: 'apps/video-player'
	},
	'image-viewer': {
		title: 'Pictures',
		icon: 'apps/image-viewer'
	}
};

confWindow.window('loading', true);
W.Application.list([function(apps) {
	for (var key in types) {
		(function(key, type) {
			var item = $.w.selectButton('<img src="'+new W.Icon(type.icon).realpath(22)+'" alt="" style="width: 22px; height: 22px;"/> '+type.title), choices = {}, nbrChoices = 0;

			item.bind('selectbuttonchange', function(e, data) {
				confWindow.window('loading', true);
				Webos.Application.setPrefered(data.value, key, function() {
					confWindow.window('loading', false);
				});
			});

			for (var i in apps) {
				var app = apps[i];
				if (app.exists('type') && $.inArray(key, app.get('type')) != -1) {
					choices[app.get('command')] = app.get('title');
					nbrChoices++;
				}
			}

			item.selectButton('option', 'choices', choices);

			W.Application.getPrefered(key, [function(app) {
				if (app) {
					if (!choices[app.get('command')]) {
						choices[app.get('command')] = app.get('title');
						nbrChoices++;
						item.selectButton('option', 'choices', choices);
					}

					item.selectButton('option', 'value', app.get('command'));
				}

				if (nbrChoices == 0) {
					item.selectButton('option', {
						choices: { '': 'No application available' },
						disabled: true
					});
				}

				item.appendTo(content);
			}, function(response) {
				item.appendTo(content);
			}]);
		})(key, types[key]);
	}
	confWindow.window('loading', false);
}, function(response) {
	confWindow.window('loading', false);
	response.triggerError('Can\'t get available applications\' list');
}]);