Webos.require([
	'/usr/lib/peerjs/peer.js',
	'/usr/lib/peerjs/webos.js'
], function() {
	// Compatibility shim
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

	var $win = $.w.window.main({
		title: 'Empathy'
	});
	var $winCtn = $win.window('content');

	var $callWin = $.w.window({
		title: 'Call'
	});
	var $callWinCtn = $callWin.window('content');

	var $dstVideo = $('<video></video>', {
		autoplay: '',
		muted: 'true'
	}).css({ width: '500px', height: 'auto' });
	var $srcVideo = $('<video></video>', {
		autoplay: '',
		muted: 'true'
	}).css({ width: '280px', height: 'auto' });
	$callWinCtn.append($dstVideo).append($srcVideo);

	var peer;

	var $peerIdEntry = $.w.textEntry('My peer ID: ').appendTo($winCtn);

	var callPeer = function (dst) {
		// Get audio/video stream
		navigator.getUserMedia({audio: true, video: true}, function(stream){
			// Set your video displays
			$srcVideo.attr('src', URL.createObjectURL(stream));
			
			var call = peer.call(dst, stream);
			handleMediaConn(call);
		}, function(err) {
			$callWin.window('close');
			console.log(err);
		});

		$callWin.window('open');
	};

	var shareScreen = function (dst) {
		// Seems to only work over SSL.
		navigator.getUserMedia({
			audio: false,
			video: {
				mandatory: {
					chromeMediaSource: 'screen'
					//maxWidth: 1280,
					//maxHeight: 720
				}
			}
		}, function(stream) {
			// Set your video displays
			$srcVideo.attr('src', URL.createObjectURL(stream));

			var call = peer.call(dst, stream);
			handleMediaConn(call);
		}, function(err) {
			$callWin.window('close');
			console.log(err);
		});

		$callWin.window('open');
	};

	var answerCall = function(call) {
		// Get audio/video stream
		navigator.getUserMedia({audio: true, video: true}, function(stream){
			// Set your video displays
			$srcVideo.attr('src', URL.createObjectURL(stream));
			
			call.answer(stream);
			handleMediaConn(call);
		}, function(){
			$callWin.window('close');
		});

		$callWin.window('open');
	};

	var handleMediaConn = function(mediaConn) {
		$callWin.window('option', 'title', 'Calling '+mediaConn.peer);

		mediaConn.on('stream', function (stream) {
			$dstVideo.attr('src', URL.createObjectURL(stream));
		});
		mediaConn.on('close', function () {
			$callWin.window('close');
		});
		mediaConn.on('error', function () {
			$callWin.window('close');
		});

		$callWin.one('windowclose', function () {
			if (mediaConn.open) {
				mediaConn.close();
			}
		});
	};

	var $openBtn = $.w.button('Connect').click(function () {
		peer = new Peer($peerIdEntry.textEntry('value'), {
			host: window.location.hostname, //TODO: replace by config from Webos.websocket
			port: 9000, //TODO: replace by config from Webos.websocket
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

			$dstCallBtn.click(function () {
				var dst = $dstEntry.textEntry('value');
				callPeer(dst);
			});
			$dstShareScreenBtn.click(function () {
				var dst = $dstEntry.textEntry('value');
				shareScreen(dst);
			});

			$closeBtn.click(function () {
				peer.disconnect();
			});
		});

		peer.on('connection', function(conn) {
			$logs.append('Connected with '+conn.peer+'!<br />');
			$dstEntry.textEntry('value', conn.peer);

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

		peer.on('call', function(call) {
			answerCall(call);
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

	var $registerBtn = $.w.button('Register (public)').appendTo($winCtn);

	var $listPeersBtn = $.w.button('List peers').click(function () {
		Webos.Peer.listByApp('komunikado').on('success', function (data) {
			var list = data.result;
			var peers = 'Connected peers ('+list.length+'):<br />';
			for (var i = 0; i < list.length; i++) {
				var thisPeer = list[i], peerName = 'anonymous', peerColor = 'black';

				if (!thisPeer.get('online')) {
					peerColor = 'gray';
				} else if (thisPeer.get('registered')) {
					peerColor = 'red';
				}
				if (thisPeer.get('peerId')) {
					peerName = thisPeer.get('peerId');
				}
				if (thisPeer.get('userId')) {
					if (thisPeer.get('userId')) {
						peerName += ' (username: '+thisPeer.get('user')['username']+', realname: '+thisPeer.get('user')['realname']+')';
					} else {
						peerName += ' (user: '+thisPeer.get('userId')+')';
					}
				}

				peers += '<span style="color:'+peerColor+'">'+peerName+'</span><br />';
			}
			$logs.append(peers+'<br />');
		});
	}).appendTo($winCtn);

	var $dstEntry = $.w.textEntry('To peer ID: ').appendTo($winCtn);
	var $dstConnectBtn = $.w.button('Talk').appendTo($winCtn);
	var $dstDisconnectBtn = $.w.button('End discussion').appendTo($winCtn);
	var $dstInfoBtn = $.w.button('Info').click(function () {
		var dst = $dstEntry.textEntry('value');
		if (!dst) {
			return;
		}

		Webos.Peer.getPeer(dst).on('complete', function (data) {
			if (data.failed) {
				if (data.result.getStatusCode() == 404) {
					$logs.append('Error: user is offline<br />');
				} else {
					$logs.append('Error (#'+data.result.getStatusCode()+')<br />');
				}
			} else {
				var peer = data.result;

				var peerStr = 'Online';

				if (peer.get('registered')) {
					if (peer.get('userId')) {
						peerStr += ' (registered: '+peer.get('userId')+')';
					} else {
						peerStr += ' (registered)';
					}
				} else {
					peerStr += ' (anonymous)';
				}

				$logs.append(peerStr+'<br />');
			}
		});
	}).appendTo($winCtn);
	$winCtn.append('<br />');

	var $dstCallBtn = $.w.button('Call').appendTo($winCtn);
	var $dstShareScreenBtn = $.w.button('Share screen').appendTo($winCtn);

	var $msgEntry = $.w.textEntry('Message : ').appendTo($winCtn);
	var $sendBtn = $.w.button('Send').appendTo($winCtn);

	var $logs = $.w.container().css({
		height: 200,
		overflow: 'auto'
	}).appendTo($winCtn);

	$win.window('open');

	$logs.append('Ready.<br />');
});