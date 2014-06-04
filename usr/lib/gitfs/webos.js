/**
 * A versionned file.
 * @param {Object} data The file's data.
 * @param {Webos.File.MountPoint} point The file's mount point.
 * @augments {Webos.File}
 * @constructor
 * @since 1.0beta5
 */
Webos.VersionnedFile = function (data, point) {
	Webos.File.call(this, data, point); // Call parent class
};
/**
 * Webos.VersionnedFile's prototype.
 */
Webos.VersionnedFile.prototype = {
	hydrate: function (data) {
		if (!data.labels) {
			data.labels = {
				versionned: true
			};
		}

		return this._super('hydrate', data);
	},
	version: function () {
		return this._get('version') || '';
	},
	getLog: function (opts) {
		return this._unsupportedMethod();
	},
	restore: function () {
		return this._unsupportedMethod();
	}
};

/**
 * A file inside a Git repository.
 * @param {Object} data The file's data.
 * @param {Webos.File.MountPoint} point The file's mount point.
 * @augments {Webos.VersionnedFile}
 * @augments {Webos.WebosFile}
 * @constructor
 * @since 1.0beta5
 */
Webos.GitFile = function (data, point) {
	Webos.WebosFile.call(this, data, point); // Call parent class
};
/**
 * Webos.GitFile's prototype.
 */
Webos.GitFile.prototype = {
	_createRequest: function (method, args) {
		if (method == 'getContents' || method == 'getData') {
			args.revision = this.get('version');
		}

		return Webos.GitFile._createRequest(method, args, this.get('mountPoint'));
	},
	getLog: function (opts) {
		return Webos.GitFile.getLog($.extend(opts, {
			paths: this.get('webospath')
		}), this.get('mountPoint'));
	},
	restore: function () {
		return this._createRequest('restore', {
			path: this.get('webospath'),
			revision: this.get('version')
		});
	}
};

Webos.inherit(Webos.GitFile, Webos.VersionnedFile);
Webos.inherit(Webos.GitFile, Webos.WebosFile);

Webos.GitFile._createRequest = function (method, args, point) {
	var pointData = point.get('data') || {};

	return new Webos.ServerCall({
		'class': 'GitController',
		method: method,
		arguments: args || {},
		host: pointData.host,
		username: pointData.username,
		password: pointData.password
	})
};

Webos.GitFile.mount = function (point, callback) {
	var that = this;
	callback = Webos.Callback.toCallback(callback);

	Webos.WebosFile.mount(point, [function (point) {
		var pointData = point.get('data') || {},
			pointOpts = pointData.options || {};

		that._createRequest('initRepo', {
			dir: point.get('remote')
		}, point).load([function () {
			callback.success(point);
		}, function (resp) { // Git init failed
			if (resp.getStatusCode() == 401) { // Access denied, ignore (user not logged in)
				callback.success(point);
			} else if (pointOpts.force) { // Ignore errors option
				//TODO: use this value for "versionned"
				//TODO: check Git support when mounting device
				pointData.gitEnabled = false;
				callback.success(point);
			} else {
				callback.error(resp);
			}
		}]);
	}, callback.error]);
};

Webos.GitFile.get = Webos.WebosFile.get;
Webos.GitFile.createFile = Webos.WebosFile.createFile;
Webos.GitFile.createFolder = Webos.WebosFile.createFolder;
Webos.GitFile.copy = Webos.WebosFile.copy;
Webos.GitFile.move = Webos.WebosFile.move;
Webos.GitFile.search = Webos.WebosFile.search;

Webos.GitFile.Commit = function (data) {
	Webos.Model.call(this, data);
};
Webos.GitFile.Commit.prototype = {
	getFile: function (path) {
		return Webos.File.get(path, { version: this._get('hash') }, true);
	}
};

Webos.inherit(Webos.GitFile.Commit, Webos.Model);

Webos.GitFile.getLog = function (opts, point) {
	var op = Webos.Operation.create();

	if (typeof opts === 'string' || opts instanceof Array) {
		opts = { paths: opts };
	}

	opts = $.extend({
		paths: null,
		offset: null,
		limit: null
	}, opts);

	this._createRequest('getLog', {
		dir: point.get('remote'),
		opts: opts
	}, point).load([function (resp) {
		var data = resp.getData(), commits = [];

		for (var i in data) {
			var commitData = data[i];

			// Convert parent hashes to list
			var parentHashes = [];
			for (var j in commitData.parentHashes) {
				parentHashes.push(commitData.parentHashes[j]);
			}
			commitData.parentHashes = parentHashes;

			commits.push(new Webos.GitFile.Commit(commitData));
		}

		op.setCompleted(commits);
	}, function (resp) {
		op.setCompleted(resp);
	}]);

	return op;
};
Webos.GitFile.getDiff = function (opts) {
	if (typeof opts === 'string') {
		opts = { revision: opts };
	}

	opts = $.extend({
		revision: null,
		changes: false
	}, opts);
};

// Register the driver
Webos.File.registerDriver('GitFile', { title: 'Git', icon: 'places/folder-remote' });