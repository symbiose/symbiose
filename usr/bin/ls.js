var proc = this;

(function() {
	var args = proc.getArguments(), term = proc.getTerminal();

	var colors = {
		dir: '#729fcf',
		executable: '#8ae234',
		media: '#ac7fa7',
		archive: '#ee2929'
	};

	var dirs = args.getParams();
	if (!dirs.length) {
		dirs = ['.'];
	}

	for (var i = 0; i < dirs.length; i++) {
		(function (dirPath) {
			Webos.File.listDir(dirPath, [function (files) {
				if (args.isOption('r')) {
					files.reverse();
				}

				for (var j = 0; j < files.length; j++) {
					var file = files[j];

					if (file.get('basename').substr(0, 1) == '.' && !args.isOption('a')) {
						continue;
					}

					var item = '';

					var fileColorIndex = '';
					if (file.get('is_dir')) {
						fileColorIndex = 'dir';
					} else {
						if (~$.inArray(file.get('extension'), ['php', 'js'])) {
							fileColorIndex = 'executable';
						} else if (file.matchesMimeType('image/*') ||
							file.matchesMimeType('audio/*') ||
							file.matchesMimeType('video/*')) {
							fileColorIndex = 'media';
						} else if (~$.inArray(file.get('extension'), ['zip', 'tar', 'gz'])) {
							fileColorIndex = 'archive';
						}
					}

					if (fileColorIndex) {
						var color = colors[fileColorIndex];

						item = '<strong style="color: '+color+';">'+file.get('basename')+'</strong>';
					} else {
						item = '<span>'+file.get('basename')+'</span>';
					}

					var sep = '&emsp; ';
					if (args.isOption('l')) {
						var prefix = '';
						if (file.get('is_dir')) {
							prefix += file.get('size');
						} else {
							prefix += W.File.bytesToSize(file.get('size'));
						}
						prefix += sep;

						var mtime = new Date(file.get('mtime') * 1000);
						prefix += mtime.toLocaleDateString()+' '+mtime.toLocaleTimeString()+sep;

						item = prefix+item+'\n';
					} else {
						item += sep;
					}

					term.echo(item);
				}
				proc.stop();
			}, function (resp) {
				resp.triggerError();
				proc.stop();
			}]);
		})(term.absolutePath(dirs[i]));
	}
})();