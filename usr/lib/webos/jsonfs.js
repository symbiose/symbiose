/**
 * A JSON-based filesystem.
 * @todo Convert the filesystem data to a Webos.VirtualFile tree on mount (optimization)
 */

(function () {
	var pointsData = {};

	var getPointData = function (point) {
		return pointsData[point.get('local')];
	};

	Webos.JsonFsFile = {};

	Webos.JsonFsFile.mount = function (point, callback) {
		var op = Webos.Operation.create();
		op.addCallbacks(callback);

		if (!point.get('data')) {
			op.setCompleted(false, 'Cannot mount a JSON filesystem without mount point data');
		} else {
			var data = point.get('data');

			var setPointData = function (data) {
				pointsData[point.get('local')] = data;

				op.setCompleted();
			};
			
			if (data.data) {
				setPointData(data.data);
			} else if (data.path) {
				var indexFile = W.File.get(data.path);

				indexFile.readAsText([function (contents) {
					var data = JSON.parse(contents);

					setPointData(data);
				}, function (err) {
					op.setCompleted(err);
				}]);
			} else {
				op.setCompleted(false, 'Cannot mount a JSON filesystem without file path');
			}
		}

		return op;
	};

	Webos.JsonFsFile.get = function (file, point, data) {
		if (file instanceof Webos.DropboxFile) { //Si c'est déja un objet Webos.DropboxFile, on le retourne directement
			return file;
		} else { //Sinon, on crée un nouvel objet
			var path = String(file),
				relativePath = point.getRelativePath(path),
				pointData = getPointData(point),
				fileData = { path: path },
				fileDirnames = relativePath.split('/');

			var i = 0, dirname, rootData = pointData, fileContents = null;
			do {
				dirname = fileDirnames[i];
				i++;

				if (!dirname) {
					continue;
				}

				if (!rootData[dirname]) {
					return;
				}

				rootData = rootData[dirname];

				if (i == fileDirnames.length) { //Last one
					fileContents = rootData;
					break;
				}
			} while(true);

			var buildFile = function (fileContents, fileData) {
				if (typeof fileContents == 'string') { //Text file
					return Webos.VirtualFile.create(fileContents, fileData);
				} else { //Folder
					var filesList = [];
					for (var subFilename in fileContents) {
						var subFileContents = fileContents[subFilename],
							subFilepath = fileData.path+'/'+subFilename;

						filesList.push(buildFile(subFileContents, {
							path: subFilepath
						}));
					}

					return Webos.VirtualFile.create(filesList, fileData);
				}
			};

			return buildFile(fileContents, fileData);
		}
	};
})();