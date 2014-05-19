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
	getLog: function (opts) {
		return this._unsupportedMethod();
	},
	getDiff: function (opts) {
		return this._unsupportedMethod();
	},
	getBlame: function (opts) {
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
		return Webos.GitFile._createRequest(method, args, this.get('mountPoint'));
	},
	getLog: function (opts) {
		Webos.GitFile.getLog($.extend(opts, {
			paths: this.get('webospath')
		}));
	},
	getDiff: function () {},
	getBlame: function () {}
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
		that._createRequest('initRepo', {
			dir: point.get('remote')
		}, point).load([function () {
			callback.success(point);
		}, function (resp) {
			if (resp.getStatusCode() == 401) { // Access denied, ignore (user not logged in)
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

Webos.GitFile.Commit = function () {};
Webos.GitFile.Commit.prototype = {
	getDiff: function () {},
	getHash: function () {},
	getShortHash: function () {},
	getParentHashes: function () {},
	getParents: function () {},
	getTree: function () {},
	getAuthorName: function () {},
	getAuthorEmail: function () {},
	getAuthorDate: function () {},
	getMessage: function () {},
	getSubjectMessage: function () {},
	getBodyMessage: function () {}
	//getCommit: function () {}
};

Webos.GitFile.DiffFile = function () {};
Webos.GitFile.DiffFile.prototype = {
	isCreation: function () {},
	isModification: function () {},
	isRename: function () {},
	isDeletion: function () {},
	getAdditions: function () {},
	getDeletions: function () {},
	getOldName: function () {},
	getNewName: function () {},
	getName: function () {},
	getOldIndex: function () {},
	getNewIndex: function () {},
	isBinary: function () {},
	getChanges: function () {}
};

Webos.GitFile.getLog = function (opts) {
	if (typeof opts === 'string' || opts instanceof Array) {
		opts = { paths: opts };
	}

	opts = $.extend({
		paths: null,
		offset: null,
		limit: null
	}, opts);


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