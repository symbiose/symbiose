(function() {
	if (!navigator.mozApps) {
		return;
	}

	var getManifestPath = function() {
		var manifestFile = W.File.get('/usr/share/manifests/webos.webapp');

		return window.location.origin+'/'+window.location.pathname+'/'+manifestFile.get('realpath');
	};

	var installWebapp = function(callback) {
		callback = Webos.Callback.toCallback(callback);

		var request = navigator.mozApps.install(getManifestPath());

		request.onsuccess = function () {
			// Save the App object that is returned
			var appRecord = this.result;
			callback.success(appRecord);
		};
		request.onerror = function () {
			// Display the error information from the DOMError object
			callback.error(Webos.Callback.Result.error('Webapp install failed, error: ' + this.error.nam));
		};
	};

	var askForInstallation = function() {
		if ($.webos.appIndicator) {
			var $indicator = $.webos.appIndicator({
				title: 'Install '+Webos.name,
				icon: new W.Icon('actions/document-save')
			});

			$installMenuItem = $.w.menuItem('Install '+Webos.name+' on this device')
				.attr('title', 'You can install the webos to provide a better integration with your device.')
				.click(function() {
					installWebapp(function() {
						$indicator.appIndicator('hide');
					});
				})
				.appendTo($indicator.appIndicator('content'));

			$indicator.appIndicator('show');
		}
	};

	//Check if the app is already installed
	var request = navigator.mozApps.checkInstalled(getManifestPath());
	request.onsuccess = function() {
		if (!request.result) { //App not installed
			askForInstallation();
		}
	};
})();