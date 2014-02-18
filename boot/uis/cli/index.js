(function() {
	var Cli = {
		_$container: $('.cli-container')
	};

	Cli.echo = function(value) {
		Cli._$container.append(value);
	};

	Cli.clear = function() {
		Cli._$container.empty();
	};

	Cli.prompt = function(callback, options) {
		var defaults = {
			label: '',
			type: 'text'
		};
		options = $.extend({}, defaults, options);

		$prompt = $('<div></div>').addClass('cli-prompt');

		$label = $('<span></span>').addClass('cli-prompt-label').html(options.label);

		$input = $('<input/>', { type: options.type });
		$input.keydown(function(e) {
			if (e.keyCode == 13) {
				var value = $input.val();

				if (options.type != 'password') {
					$input.replaceWith(value);
				} else {
					$input.remove();
				}

				callback(value);

				e.preventDefault();
			}
		});

		$prompt.prepend($label).append($input);

		Cli.echo($prompt);

		$input.focus();
	};

	Cli.login = function() {
		Webos.User.getLogged(function(user) {
			if (user) {
				Cli.displayCmdPrompt();
			} else {
				Cli.clear();

				Cli.prompt(function(username) {
					Cli.prompt(function(password) {
						Webos.User.login(username, password, [function() {
							Cli.displayCmdPrompt();
						}, function(response) {
							Cli.echo('<p>Login incorrect.</p>');
							Cli.login();
						}]);
					}, { label: 'Password :', type: 'password' });
				}, { label: 'Login :' });
			}
		});
	};

	Cli.displayCmdPrompt = function() {
		if (!Cli._terminal) {
			Cli._terminal = new W.Terminal();

			Cli._terminal.on('echo', function(data) {
				Cli.echo(data.contents);
			});
		}

		Cli._terminal.refreshData([function() {
			var data = Cli._terminal.data();

			if (data.username === false) {
				Cli.login();
				return;
			}

			var label = data.username+'@'+data.host+':'+data.location+((data.root) ? '#' : '$');

			Cli.prompt(function(cmd) {
				if (!cmd) {
					Cli.displayCmdPrompt();
					return;
				}

				var process = Cli._terminal.enterCmd(cmd, [function() {
					var onStopFn = function() {
						Cli.displayCmdPrompt();
					};

					if (process.isRunning()) {
						process.on('stop', function() {
							onStopFn();
						});
					} else {
						onStopFn();
					}
				}, function(response) {
					Cli.displayCmdPrompt();
				}]);
			}, { label: label });
		}, function(response) {
			Cli.login();
		}]);
	};


	Webos.Error.setErrorHandler(function(error) {
		var message;
		if (error instanceof Webos.Error) {
			message = error.html.message;
		} else {
			message = error.name + ' : ' + error.message;
		}

		Cli.echo('<p>'+message+'</p>');
	});

	Cli.login();
})();