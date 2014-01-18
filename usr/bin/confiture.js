var that = this;

var args = that.getArguments(), term = that.getTerminal();

Webos.require([
	'/usr/lib/apt/apt.js',
	'/usr/lib/confiture/webos.js'
], function() {
	var options = args.getOptions(), targets = args.getParams();

	var addOptToTargets = function (optionName) {
		if (args.getOption(optionName)) {
			targets.push(args.getOption(optionName));
		}
	};

	var getTargets = function(options) {
		var options = $.extend({
			forceLocal: false
		}, options);

		var op = new Webos.Operation();

		if (targets.length == 0) {
			op.setCompleted();
			return;
		}

		var pkgs = [];
		var gotPkg = function (pkg) {
			pkgs.push(pkg);

			if (pkg.get('installed') && !options.forceLocal) {
				term.echo('Warning: '+pkg.get('name')+'-'+pkg.get('version')+' is already installed -- reinstalls\n');
			}

			if (pkgs.length == targets.length) {
				op.setCompleted(pkgs);
			}
		};

		var pkgNotFound = function (resp) {
			op.setCompleted(resp);
		};

		for(var i = 0; i < targets.length; i++) {
			var method = Webos.Confiture.Package.get;
			if (options.forceLocal) {
				method = Webos.Package.getInstalledPackage;
			}

			method(targets[i], [function (pkg) {
				gotPkg(pkg);
			}, function (resp) {
				pkgNotFound(resp);
			}]);
		}

		return op;
	};

	var operations = {
		refresh: function() {
			term.echo(':: Refreshing packages databases...\n');

			var op = new Webos.Operation();

			Webos.Confiture.Package.updateCache([function(result) {
				for(var i = 0; i < result.updated.length; i++) {
					term.echo(' '+result.updated[i]+' updated\n');
				}
				op.setCompleted();
			}, function(res) {
				term.echo('error: '+res.getError().message);
				op.setCompleted(false);
			}]);

			return op;
		},
		sysupgrade: function() {
			term.echo(':: Starting full system upgrade...\n');

			var op = new Webos.Operation();

			Webos.Confiture.Package.listUpgrades([function (list) {
				for (var i = 0; i < list.length; i++) {
					targets.push(list[i].get('name'));
				}

				if (!targets.length) {
					term.echo('Nothing to do.');
				}

				op.setCompleted();
			}, function (resp) {
				term.echo(resp);
				op.setCompleted(resp);
			}]);

			return op;
		},
		install: function() {
			var op = new Webos.Operation();

			if (targets.length == 0) {
				term.echo('Nothing to do.');
				op.setCompleted();
				return;
			}

			term.echo('Reading packages list...\n');

			var pkgs = [];
			var askInstall = function () {
				term.echo('\nPackages ('+pkgs.length+'):');

				var totalSize = 0, totalExtractedSize = 0;
				for (var i = 0; i < pkgs.length; i++) {
					var pkg = pkgs[i];

					term.echo(' '+pkg.get('name')+'-'+pkg.get('version'));

					totalSize += pkg.get('size');
					totalExtractedSize += pkg.get('extractedSize');
				}

				term.echo('\n\nTotal download size: '+Webos.File.bytesToSize(totalSize)+'\n');
				term.echo('Total installed size: '+Webos.File.bytesToSize(totalExtractedSize)+'\n\n');

				term.prompt(function(val) {
					if (val == 'Y') {
						doInstall();
					} else {
						that.stop();
					}
				}, {
					label: ':: Proceed with installation?',
					type: 'yn'
				});
			};

			var doInstall = function () {
				term.echo(':: Downloading and installing packages...\n');

				Webos.Confiture.install(pkgs, [function(resp) {
					term.echo(resp);
					op.setCompleted();
				}, function(resp) {
					term.echo(resp);
					op.setCompleted(resp);
				}]);
			};

			var targetsOp = getTargets();
			targetsOp.on('success', function (data) {
				pkgs = data.result;
				askInstall();
			});
			targetsOp.on('error', function (data) {
				term.echo(data.result);
				op.setCompleted(data.result);
			});

			return op;
		},
		remove: function () {
			var op = new Webos.Operation();

			if (targets.length == 0) {
				term.echo('Nothing to do.');
				op.setCompleted();
				return;
			}

			term.echo('Reading packages list...\n');

			var pkgs = [];
			var askRemove = function () {
				term.echo('\nPackages ('+pkgs.length+'):');

				var totalExtractedSize = 0;
				for (var i = 0; i < pkgs.length; i++) {
					var pkg = pkgs[i];

					term.echo(' '+pkg.get('name')+'-'+pkg.get('version'));

					totalExtractedSize += pkg.get('extractedSize');
				}

				term.echo('\n\nTotal deleted size: '+Webos.File.bytesToSize(totalExtractedSize)+'\n\n');

				term.prompt(function(val) {
					if (val == 'Y') {
						doRemove();
					} else {
						that.stop();
					}
				}, {
					label: ':: Do you want to remove these packages?',
					type: 'yn'
				});
			};

			var doRemove = function () {
				Webos.Confiture.remove(pkgs, [function(resp) {
					term.echo(resp);
					op.setCompleted();
				}, function(resp) {
					term.echo(resp);
					op.setCompleted(resp);
				}]);
			};

			var targetsOp = getTargets({ forceLocal: true });
			targetsOp.on('success', function (data) {
				pkgs = data.result;
				askRemove();
			});
			targetsOp.on('error', function (data) {
				term.echo(data.result);
				op.setCompleted(data.result);
			});

			return op;
		}
	};

	if (args.isOption('S') || args.isOption('sync')) { // Synchronize
		addOptToTargets('S');
		addOptToTargets('sync');

		var operationsToExecute = [];

		if (args.isOption('y') || args.isOption('refresh')) { // Refresh cache
			operationsToExecute.push('refresh');

			addOptToTargets('y');
			addOptToTargets('refresh');
		}

		if (args.isOption('u') || args.isOption('sysupgrade')) { // Upgrade system
			operationsToExecute.push('sysupgrade');

			addOptToTargets('u');
			addOptToTargets('sysupgrade');
		}

		if (args.isOption('h') || args.isOption('help')) { // Help
			term.echo('usage: confiture {-S --sync} [options] [package(s)]\n');
			term.echo('options:\n');
			term.echo('  -u, --sysupgrade         upgrade all installed packages\n');
			term.echo('  -y, --refresh            update databases from server\n');
			that.stop();
			return;
		}

		if (operationsToExecute.length == 0 && !targets.length) {
			term.echo('error: no target specified (use -h to display help)\n');
			that.stop();
			return;
		}

		var opId = 0;
		var executeOperation = function() {
			if (operationsToExecute[opId]) {
				var opName = operationsToExecute[opId];
			} else if (targets.length) {
				var opName = 'install';
			} else {
				that.stop();
				return;
			}

			var op = operations[opName]();

			op.on('success', function() {
				opId++;

				if (opName == 'install') {
					targets = [];
				}

				executeOperation();
			});
			op.on('error', function() {
				that.stop();
			});
		};

		executeOperation();
	} else if (args.isOption('R') || args.isOption('remove')) { //Remove
		addOptToTargets('R');
		addOptToTargets('remove');

		var op = operations.remove();
		op.on('success error', function() {
			that.stop();
		});
	} else if (args.isOption('h') || args.isOption('help')) { // Help
		term.echo('usage: confiture <operation> [...]\n');
		term.echo('confiture {-h --help}\n');
		term.echo('confiture {-V --version}\n');
		term.echo('confiture {-R --remove}   [options] <package(s)>\n');
		term.echo('confiture {-S --sync}     [options] [package(s)]');
		that.stop();
	} else if (args.isOption('V') || args.isOption('version')) { // Version
		term.echo('Confiture v1.0 alpha 1');
		that.stop();
	} else {
		term.echo('error: no operation specified (use -h to display help)');
		that.stop();
	}
});