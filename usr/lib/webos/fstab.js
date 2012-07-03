new Webos.ScriptFile('/usr/lib/webos/config.js');

/**
 * @namespace
 */
Webos.File.fstab = {
	mount: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			var data = config.data();
			console.log(config);
			for (var local in data) {
				var mountData = jQuery.parseJSON(data[local]);
				new Webos.ScriptFile(mountData.lib);
				if (!Webos.File.mount(local, mountData.remote, mountData.driver)) {
					Webos.Error.trigger('Impossible de monter "'+mountData.driver+'" sur "'+local+'"');
				}
			}
			callback.success();
		}, callback.error]);
	},
	list: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			callback.success(config.data());
		}, callback.error]);
	},
	add: function(local, data, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			config.set(local, JSON.stringify({
				remote: data.remote,
				lib: data.lib,
				driver: data.driver
			}));
			config.sync([function() {
				callback.success();
			}, callback.error]);
		}, callback.error]);
	},
	remove: function(local, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			config.remove(local);
			config.sync([function() {
				callback.success();
			}, callback.error]);
		}, callback.error]);
	}
};

Webos.File.fstab.mount();
