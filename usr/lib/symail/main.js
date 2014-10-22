Webos.require([
	'/usr/lib/symail/mailparser.js',
	{ path: '/usr/lib/symail/imap.js', optionnal: true }
], function () {
	var MailParser = mailparser.MailParser;

	var Symail = function () {
		this._clients = [];
		this._cache = [];
		this._accounts = [];

		this._initialize();
	};
	Symail.prototype = {
		_initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/symail/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');
				that._$welcomeWin = $(windows).filter(':eq(1)');
				that._$composeWin = $(windows).filter(':eq(2)');

				var $win = that._$win;

				that._$welcomeWin.window('open');

				/*$win.window('loading', true);
				that._loadConfig().on('complete', function (data) {
					$win.window('loading', false);

					that._autoConnect();
				});

				that._initUi();
				that._initEvents();
				that.switchView('login');*/

				that._initEvents();
			});
		},
		_initEvents: function () {
			var that = this;

			// Main window
			var $win = this._$win;
			$win.find('.compose-btn').click(function () {
				that._showNewEmailForm();
			});

			// Welcome window
			var $welcomeWin = this._$welcomeWin;
			var $welcomeForm = $welcomeWin.find('.welcome-form');
			$welcomeForm.submit(function (e) {
				e.preventDefault();

				var accountData = {}, formData = $(this).serializeArray();
				for (var i = 0; i < formData.length; i++) {
					var entryData = formData[i];
					accountData[entryData.name] = entryData.value;
				}

				that.addAccount(new Symail.Account(accountData)).fail(function (err) {
					Webos.Error.trigger(err);
				});
			}).submit();
		},
		addAccount: function (account) {
			var that = this;

			// TODO
			
			return this._connectAccount(account).then(function () {
				that._accounts.push(account);

				that._displayAccountsList();
				return that._fetchAccount(account);
			});
		},
		_connectAccount: function (account) {
			var that = this;
			var op = Webos.Operation.create();

			if (this._$welcomeWin.window('is', 'opened')) {
				this._$welcomeWin.window('loading', true);

				op.always(function () {
					that._$welcomeWin.window('loading', false);
				}).then(function () {
					that._$welcomeWin.window('close');
					that._$win.window('open');
				});
			}

			account.imap().then(function (client) {
				op.setCompleted(client);
			}, function (err) {
				op.setCompleted(false, err);
			});

			return op;
		},
		_displayAccountsList: function () {
			var that = this;
			var $list = this._$win.find('.symail-boxes ul');

			var handleAccount = function (account) {
				var $item = $('<li class="account"></li>');

				$item.append($.w.icon('places/mail-mailbox', 24).css('float', 'left'));
				$item.append(account.title() || 'Inbox');

				$item.click(function () {
					$list.children('.active').removeClass('active');
					$(this).addClass('active');
					that._fetchAccount(account);
					that._currentAccount = account;
				});

				return $item;
			};

			for (var i = 0; i < this._accounts.length; i++) {
				var $item = handleAccount(this._accounts[i]);
				$item.appendTo($list);
			}
		},
		_fetchAccount: function (account) {
			var that = this;

			var accountCache = {
				INBOX: {
					attribs: [],
					delimiter: '/',
					children: null,
					parent: null,
					account: account,
					items: []
				}
			};

			this._$win.window('loading', true, {
				lock: false
			});

			function finished() {
				that._$win.window('loading', false);
			}

			account.imap().then(function (client) {
				client.openBox('INBOX', true, function (err, box) {
					if (err) {
						console.log('Open error: ' + err);
						return;
					}

					var limit = 100;
					if (box.messages.total < limit) {
						limit = box.messages.total;
					}

					var loadedParts = 0, msgNbr = 0;
					var msgPartLoaded = function (seqno, part) {
						loadedParts++;

						if (loadedParts == msgNbr*2) {
							that._displayBox(accountCache.INBOX);
							finished();
						}
					};

					var f = client.seq.fetch('1:'+(limit+1), {
						bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)'
					});
					f.on('message', function (msg, seqno) {
						console.log('Message #%d', seqno);
						var prefix = '(#' + seqno + ') ';

						var msgData = { seqno: seqno };
						accountCache.INBOX.items.push(msgData);
						msgNbr++;

						var parser = new MailParser({
							unescapeSMTP: true,
							defaultCharset: 'utf8'
						});
						parser.on('end', function (data) {
							for (var field in data) {
								msgData[field] = data[field];
							}
							msgPartLoaded(seqno, 'body');
						});

						msg.on('body', function (stream, info) {
							stream.pipe(parser);
						});
						msg.once('attributes', function(attrs) {
							//console.log(prefix + 'Attributes: ', attrs);
							msgData.uid = attrs.uid;
							msgData.flags = attrs.flags;
							msgPartLoaded(seqno, 'attributes');
						});
						msg.once('end', function() {});
					});
					f.once('error', function(err) {
						console.log('Fetch error: ' + err);
					});
					f.once('end', function() {
						console.log('Done fetching all messages!');
						//client.end();
					});
				});
			}, function (err) {
				op.setCompleted(false, err);
			});

			this._cache.push(accountCache);
		},
		_displayBox: function (box) {
			var that = this;
			var $list = this._$win.find('.symail-list ul').empty();

			var handleMessage = function (msg) {
				var $item = $('<li class="msg"></li>');
console.log(msg);
				$item.append('<div class="msg-star"></div>');
				$item.append('<div class="msg-date">'+msg.date.toLocaleString()+'</div>');
				$item.append('<div class="msg-body">'+
					'<div class="msg-from">'+(msg.from[0].name || msg.from[0].address)+'</div>'+
					'<div class="msg-subject">'+msg.subject+'</div>'+
					'</div>');

				if (!~msg.flags.indexOf('\\Seen')) {
					$item.addClass('msg-unread');
				}

				$item.click(function () {
					$list.children('.active').removeClass('active');
					$(this).addClass('active');
					that._fetchMessage(box.account, msg.seqno);
					that._currentMessage = msg;
				});

				return $item;
			};
			for (var i = 0; i < box.items.length; i++) {
				var $item = handleMessage(box.items[i]);
				$list.append($item);
			}
		},
		_fetchMessage: function (account, seqno) {
			var that = this;

			this._$win.window('loading', true, {
				lock: false
			});

			function finished() {
				that._$win.window('loading', false);
			}

			var $conversation = this._$win.find('.symail-conversation').empty();
			account.imap().then(function (client) {
				var f = client.seq.fetch(seqno, {
					markSeen: true,
					struct: true,
					envelope: true,
					bodies: ''
				});
				f.on('message', function (msg) {
					var $msg = $('<div class="msg"></div>');
					var $msgHeader = $('<div class="msg-header"></div>').appendTo($msg);
					var $msgBody = $('<div class="msg-body"></div>').appendTo($msg);
					msg.on('body', function (stream, info) {
						var parser = new MailParser({
							debug: true,
							unescapeSMTP: true,
							defaultCharset: 'utf8',
							showAttachmentLinks: true
						});

						parser.on('end', function (msg) {
							console.log(msg);
							// TODO: attachments

							var formatContacts = function (contacts) {
								var list = [];
								for (var i = 0; i < contacts.length; i++) {
									var contact = contacts[i];
									var item = '<a href="mailto:'+contact.address+'" title="'+contact.address+'">'+(contact.name || contact.address)+'</a>';
									list.push(item);
								}
								return list.join(', ');
							};

							$msgHeader.append('<dl>'+
								'<dt>From:</dt>'+
								'<dd><strong>'+formatContacts(msg.from)+'</strong></dd>'+
								'<dt>To:</dt>'+
								'<dd>'+formatContacts(msg.to)+'</dd>'+
								((msg.cc) ? '<dt>Cc:</dt><dd>'+formatContacts(msg.cc)+'</dd>' : '')+
								((msg.bcc) ? '<dt>Bcc:</dt><dd>'+formatContacts(msg.bcc)+'</dd>' : '')+
								'<dt>Subject:</dt>'+
								'<dd>'+msg.subject+'</dd>'+
								'<dt>Date:</dt>'+
								'<dd>'+msg.date.toLocaleString()+'</dd>'+
								'</dl>');

							$msgBody.html(msg.html || msg.text.replace(/\n/g, '<br />'));
							$conversation.empty().append($msg);

							finished();
						});

						stream.pipe(parser);
					});
					msg.once('attributes', function (attrs) {
						console.log('Attributes: ', attrs);
					});
					msg.once('end', function () {
						console.log('END');
					});
				});
				f.once('error', function (err) {
					console.log('Fetch error: ' + err);
				});
				f.once('end', function () {
					console.log('Done fetching message!');
				});
			});
		},
		_showNewEmailForm: function (options) {
			var $composeWin = that._$composeWin.clone();

			$composeWin.window('options', 'parentWindow', this._$win).window('open');
		}
	};

	Symail.Account = function (data) {
		Webos.Observable.call(this);

		if (!data.name || !data.email || !data.password) {
			//throw new Error('');
		}

		this._data = data;
	};
	Symail.Account.prototype = {
		title: function () {
			return this._data.title || this._data.username;
		},
		_connectImap: function () {
			var that = this;
			var op = Webos.Operation.create();

			if (that._client) {
				op.setCompleted(that._client);
				return op;
			}

			Webos.require('/usr/lib/symail/imap.js', function () {
				var client = new imap({
					user: 'simon.ser96',
					password: 'OSw3]\\aC',
					host: 'imap.gmail.com',
					port: 993,
					tls: true
				});

				client.once('ready', function () {
					op.setCompleted(client);
				});

				client.once('error', function (err) {
					op.setCompleted(false, err);
				});

				client.once('end', function (err) {
					that._client = null;
				});

				client.connect();

				that._client = client;
			});

			return op;
		},
		imap: function () {
			return this._connectImap();
		},
		getBoxes: function (nsPrefix) {},
		openBox: function (mailboxName, openReadOnly, modifiers) {
			var op = Webos.Operation.create();

			this._connectImap().then(function (client) {
				client.openBox(mailboxName, openReadOnly, modifiers, function (err, box) {
					if (err) {
						op.setCompleted(false, err);
						return;
					}

					op.setCompleted(box);
				});
			}, function (err) {
				op.setCompleted(false, err);
			});

			return op;
		}
	};
	Webos.inherit(Symail.Account, Webos.Observable);

	Symail.open = function () {
		return new Symail();
	};

	window.Symail = Symail;
});