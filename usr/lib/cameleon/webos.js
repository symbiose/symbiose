(function () {
	var CameleonWindow = function CameleonWindow() {
		Webos.Observable.call(this);

		this.bind('translationsloaded', function() {
			var that = this, t = this._translations;

			this._window = $.w.window.main({
				title: t.get('Cameleon interface switcher'),
				icon: new W.Icon('actions/interface'),
				width: 400,
				resizable: false,
				dialog: true
			});

			var content = this._window.window('content');

			var desc = $.w.label(t.get('To switch between interfaces, choose one and click OK :')).appendTo(content);
			this._uisList = $.w.list().appendTo(content);
			var btnContainer = $.w.buttonContainer().appendTo(content);
			var submitBtn = $.w.button(t.get('OK')).click(function() {
				that._launchUI(that._selectedUI);
			}).appendTo(btnContainer);

			this._init();

			this._window.window('open');
		});

		Webos.TranslatedLibrary.call(this);
	};
	CameleonWindow.prototype = {
		_translationsName: 'cameleon',
		_uisList: $(),
		_selectedUI: null,

		_init: function () {
			var that = this;

			this._window.window('loading', true);

			Webos.UserInterface.getList(function (list) {
				for (var i = 0; i < list.length; i++) {
					(function(ui) {
						var $item = $.w.listItem([(ui.get('displayname') || ui.get('name'))]);

						$item.bind('listitemselect', function() {
							that._selectedUI = ui;
						}).bind('listitemunselect', function() {
							that._selectedUI = null;
						});

						that._uisList.list('content').append($item);
					})(list[i]);
				}

				that._window.window('loading', false);
			});
		},
		_launchUI: function(ui) {
			if (!ui) {
				return;
			}

			this._window.window('loading', true);

			Webos.UserInterface.load(ui.get('name'));
		}
	};

	Webos.inherit(CameleonWindow, Webos.Observable);
	Webos.inherit(CameleonWindow, Webos.TranslatedLibrary);

	window.CameleonWindow = CameleonWindow;
})();