new W.ScriptFile('usr/lib/eos/eos.js');

if (args.isParam(0)) {
	W.File.load(args.getParam(0), new W.Callback(function(image) {
		new EyeOfSymbiose(image);
	}, function() {
		new EyeOfSymbiose();
	}));
} else {
	new EyeOfSymbiose();
}