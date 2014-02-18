(function() {
	var GnomeSystemMonitor = function() {
		Webos.Observable.call(this);

		var that = this;
		this._pid = W.Process.current().getPid();

		this._window = $.w.window.main({
			title: 'System monitor',
			icon: new W.Icon('apps/system-monitor'),
			width: 500,
			height: 300
		});

		this._window.window('loading', true);

		this.on('translationsloaded', function() {
			var t = this._translations;

			this._window
				.window('loading', false)
				.window('option', 'title', t.get('System monitor'));

			var headers = this._window.window('header');
			var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
			this._ui.buttons = {};
			this._ui.buttons.refresh = $.w.toolbarWindowHeaderItem(t.get('Refresh'), 'actions/reload')
				.click(function() {
					that.refreshProcesses();
				})
				.appendTo(toolbar);
			this._ui.buttons.kill = $.w.toolbarWindowHeaderItem(t.get('Kill processes'), 'actions/remove')
				.click(function() {
					that.askKillProcesses();
				})
				.appendTo(toolbar);

			//that._ui.tabs = $.w.tabs().appendTo(that._window.window('content'));
			//that._ui.processesContainer = that._ui.tabs.tab(t.get('Processes'));
			this._ui.processesContainer = that._window.window('content');
			this._ui.processesList = $.w.list(['', t.get('Process name'), t.get('ID'), t.get('Status'), t.get('Started')]).appendTo(that._ui.processesContainer);

			this._window.window('open');

			this.refreshProcesses();
			var eventId = Webos.Process.on('start.gnomesystemmonitor stop.gnomesystemmonitor idle.gnomesystemmonitor', function() {
				that.refreshProcesses();
			});
			$(document).on('windowopen.gnomesystemmonitor', function() {
				that.refreshProcesses();
			});
			W.Process.get(this._pid).on('stop.self.gnomesystemmonitor', function() {
				Webos.Process.off(eventId);
				$(document).off('windowopen.gnomesystemmonitor');
			});
		});

		Webos.TranslatedLibrary.call(this);
	};
	GnomeSystemMonitor.prototype = {
		_translationsName: 'gnome-system-monitor',
		_ui: {},
		refreshProcesses: function() {
			var that = this, t = this._translations;

			var itemsContainer = that._ui.processesList.list('content');
			itemsContainer.empty();

			var processesList = Webos.Process.listAll();
			var mainWindows = $.w.window.main.list();
			for (var i = 0; i < processesList.length; i++) {
				(function(proc) {
					var procData = {
						id: proc.getPid(),
						name: proc.cmdText || 'unknown',
						icon: 'apps/default',
						status: proc.state(),
						started: ((new Date()).getTime() - proc.startTime()) / 1000 + ' s'
					};

					mainWindows.each(function() {
						if ($(this).window('pid') == procData.id) {
							procData.icon = $(this).window('option', 'icon');
						}
					});

					if (procData.status == 'killed') {
						return;
					}

					var item = $.w.listItem([$.w.icon(procData.icon, 24), procData.name, procData.id, procData.status, procData.started]);
					item.data('pid.gnomesystemmonitor', procData.id);

					item.appendTo(itemsContainer);
				})(processesList[i]);
			}
		},
		askKillProcesses: function() {
			var that = this, t = this._translations;

			var $sel = this._ui.processesList.list('selection');
			if ($sel.length == 0) {
				return;
			}

			var processes = [];
			$sel.each(function() {
				var procId = $(this).data('pid.gnomesystemmonitor');
				processes.push(procId);
			});

			$.w.window.confirm({
				title: t.get('Kill processes'),
				label: t.get('Are you sure you want to kill selected processes ?'),
				details: t.get('Unsaved data will be lost.'),
				confirm: function() {
					that._killProcesses(processes);
				},
				cancelLabel: t.get('Cancel'),
				confirmLabel: t.get('Kill processes')
			}).window('open');
		},
		_killProcesses: function(processes) {
			var that = this, t = this._translations;

			var mainWindows = $.w.window.main.list();

			for (var i = 0; i < processes.length; i++) {
				var procId = processes[i], proc = Webos.Process.get(procId);

				var killed = false;
				mainWindows.each(function() {
					if ($(this).window('pid') == procId) {
						$(this).window('close');
						killed = true;
						return false;
					}
				});
				if (killed) {
					continue;
				}

				if (procId == that._pid) {
					that._window.window('close');
					continue;
				}

				if (proc) {
					proc.stop();
				}
			}
		}
	};
	Webos.inherit(GnomeSystemMonitor, Webos.Observable);
	Webos.inherit(GnomeSystemMonitor, Webos.TranslatedLibrary);

	GnomeSystemMonitor.open = function() {
		return new GnomeSystemMonitor();
	};

	window.GnomeSystemMonitor = GnomeSystemMonitor; //Export API
})();