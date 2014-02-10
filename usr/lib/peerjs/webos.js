(function () {
	Webos.Peer = function (peerData) {
		Webos.Model.call(this, peerData);
	};
	Webos.inherit(Webos.Peer, Webos.Model);

	Webos.Peer._buildPeer = function(peerData) {
		return new Webos.Peer(peerData);
	};

	// Peers

	Webos.Peer.connect = function(peerId) {
		return new Peer(peerId || '', {
			host: window.location.hostname, //TODO: replace by config from Webos.websocket
			port: 9000, //TODO: replace by config from Webos.websocket
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
	
	Webos.Peer.register = function(appName, isPublic) {
		var op = new Webos.Operation();

		new Webos.ServerCall({
			'class': 'PeerController',
			'method': 'registerPeer',
			'arguments': {
				'peerLinkData': {
					'app': String(appName),
					'public': (isPublic) ? true : false
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