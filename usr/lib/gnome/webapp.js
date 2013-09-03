(function() {
	if (!navigator.mozApps) {
		return;
	}

	var getManifestPath = function() {
		var manifestFile = W.File.get('/usr/share/manifests/webos.webapp');

		return window.location.origin+'/'+window.location.pathname+'/'+manifestFile.get('realpath');
	};

	var installWebapp = function() {
		var manifestFile = W.File.get('/usr/share/manifests/webos.webapp');
		var request = navigator.mozApps.install(getManifestPath());

		/*request.onsuccess = function () {
			// Save the App object that is returned
			var appRecord = this.result;
			alert('Installation successful!');
		};
		request.onerror = function () {
			// Display the error information from the DOMError object
			alert('Install failed, error: ' + this.error.name);
		};*/
	};

	var askForInstallation = function() {
		var notificationsButtons = [
			$.w.button('Install app').click(function() {
				installWebapp();
			})
		];
		
		$.w.notification({
			title: 'Install '+Webos.name+' on your device',
			message: 'You can install the webos to provide a better integration with your device.',
			icon: new W.Icon('actions/document-save'),
			widgets: notificationsButtons
		});
	};

	//Check if the app is already installed
	var request = navigator.mozApps.checkInstalled(getManifestPath());
	request.onsuccess = function() {
		if (!request.result) { //App not installed
			askForInstallation();
		}
	};
})();