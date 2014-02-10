var process = this;

var args = process.getArguments(), term = process.getTerminal();

Webos.require([
	'/usr/lib/peerjs/peer.js',
	'/usr/lib/peerjs/webos.js'
], function() {
	var options = args.getOptions(), params = args.getParams();

	var Webcat = {
		version: '0.1',
		_peer: null,
		peer: function () {
			return this._peer;
		},
		init: function () {
			if (this._peer && !this._peer.disconnected) {
				return;
			}

			var peer = Webos.Peer.connect();

			peer.on('close', function () {
				process.stop();
			});
			peer.on('error', function (err) {
				term.echo('\nError: '+err.type);
			});

			process.on('stop', function () {
				if (!peer.disconnected) {
					peer.destroy();
				}
			});

			this._peer = peer;
		},
		listen: function () {
			var that = this;

			this.init();

			var peer = Webcat.peer();
			peer.on('open', function(peerId) {
				term.echo('\nListening with peer id: '+peerId+'\n');
			});
			peer.on('connection', function(conn) {
				that._handleConnection(conn);
			});
		},
		connect: function (dst) {
			var that = this;

			this.init();

			var peer = Webcat.peer();
			peer.on('open', function(peerId) {
				var conn = peer.connect(dst);
				
				that._handleConnection(conn);
			});
		},
		_handleConnection: function (conn) {
			var that = this;

			conn.on('data', function(data) {
				if (data === String.fromCharCode(04)) {
					process.stop();
				} else {
					term.echo(data+'\n');
				}
			});

			conn.on('close', function(data) {
				process.stop(); //TODO: do not close if listening
			});
			conn.on('error', function (err) {
				term.echo('\nError: '+err.type);
			});

			process.on('stop', function () {
				if (conn.open) {
					conn.close();
				}
			});

			var initIo = function () {
				term.prompt(function(val) {
					if (val == 'EOF') {
						val = String.fromCharCode(04);
					}

					conn.send(val);
					initIo();
				});
			};

			if (conn.open) {
				initIo();
			} else {
				conn.on('open', function(data) {
					initIo();
				});
			}
			
		}
	};

	if (args.isOption('V') || args.isOption('version')) { // Version
		term.echo('webcat v'+Webcat.version);
		process.stop();
	} else if (args.isOption('h') || args.isOption('help')) { // Help
		term.echo('webcat v'+Webcat.version);
		term.echo('\nBasic usages:');
		term.echo('\nconnect to a peer: webcat peer [options]');
		term.echo('\nlisten for inbound: webcat -l [options]');
		term.echo('\n\nOptions:');
		term.echo('\n  -h, --help                 display this help and exit');
		term.echo('\n  -l, --listen               listen mode, for inbound connects');
		process.stop();
	} else if (args.isOption('l') || args.isOption('listen')) { // Listen for inbound
		Webcat.listen();
	} else if (params.length > 0) {
		var dst = params[0];

		Webcat.connect(dst);
	} else {
		term.echo('No arguments given. Use --help for help.');
		process.stop();
	}
});