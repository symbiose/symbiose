var $confWindow = args.getParam(0);

$confWindow.window('dialog', true);

var controls = {
	enabled: $.w.switchButton('Enable uploads'),
	maxFileSize: $.w.numberEntry('Maximal file size (<em>-1</em> for no limit) : '),
	allowedExtensions: $.w.textAreaEntry('Allowed file extensions (comma-separated, * matches all extensions) : ')
};

for (var ctrlName in controls) {
	controls[ctrlName].appendTo($confWindow.window('content'));
}

var $btns = $.w.buttonContainer().appendTo($confWindow.window('content'));
var $applyBtn = $.w.button('Update config').click(function() {
	updateConfig();
}).appendTo($btns);

var config = {};
var displayConfig = function(config) {
	for (var ctrlName in controls) {
		if (typeof config[ctrlName] != 'undefined') {
			controls[ctrlName][$.webos.widget.get(controls[ctrlName])]('value', config[ctrlName]);
		}
	}
};
var loadConfig = function() {
	$confWindow.window('loading', true);
	Webos.require('/usr/lib/webos/data.js', function() {
		Webos.DataFile.loadSystemData('uploads', function(configFile) {
			config = configFile.data();
			displayConfig(config);
			$confWindow.window('loading', false);
		});
	});
};
var updateConfig = function() {
	$confWindow.window('loading', true);

	Webos.DataFile.loadSystemData('uploads', function(configFile) {
		for (var controlName in controls) {
			configFile.set(controlName, controls[controlName][$.webos.widget.get(controls[controlName])]('value'));
		}

		configFile.sync(function() {
			$confWindow.window('loading', false);
			displayConfig(configFile.data());
		});
	});
};

loadConfig();