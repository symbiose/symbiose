Webos.require([
	'/usr/lib/openpgp/openpgp.min.js'
], function () {
	openpgp.initWorker(Webos.File.get('/usr/lib/openpgp/openpgp.worker.js').get('realpath'));

	Webos.Keyring = {};

	/**
	 * @see http://openpgpjs.org/openpgpjs/doc/localstore.js.html
	 */
	Webos.Keyring._NullStore = function (item) {
		if (typeof item == 'string') {
			this.item = item;
		}

		Webos.Observable.call(this);
	};
	Webos.Keyring._NullStore.prototype = {
		item: 'armoredKeys',
		value: null,
		load: function () {
			var armoredKeys = this.value;
			var keys = [];
			if (armoredKeys !== null && armoredKeys.length !== 0) {
				var key;
				for (var i = 0; i < armoredKeys.length; i++) {
					key = openpgp.key.readArmored(armoredKeys[i]).keys[0];
					keys.push(key);
				}
			}
			return keys;
		},
		store: function (keys) {
			var armoredKeys = [];
			for (var i = 0; i < keys.length; i++) {
				armoredKeys.push(keys[i].armor());
			}

			this.storage.setItem(this.item, JSON.stringify(armoredKeys));

			this.value = armoredKeys;
			this.trigger('store', { keys: armoredKeys });
		}
	};
	Webos.inherit(Webos.Keyring._NullStore, Webos.Observable);

	Webos.Keyring._create = function (path, value) {
		var store = Webos.Keyring._NullStore(path);
		store.on('store', function (data) {
			var dest = Webos.File.get(store.item);
			dest.writeAsText(JSON.stringify(data.keys), [function () {
				store.trigger('stored');
			}, function (resp) {
				store.trigger('storefailed', resp);
			}]);
		});
		store.value = value || null;

		var keyring = new openpgp.Keyring(store);
		return keyring;
	};

	Webos.Keyring._default = null;
	Webos.Keyring._defaultPath = '~/.openpgp/keys.asc';

	Webos.Keyring.create = function (options) {
		var op = Webos.Operation.create();

		options = $.extend({
			type: 'rsa',
			numBits: 2048,
			userId: '', //Must be "User Name <username@email.com>"
			passphrase: '',
			path: ''
		}, options);
		var keyType = 1; // Only RSA supported

		if (!options.path || !options.userId || !options.passphrase) {
			op.setCompleted(false);
			return op;
		}

		openpgp.generateKeyPair(keyType, options.numBits, options.userId, options.passphrase, function (result) {
			var keyring = Webos.Keyring._create(options.path);
			keyring.importKey(result.privateKeyArmored);
			keyring.importKey(result.publicKeyArmored);

			keyring.storeHandler.once('stored storefailed', function (result) {
				op.setCompleted(result);
			});
			keyring.store();
		});

		return op;
	};

	Webos.Keyring.open = function (path, password) {};

	Webos.Keyring.close = function (name) {};
	Webos.Keyring.closeAll = function (name) {};

	Webos.Keyring.autoOpen = function (user, password) {

	};

	Webos.Keyring.default = function (callback) {
		if (Webos.Keyring._default) {
			callback.success(Webos.Keyring._default);
			return;
		}

		
	};
});