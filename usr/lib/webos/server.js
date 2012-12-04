(function() {
	if (Webos.Server) {
		return;
	}

	var Server = {};

	Server._data = null;
	Server.getData = function $_WServer_getData(callback) {
		callback = Webos.Callback.toCallback(callback);

		if (Server._data !== null) {
			callback.success(Server._data);
			return;
		}

		return new W.ServerCall({
			'class': 'ServerController',
			'method': 'getSystemData'
		}).load([function(response) {
			var data = response.getData();
			Server._data = data;

			callback.success(data);
		}, callback.error]);
	};

	Webos.Server = Server;
})();