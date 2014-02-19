new Webos.ScriptFile('/usr/lib/webos/config.js');

/**
 * @namespace
 */
Webos.File.fstab = {
	mount: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			var data = config.data();
			for (var local in data) {
				var mountData = jQuery.parseJSON(data[local]);
				new Webos.ScriptFile(mountData.lib);
				var point = new Webos.File.MountPoint({
					remote: mountData.remote,
					driver: mountData.driver,
					data: mountData.data
				}, local);
				Webos.File.mount(point, [function() {}, function(response) {
					Webos.Error.trigger('Impossible de monter "'+mountData.driver+'" sur "'+local+'"');
				}]);
			}
			callback.success();
		}, callback.error]);
	},
	list: function(callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			var data = config.data(), list = {};
			
			for (var local in data) {
				var mountData = jQuery.parseJSON(data[local]);
				list[local] = mountData;
			}
			
			callback.success(list);
		}, callback.error]);
	},
	add: function(point, callback) {
		callback = Webos.Callback.toCallback(callback);
		
		Webos.ConfigFile.loadUserConfig('~/.config/fstab.xml', null, [function(config) {
			config.set(point.get('local'), JSON.stringify({
				remote: point.get('remote'),
				lib: Webos.File.getDriverData(point.get('driver')).lib,
				driver: point.get('driver'),
				data: point.get('data')
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

Webos.File.bind('umount', function(data) {
	Webos.File.fstab.list(function(fstab) {
		if (fstab[data.local]) {
			Webos.File.fstab.remove(data.local, [function() {}, function(response) {
				response.triggerError('Impossible d\'effectuer le d&eacute;montage permanent');
			}]);
		}
	});
});
Webos.User.bind('login', function() {
	Webos.File.fstab.mount();
});
Webos.File.fstab.mount();
