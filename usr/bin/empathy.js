Webos.require([
	'/usr/lib/strophejs/strophe.js',
	'/usr/lib/strophejs/strophe.vcard.js',
	'/usr/lib/strophejs/strophe.chatstates.js',
	'/usr/lib/webos/data.js'
], function() {
	Webos.xmpp = {
		config: {
			//boshHttpUrl: 'http://'+window.location.hostname+':5280/http-bind',
			//boshHttpUrl: 'http://bosh.metajack.im:5280/xmpp-httpbind',
			boshHttpUrl: 'https://jwchat.org/http-bind/',
			//boshHttpUrl: 'http://raspberrypi:5280/http-bind/',
			//boshWsUrl: 'ws://'+window.location.hostname+':5280'
			boshWsUrl: 'ws://emersion.fr:5280/'
		},
		initialize: function () {
			var boshUrl = this.config.boshHttpUrl;
			if (window.WebSocket && this.config.boshWsUrl) {
				boshUrl = this.config.boshWsUrl;
			}

			return new Strophe.Connection(boshUrl);
		}
	};

	var Empathy = function () {
		Webos.Observable.call(this);

		this.initialize();
	};
	Empathy.prototype = {
		_$win: $(),
		_$settingsWin: $(),
		_$conversations: {},
		_conns: {},
		_loggedInUsers: {},
		_contacts: {},
		_defaultContactIcon: new W.Icon('stock/person').realpath(32),
		_currentDst: null,
		_servers: {
			'chat.facebook.com': 'Facebook',
			'gmail.com': 'Google',
			'': 'XMPP'
		},
		_config: {
			accounts: []
		},
		_conn: function (jid) {
			return this._conns[jid];
		},
		connection: function (jid) {
			return this._conn(jid);
		},
		countConnections: function () {
			return Object.keys(this._conns).length;
		},
		contacts: function () {
			return this._contacts;
		},
		contact: function (jid) {
			return this._contacts[jid];
		},
		loggedInUser: function (jid) {
			return this._loggedInUsers[this.getSubJid(jid)];
		},
		currentDst: function () {
			return this._currentDst;
		},
		getSubJid: function (jid) {
			//for parsing JID: ramon@localhost/1234567
			//to ramon@localhost

			var index = jid.indexOf('/');
			if (index > 0) {
				return jid.slice(0, index);
			} else {
				return jid;
			}
		},
		getJidDomain: function (jid) {
			//for parsing JID: ramon@localhost/1234567
			//to localhost

			jid = this.getSubJid(jid);

			var index = jid.indexOf('@');
			if (index > 0) {
				return jid.slice(index + 1);
			} else {
				return jid;
			}
		},
		getJidUsername: function (jid) {
			//for parsing JID: ramon@localhost/1234567
			//to ramon

			jid = this.getSubJid(jid);

			var index = jid.indexOf('@');
			if (index > 0) {
				return jid.slice(0, index);
			} else {
				return jid;
			}
		},
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/empathy/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');
				that._$settingsWin = $(windows).filter(':eq(1)');

				var $win = that._$win;

				$win.window('open');

				$win.window('loading', true);
				that._loadConfig().on('complete', function (data) {
					$win.window('loading', false);

					that._autoConnect();
				});

				that._initUi();
				that._initEvents();
				that.switchView('login');
			});
		},
		_initUi: function () {
			var that = this;
			var $win = this._$win;

			var $servers = $win.find('.view-login .login-server');
			for (var servHost in this._servers) {
				var servName = this._servers[servHost];

				$servers.append('<option value="'+servHost+'">'+servName+'</option>');
			}
		},
		_initEvents: function () {
			var that = this;
			var $win = this._$win;

			$win.find('.view-login form').submit(function (e) {
				e.preventDefault();

				var server = $win.find('.view-login .login-server').val(),
					jid = $win.find('.view-login .login-username').val(),
					password = $win.find('.view-login .login-password').val();

				if (!jid) {
					return;
				}

				if (server && jid.indexOf('@') == -1) {
					jid += '@'+server;
				}

				that.connect(jid, password);
			});

			this.on('connecting', function (data) {
				$win.window('loading', true, {
					message: 'Logging in '+data.jid,
					lock: (that.countConnections() == 0)
				});

				var jid = data.jid;
				this.once('connected connecterror autherror', function (data) {
					if (that.getSubJid(data.jid) == jid) {
						$win.window('loading', false);
					}
				});
			});

			this.on('disconnecting', function (data) {
				$win.window('loading', true, {
					message: 'Disconnecting '+data.jid,
					lock: (that.countConnections() <= 1)
				});

				var jid = data.jid;
				this.once('disconnected', function (data) {
					if (that.getSubJid(data.jid) == jid) {
						$win.window('loading', false);
					}

					if (!that.countConnections()) {
						that.switchView('login');
					}
				});
			});

			this.once('connected', function () {
				that.switchView('conversations');

				$win.find('.search-entry').searchEntry('option', 'disabled', false);
			});

			$win.find('.search-entry').keyup(function () {
				var searchQuery = $win.find('.search-entry').searchEntry('value');

				that.searchContacts(searchQuery);
			});

			var $contactsCtn = $win.find('.view-conversations .friends-list ul');
			this.on('contactupdated', function (contact) {
				var $contact = $contactsCtn.children('li').filter(function () {
					return ($(this).data('jid') == contact.jid);
				});
				if (!$contact.length) {
					$contact = $('<li></li>').data('jid', contact.jid).appendTo($contactsCtn);
					$contact.append('<span class="contact-status"></span>');
					$contact.append('<img alt="" class="contact-picture"/>');
					$contact.append('<span class="contact-name"></span>');
					$contact.append('<span class="contact-server"></span>');
				}

				var readablePresence = '';
				switch (contact.presence) { // See http://www.xmpp.org/rfcs/rfc3921.html#rfc.section.2.2.2.1
					case 'online': // actively interested in chatting
						readablePresence = 'Available';
						break;
					case 'away': // temporarily away
						readablePresence = 'Away';
						break;
					case 'dnd': // busy (dnd = "Do Not Disturb")
						readablePresence = 'Busy';
						break;
					case 'xa': // away for an extended period (xa = "eXtended Away")
						readablePresence = 'Not available';
						break;
				}

				var inserted = false;
				$contact.detach();
				$contactsCtn.children('li').each(function () {
					var thisContact = that.contact($(this).data('jid'));

					if ($(this).is('.contact-conversation-unread') && !$contact.is('.contact-conversation-unread')) {
						return;
					}
					if (thisContact.priority < contact.priority) {
						$(this).before($contact);
						inserted = true;
						return false;
					}
				});
				if (!inserted) {
					$contactsCtn.append($contact);
				}

				$contact.removeClass('contact-online contact-offline contact-away').addClass('contact-'+contact.presence);

				$contact.find('.contact-name').text(contact.name);
				$contact.find('.contact-status').html('<span class="status-inner">'+readablePresence+'</span>');
				$contact.find('.contact-picture').attr('src', contact.picture);

				if (contact.conn) {
					var serverName = that.getJidDomain(contact.conn);
					if (that._servers[serverName]) {
						serverName = that._servers[serverName];
					}

					$contact.find('.contact-server').text(serverName);
				}

				$contact.off('click.empathy').on('click.empathy', function () {
					if (!contact.conn) {
						return;
					}

					that._switchConversation(contact.jid, contact.conn);
				});

				$contactsCtn.toggleClass('hide-contact-server', (that.countConnections() <= 1));
			});

			this.on('userupdated', function (contact) {
				$win.find('.conversation-compose .compose-contact-picture').attr('src', contact.picture);
			});

			var scrollToConversationBottom = function () {
				var conversationHeight = 0;
				$win.find('.conversation ul').children().each(function () {
					conversationHeight += $(this).outerHeight(true);
				});

				$win.find('.conversation ul').scrollTop(conversationHeight);
			};
			this.on('messagesent', function (msg) {
				var dst = that.contact(msg.to), src = that.loggedInUser(msg.from);

				var $msg = $('<li></li>', { 'class': 'msg msg-sent' });
				$msg.append('<img src="'+src.picture+'" alt="" class="msg-contact-picture">');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).html(msg.message));

				if (that.currentDst() && that.currentDst().jid == msg.to) {
					$msg.appendTo($win.find('.conversation ul'));
					scrollToConversationBottom();
				} else if (that._isConversationDetached(msg.to)) {
					that._$conversations[msg.to] = that._$conversations[msg.to].add($msg);
				} else {
					that._$conversations[msg.to] = $msg;
				}
			});
			this.on('messagereceived', function (msg) {
				var src = that.contact(msg.from), dst = that.loggedInUser(msg.to);

				var $msg = $('<li></li>', { 'class': 'msg msg-received' });
				$msg.append('<img src="'+src.picture+'" alt="" class="msg-contact-picture">');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).html(msg.message));

				if (that.currentDst() && that.currentDst().jid == msg.from) {
					$msg.appendTo($win.find('.conversation ul'));
					scrollToConversationBottom();
				} else {
					if (that._isConversationDetached(msg.from)) {
						that._$conversations[msg.from] = that._$conversations[msg.from].add($msg);
					} else {
						that._$conversations[msg.from] = $msg;
					}

					//Set conversation as unread
					var $contact = $contactsCtn.children('li').filter(function () {
						return ($(this).data('jid') == msg.from);
					});
					$contact.addClass('contact-conversation-unread').detach().prependTo($contactsCtn);

					//Show a little notification
					var $replyEntry = $('<input />', { type: 'text', placeholder: 'Reply...' })
						.css({ 'float': 'left' })
						.keydown(function (e) {
							if (e.keyCode == 13) {
								var msg = {
									from: src.conn,
									to: src.jid,
									message: $replyEntry.val()
								};
								that.sendMessage(msg);

								$replyEntry.val('');
							}
						});
					var $talkBtn = $.w.button('Talk').click(function() {
						that._switchConversation(src.jid, src.conn);
					});

					$.w.notification({
						title: 'New message from '+src.name,
						icon: 'apps/chat',
						message: msg.message,
						widgets: [$replyEntry, $talkBtn]
					});
				}
			});

			this.on('accountupdate accountremove', function () {
				that._saveConfig();
			});

			$(document).on('composing.chatstates', function (e, data) {
				console.log('composing', e, data);
			});
			$(document).on('paused.chatstates', function (e, data) {
				console.log('paused', e, data);
			});
			$(document).on('active.chatstates', function (e, data) {
				console.log('active', e, data);
			});

			$win.find('.conversation-compose .compose-msg').keydown(function (e) {
				if (e.keyCode == 13) { //Enter
					var dst = that.currentDst();

					if (!dst) {
						return;
					}

					var msgContent = $(this).val();

					if (!msgContent) {
						return;
					}

					var msg = {
						from: dst.conn,
						to: dst.jid,
						message: msgContent
					};
					that.sendMessage(msg);

					$(this).val('').focus();
				}
			});

			$win.find('.btn-accounts').click(function () {
				that.openSettings();
			});

			$win.on('windowclose', function () {
				that.disconnect();
			});
		},
		switchView: function (newView) {
			var $views = this._$win.find('.views > div'),
				$newView = $views.filter('.view-'+newView);

			$views.hide();
			$newView.show();
		},
		connect: function (jid, password) {
			var that = this;

			if (this._conns[jid]) {
				return this._conns[jid];
			}

			if (!jid) {
				return false;
			}

			var conn = Webos.xmpp.initialize();

			conn.connect(jid, password, function (status) {
				switch (status) {
					case Strophe.Status.CONNECTING:
						that.trigger('connecting', {
							jid: jid,
							connection: conn
						});
						break;
					case Strophe.Status.CONNFAIL:
						that.trigger('connecterror', {
							jid: jid,
							connection: conn
						});

						Webos.Error.trigger('Failed to connect to server with username "'+jid+'"', '', 400);
						break;
					case Strophe.Status.CONNECTED:
						that._connected(conn);
						break;
					case Strophe.Status.DISCONNECTING:
						that.trigger('disconnecting', {
							jid: jid,
							connection: conn
						});
						break;
					case Strophe.Status.DISCONNECTED:
						that.trigger('disconnected', {
							jid: jid,
							connection: conn
						});
						break;
					case Strophe.Status.AUTHENTICATING:
						that.trigger('authenticating', {
							jid: jid,
							connection: conn
						});
						break;
					case Strophe.Status.AUTHFAIL:
						that.trigger('autherror', {
							jid: jid,
							connection: conn
						});

						Webos.Error.trigger('Failed to authenticate with username "'+jid+'"', '', 401);
						break;
					case Strophe.Status.ERROR:
						that.trigger('connerror', {
							jid: jid,
							connection: conn
						});

						Webos.Error.trigger('An error occured with connection "'+jid+'"', '', 400);
						break;
					default:
						console.log('Strophe: unknown connection status: '+status);
				}
			});

			this._addAccount({
				jid: jid,
				password: password
			});
		},
		disconnect: function (jid) {
			if (typeof jid == 'undefined') {
				for (var currentJid in this._conns) {
					this._conns[currentJid].disconnect();
				}

				this._conns = {};
			} else {
				this._conns[jid].disconnect();
				delete this._conns[jid];
			}
		},
		_addAccount: function (newAccount) {
			var accounts = this._config.accounts;

			newAccount.password = null; //Remove password!

			for (var i = 0; i < accounts.length; i++) {
				var account = accounts[i];

				if (account.jid == newAccount.jid) {
					if (account !== newAccount) {
						this._config.accounts[i] = newAccount;
						this.trigger('accountupdate', { account: newAccount });
					}

					return;
				}
			}

			this._config.accounts.push(newAccount);
			this.trigger('accountupdate', { account: newAccount });
		},
		_removeAccount: function (jid) {
			var accounts = this._config.accounts;

			for (var i = 0; i < accounts.length; i++) {
				var account = accounts[i];

				if (account.jid == jid) {
					this._config.accounts.splice(i, 1); //Remove item
					this.trigger('accountremove', { account: account });
					return true;
				}
			}

			return false;
		},
		_loadConfig: function () {
			var that = this;
			var op = new Webos.Operation();

			Webos.DataFile.loadUserData('empathy', [function (dataFile) {
				var config = dataFile.data();

				if (Object.keys(config).length) {
					that._config = config;
				}

				op.setCompleted();
			}, function (resp) {
				op.setCompleted(resp);
			}]);

			return op;
		},
		_saveConfig: function () {
			var that = this;

			Webos.User.getLogged(function(user) {
				if (user) { //User logged in
					Webos.DataFile.loadUserData('empathy', function (dataFile) {
						dataFile.setData(that._config);
						dataFile.sync();
					});
				}
			});
		},
		_autoConnect: function () {
			var that = this;

			if (this._config.accounts.length == 1) {
				var account = this._config.accounts[0];

				if (account.password) {
					this.connect(account.jid, account.password);
				} else {
					var jid = account.jid, serverHost = this.getJidDomain(account.jid);
					if (!this._servers[serverHost]) {
						serverHost = '';
					}
					if (serverHost) {
						jid = this.getJidUsername(jid);
					}

					this._$win.find('.view-login .login-server').val(serverHost);
					
					this._$win.find('.view-login .login-username').val(jid);
					this._$win.find('.view-login .login-password').focus();
				}
			} else {
				var accounts = this._config.accounts;
				for (var i = 0; i < accounts.length; i++) {
					(function (account) {
						if (account.password) {
							this.connect(account.jid, account.password);
						} else {
							var $askPasswordWin = $.w.window({
								title: 'Connecting '+account.jid,
								dialog: true,
								resizable: false,
								width: 350
							});

							var $form = $.w.entryContainer().appendTo($askPasswordWin.window('content'));

							$.w.label('Please enter your password for '+account.jid+'.').appendTo($form);
							var $passwordEntry = $.w.passwordEntry('Password: ');
							$passwordEntry.appendTo($form);

							var $btns = $.w.buttonContainer().appendTo($form);
							var $cancelBtn = $.w.button('Cancel').click(function () {
								$askPasswordWin.window('close');
							}).appendTo($btns);
							var $submitBtn = $.w.button('Login', true).appendTo($btns);

							$form.submit(function () {
								var password = $passwordEntry.passwordEntry('value');

								if (!password) {
									return;
								}

								that.connect(account.jid, password);
								$askPasswordWin.window('close');
							});

							$askPasswordWin.window('open');
						}
					})(accounts[i]);
				}
			}
		},
		_connected: function (conn) {
			var that = this;

			this._conns[conn.jid] = conn;

			this.trigger('connected', {
				jid: conn.jid,
				connection: conn
			});

			this._sendPriority(conn);

			this._getRoster(conn);

			conn.addHandler(function (msg) {
				var to = msg.getAttribute('to');
				var from = msg.getAttribute('from');
				var type = msg.getAttribute('type');
				var elems = msg.getElementsByTagName('body');

				if (type == "error") {
					alert("An error occured! Is your account verified? Is the individual in your contacts?");
					return;
				}

				if (/*type == "chat" && */ elems.length > 0) {
					var body = elems[0];
					console.log('I got a message from ' + from + ': ' + Strophe.getText(body));

					that.trigger('messagereceived', {
						from: from,
						to: to,
						message: Strophe.getText(body)
					});
				}

				// we must return true to keep the handler alive.
				// returning false would remove it after it finishes.
				return true;
			}, null, 'message', null, null, null);
		},
		_getRoster: function (conn) {
			var that = this;

			//Set user info
			var connJid = that.getSubJid(conn.jid);
			this._loggedInUsers[connJid] = {
				jid: connJid,
				name: 'Me'
			};
			that._getVcard(conn, connJid);

			//Get roster
			var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});

			conn.sendIQ(iq, function (iq) {
				var contacts = [];
				$(iq).find("item").each(function() {
					// if a contact is still pending subscription then do not show it in the list
					if ($(this).attr('ask')) {
						return true;
					}

					var jid = $(this).attr('jid'), name = $(this).attr('name');
					
					if (that.getSubJid(jid) == connJid) {
						return;
					}

					that._setContact({
						jid: that.getSubJid(jid),
						conn: conn.jid,
						name: (jid != name) ? name : ''
					});
				});
			});

			conn.addHandler(function (presence) {
				var presence_type = $(presence).attr('type'); // unavailable, subscribed, etc...
				var from = that.getSubJid($(presence).attr('from')); // the jabber_id of the contact...

				if (presence_type != 'error') {
					if (presence_type === 'unavailable') {
						that._setContact({
							jid: from,
							presence: 'offline'
						});
					} else {
						var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
						if (show === 'chat' || !show){
							// Mark contact as online

							that._setContact({
								jid: from,
								presence: 'online'
							});
						} else {
							that._setContact({
								jid: from,
								presence: show
							});
						}

						that._getVcard(conn, from);
					}
				}
				return true;
			}, null, "presence");
		},
		_setContact: function (contact) {
			var isLoggedInUser = (!!this._loggedInUsers[contact.jid]);
			var currentContact = (isLoggedInUser) ? this._loggedInUsers[contact.jid] : this._contacts[contact.jid];

			contact = $.extend({}, currentContact, {
				jid: contact.jid,
				conn: contact.conn,
				name: contact.name,
				presence: contact.presence,
				priority: contact.priority,
				picture: contact.picture
			});

			contact.name = contact.name || contact.jid;

			contact.presence = contact.presence || 'offline';
			switch (contact.presence)  {
				case 'online':
					contact.priority = 0;
					break;
				case 'away':
					contact.priority = -8;
					break;
				case 'dnd':
					contact.priority = -4;
					break;
				case 'xa':
					contact.priority = -12;
					break;
				default:
					contact.priority = -128;
			}

			contact.picture = contact.picture || this._defaultContactIcon;

			if (isLoggedInUser) {
				this._loggedInUsers[contact.jid] = contact;

				this.trigger('userupdated', contact);
			} else {
				this._contacts[contact.jid] = contact;

				this.trigger('contactupdated', contact);
			}
		},
		_sendPriority: function (conn, priority) {
			if (!priority) {
				priority = 0;
			}

			conn.send($pres().c("priority").t(String(priority)));
		},
		_getVcard: function (conn, jid) {
			var that = this;

			if (!conn.vcard) {
				return false;
			}

			conn.vcard.get(function (stanza) {
				var $vCard = $(stanza).find("vCard");
				var img = $vCard.find('BINVAL').text();
				var type = $vCard.find('TYPE').text();

				if (!img || !type) {
					return;
				}

				var imgSrc = 'data:'+type+';base64,'+img;

				that._setContact({
					jid: jid,
					picture: imgSrc
				});
			}, jid);
		},
		$conversation: function () {
			return this._$win.find('.conversation ul');
		},
		_isConversationDetached: function (jid) {
			return (!!this._$conversations[jid]);
		},
		_detachCurrentConversation: function () {
			if (!this._currentDst) {
				return;
			}

			this._$conversations[this._currentDst.jid] = this.$conversation().children().detach();
			this._currentDst = null;
		},
		_reattachConversation: function (jid) {
			if (!this._isConversationDetached(jid)) {
				return;
			}

			this._detachCurrentConversation();

			this._currentDst = this.contact(jid);
			this.$conversation().append(this._$conversations[this._currentDst.jid]);
			delete this._$conversations[this._currentDst.jid];
		},
		_switchConversation: function (dst, src) {
			var conn = this._conn(src);

			this._detachCurrentConversation();
			this._reattachConversation(dst);
			this._currentDst = this.contact(dst);

			this._$win.find('.conversation .conversation-compose').show();
			this._$win.find('.conversation .conversation-compose .compose-msg').focus();

			var $contactsCtn = this._$win.find('.view-conversations .friends-list ul');
			var $contact = $contactsCtn.children('li').filter(function () {
				return ($(this).data('jid') == dst);
			});
			$contactsCtn.children('.item-active').removeClass('item-active');
			$contact.addClass('item-active').removeClass('contact-conversation-unread');
		},
		sendMessage: function (msg) {
			var conn = this._conn(msg.from);

			var reply = $msg({
				to: msg.to,
				from: conn.jid,
				type: 'chat'
			}).c("body").t(msg.message);

			conn.send(reply.tree());

			this.trigger('messagesent', {
				from: conn.jid,
				connection: conn,
				to: msg.to,
				message: msg.message
			});
		},
		searchContacts: function (searchQuery) {
			var that = this;

			var searchAttrs = ['jid', 'name'];

			var $contactsCtn = this._$win.find('.view-conversations .friends-list ul');

			if (!searchQuery) {
				$contactsCtn.children().show();
			} else {
				$contactsCtn.children().each(function () {
					var contact = that.contact($(this).data('jid'));

					for (var i = 0; i < searchAttrs.length; i++) {
						var val = contact[searchAttrs[i]];
						if (!~val.toLowerCase().indexOf(searchQuery.toLowerCase())) {
							$(this).hide();
						} else {
							$(this).show();
							break;
						}
					}
				});
			}
		},
		openSettings: function () {
			var that = this;

			var $settingsWin = this._$settingsWin;

			if (!$settingsWin.window('is', 'opened')) {
				$settingsWin.window('option', 'parentWindow', this._$win).window('open');

				this.on('accountupdate.settings.empathy accountremove.settings.empathy', function () {
					that.openSettings();
				});
				$settingsWin.one('windowclose', function () {
					that.off('accountupdate.settings.empathy accountremove.settings.empathy');
				});
			}
			$settingsWin.window('toForeground');

			var $form = $settingsWin.find('form'),
				$serverEntry = $settingsWin.find('.account-server'),
				$usernameEntry = $settingsWin.find('.account-username'),
				$passwordEntry = $settingsWin.find('.account-password'),
				$removeAccountBtn = $settingsWin.find('.acount-remove');

			$serverEntry.empty();
			for (var servHost in this._servers) {
				var servName = this._servers[servHost];

				$serverEntry.append('<option value="'+servHost+'">'+servName+'</option>');
			}

			var editedAccount = -1;

			var $accountsList = $settingsWin.find('.accounts-list').list('content').empty();
			var accounts = this._config.accounts;
			for (var i = 0; i < accounts.length; i++) {
				(function (i, account) {
					var $item = $.w.listItem(account.jid);
					$item.on('listitemselect', function () {
						editedAccount = i;

						var jid = account.jid, serverHost = that.getJidDomain(account.jid);
						if (!that._servers[serverHost]) {
							serverHost = '';
						}
						if (serverHost) {
							jid = that.getJidUsername(jid);
						}

						$serverEntry.val(serverHost);
						$usernameEntry.val(jid);
						$passwordEntry.val(account.password || '');

						$removeAccountBtn.button('option', 'disabled', false);
					});

					if (i == 0) { //Select first item
						$item.listItem('option', 'active', true);
					}

					$item.appendTo($accountsList);
				})(i, accounts[i]);
			}

			var $newItem = $.w.listItem('New account').appendTo($accountsList);
			$newItem.on('listitemselect', function () {
				editedAccount = -1;

				$serverEntry.val('');
				$usernameEntry.val('');
				$passwordEntry.val('');

				$removeAccountBtn.button('option', 'disabled', true);
			});
			if (i == 0) { //Select first item
				$newItem.listItem('option', 'active', true);
			}

			$form.off('submit.settings.empathy').on('submit.settings.empathy', function (e) {
				e.preventDefault();

				var server = $serverEntry.val(),
					jid = $usernameEntry.val(),
					password = $passwordEntry.val();

				if (server && !~jid.indexOf('@')) {
					jid = jid+'@'+server;
				}

				if (~editedAccount && that._config.accounts[editedAccount].jid != jid) {
					that._removeAccount(that._config.accounts[editedAccount].jid);
				}

				if (that.connection(jid)) {
					that.disconnect(jid);
				}
				that.connect(jid, password);
			});

			$removeAccountBtn.off('click.settings.empathy').on('click.settings.empathy', function () {
				if (editedAccount == -1) {
					return;
				}

				var jid = that._config.accounts[editedAccount].jid;

				if (that.connection(jid)) {
					that.disconnect(jid);
				}

				that._removeAccount(jid);
			});
		}
	};
	Webos.inherit(Empathy, Webos.Observable);

	Empathy.open = function () {
		return new Empathy();
	};

	window.Empathy = Empathy;

	Empathy.open();
});