Webos.require(['/usr/lib/peerjs/peer.js'], function() {
	var peer = new Peer(window.peerName || 'test1', {
		host: window.location.hostname,
		port: 9000,
		debug: 3
	});

	peer.on('open', function(id) {
		console.log('My peer ID is: ' + id);

		if (id == 'test2') {
			var conn = peer.connect('test1@localhost:9000/peerjs');

			// Receive messages
			conn.on('data', function(data) {
				console.log('Received', data);
			});

			// Send messages
			conn.on('open', function(data) {
				console.log('Connection opened! Sending data...');
				conn.send('Hello!');
			});
		}
	});

	peer.on('connection', function(conn) {
		// Receive messages
		conn.on('data', function(data) {
			console.log('Received', data);

			console.log('Sending response...');
			conn.send('How are you ?');
		});
	});

	window.peer = peer;
	console.log(peer);
});