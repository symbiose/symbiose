(function () {
	Webos.Peer = function (peerData) {
		Webos.Model.call(this, peerData);
	};
	Webos.inherit(Webos.Peer, Webos.Model);

	Webos.Peer._buildPeer = function(peerData) {
		return new Webos.Peer(peerData);
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

	Webos.Observable.build(Webos.Peer);
})();