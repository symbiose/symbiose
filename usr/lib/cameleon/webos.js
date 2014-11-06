(function () {
	var CameleonWindow = function CameleonWindow() {
		Webos.Observable.call(this);

		this._window = $.w.window.main({
			title: 'Cameleon interface switcher',
			icon: new W.Icon('actions/interface'),
			width: 420,
			resizable: false,
			dialog: true
		});

		this.on('translationsloaded', function() {
			var that = this, t = this._translations;

			this._window.window('option', 'title', t.get('Cameleon interface switcher'));

			var content = $.w.entryContainer().submit(function () {
				that._launchUI(that._selectedUI);
			});
			this._ctn = content;

			var desc = $.w.label(t.get('To switch between interfaces, choose one and click OK :')).appendTo(content);
			this._uisList = $.w.list().appendTo(content);
			var btnContainer = $.w.buttonContainer().appendTo(content);
			var submitBtn = $.w.button(t.get('OK'), true).click(function() {
				
			}).appendTo(btnContainer);

			content.appendTo(this._window.window('content'));

			this._init();

			this._window.window('open');
		});

		Webos.TranslatedLibrary.call(this);
	};
	CameleonWindow.prototype = {
		_translationsName: 'cameleon',
		_ctn: $(),
		_uisList: $(),
		_selectedUI: null,

		_init: function () {
			var that = this;

			this._window.window('loading', true);

			Webos.UserInterface.getList(function (list) {
				for (var i = 0; i < list.length; i++) {
					(function(ui) {
						var $item = $.w.listItem([(ui.get('displayname') || ui.get('name'))]);

						$item.on('listitemselect', function() {
							that._selectedUI = ui;
						}).on('listitemunselect', function() {
							that._selectedUI = null;
						}).dblclick(function (e) {
							e.preventDefault();

							that._selectedUI = ui;
							that._ctn.submit();
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