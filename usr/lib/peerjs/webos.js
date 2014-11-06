(function () {
	Webos.Peer = function (peerData) {
		Webos.Model.call(this, peerData);
	};
	Webos.inherit(Webos.Peer, Webos.Model);

	Webos.Peer._buildPeer = function(peerData) {
		return new Webos.Peer(peerData);
	};

	// Peers

	Webos.Peer.isEnabled = function () {
		return Webos.ServerCall.websocket.isServerStarted();
	};

	Webos.Peer.connect = function(peerId) {
		if (!Webos.Peer.isEnabled()) {
			throw new Webos.Error('Websocket server not started');
		}

		var serverLocation = Webos.ServerCall.websocket.getServerLocation();

		return new Peer(peerId || '', {
			host: serverLocation.hostname,
			port: serverLocation.port,
			secure: (serverLocation.protocol == 'wss:'),
			path: serverLocation.pathname,
			debug: 3
		});
	};

	Webos.Peer.listAll = function() {
		return Webos.Peer.listByApp(null);
	};

	Webos.Peer.listByApp = function(appName) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'listPeers',
			'arguments': {
				'appName': appName
			}
		}).load([function(resp) {
			var data = resp.getData();
			console.log(data);

			var peersList = [];
			for (var i in data) {
				peersList.push(Webos.Peer._buildPeer(data[i]));
			}

			op.setCompleted(peersList);
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Peer.subscribeListByApp = function (appName, callback) {
		var onPeersList = function (event) {
			var data = event.list;

			var peersList = [];
			for (var i in data) {
				peersList.push(Webos.Peer._buildPeer(data[i]));
			}

			callback(peersList);
		};

		var eventName = 'peer.list.'+appName;

		Webos.websocket.subscribe(eventName, onPeersList);

		return function () {
			Webos.websocket.unsubscribe(eventName, onPeersList);
		};
	};

	Webos.Peer.getPeer = function(peerId) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'getPeer',
			'arguments': {
				'peerId': peerId
			}
		}).load([function(resp) {
			var data = resp.getData();
			console.log(data);

			op.setCompleted(Webos.Peer._buildPeer(data));
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	// Peer links

	Webos.Peer.listLinkedPeers = function(appName) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'listLinkedPeers',
			'arguments': {
				'appName': appName
			}
		}).load([function(resp) {
			var data = resp.getData();
			console.log(data);

			var peersList = [];
			for (var i in data) {
				peersList.push(Webos.Peer._buildPeer(data[i]));
			}

			op.setCompleted(peersList);
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	// SETTERS

	Webos.Peer.attach = function (peerId, appName) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'attachPeer',
			'arguments': {
				'peerId': peerId,
				'app': String(appName)
			}
		}).load([function(resp) {
			op.setCompleted();
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Peer.register = function(appName, isPublic) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'registerPeer',
			'arguments': {
				'peerLinkData': {
					'app': String(appName),
					'isPublic': (isPublic) ? true : false
				}
			}
		}).load([function(resp) {
			op.setCompleted();
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Peer.requestPeerLink = function(peerId, appName) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'requestPeerLink',
			'arguments': {
				'peerId': peerId,
				'appName': appName
			}
		}).load([function(resp) {
			op.setCompleted();
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Peer.confirmPeerLink = function(peerLinkId) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'confirmPeerLink',
			'arguments': {
				'peerLinkId': peerLinkId
			}
		}).load([function(resp) {
			op.setCompleted();
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Peer.revokePeerLink = function(peerLinkId) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'revokePeerLink',
			'arguments': {
				'peerLinkId': peerLinkId
			}
		}).load([function(resp) {
			op.setCompleted();
		}, function (resp) {
			op.setCompleted(resp);
		}]);

		return op;
	};

	Webos.Observable.build(Webos.Peer);
})();