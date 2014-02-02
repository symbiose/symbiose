Webos.require(['/usr/lib/peerjs/peer.js'], function() {
	var $win = $.w.window({
		title: 'Empathy'
	});
	var $winCtn = $win.window('content');

	var peer;

	var $peerIdEntry = $.w.textEntry('My peer ID : ').appendTo($winCtn);

	var $openBtn = $.w.button('Connect').click(function () {
		peer = new Peer($peerIdEntry.textEntry('value'), {
			host: window.location.hostname,
			port: 9000,
			debug: 3
		});

		peer.on('open', function(id) {
			$logs.append('My peer ID is: ' + id + '<br />');

			$dstConnectBtn.click(function () {
				var dst = $dstEntry.textEntry('value');
				var conn = peer.connect(dst);

				// Receive messages
				conn.on('data', function(data) {
					$logs.append('Received: '+data+'<br />');
				});

				// Send messages
				conn.on('open', function(data) {
					$logs.append('Connection opened!<br />');

					$sendBtn.click(function () {
						var msg = $msgEntry.textEntry('value')
						conn.send(msg);
						$msgEntry.textEntry('value', '');

						$logs.append('Sent: '+msg+'<br />');
					});

					$dstDisconnectBtn.click(function () {
						conn.close();
					});
				});

				conn.on('close', function () {
					$logs.append('Connection to peer closed.<br />');
				});

				conn.on('error', function (err) {
					$logs.append('Error: '+err.type+'<br />');
				});

				$logs.append('Connecting with '+dst+'...<br />');
			});

			$closeBtn.click(function () {
				peer.disconnect();
			});
		});

		peer.on('connection', function(conn) {
			$logs.append('Connected with '+conn.peer+'!<br />');

			// Receive messages
			conn.on('data', function(data) {
				$logs.append('Received: '+data+'<br />');
			});

			conn.on('close', function () {
				$logs.append('Connection to peer closed.<br />');
			});

			conn.on('error', function (err) {
				$logs.append('Error: '+err.type+'<br />');
			});

			$sendBtn.click(function () {
				var msg = $msgEntry.textEntry('value')
				conn.send(msg);
				$msgEntry.textEntry('value', '');

				$logs.append('Sent: '+msg+'<br />');
			});
		});

		peer.on('close', function() {
			$logs.append('Connection to server closed.<br />');
		});

		peer.on('error', function(err) {
			$logs.append('Error: '+err.type+'<br />');
		});

		window.peer = peer;
		console.log(peer);
	}).appendTo($winCtn);
	var $closeBtn = $.w.button('Disconnect').appendTo($winCtn);

	var $dstEntry = $.w.textEntry('To : ').appendTo($winCtn);
	var $dstConnectBtn = $.w.button('Talk').appendTo($winCtn);
	var $dstDisconnectBtn = $.w.button('End discussion').appendTo($winCtn);

	var $msgEntry = $.w.textEntry('Message : ').appendTo($winCtn);
	var $sendBtn = $.w.button('Send').appendTo($winCtn);

	var $logs = $.w.container().css({
		height: 200,
		overflow: 'auto'
	}).appendTo($winCtn);

	$win.window('open');

	$logs.append('Ready.<br />');
});