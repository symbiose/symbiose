Webos.require([
	'/usr/lib/xtag/webos.js',
	'/usr/lib/strophejs/strophe.js',
	'/usr/lib/strophejs/strophe.vcard.js',
	'/usr/lib/strophejs/strophe.chatstates.js'
], function() {
	Webos.xmpp = {
		config: {
			//boshHttpUrl: 'http://'+window.location.hostname+':5280/http-bind',
			//boshHttpUrl: 'http://bosh.metajack.im:5280/xmpp-httpbind',
			boshHttpUrl: 'https://jwchat.org/http-bind/',
			//boshWsUrl: 'ws://'+window.location.hostname+':5280'
			boshWsUrl: 'ws://raspberrypi:5280/'
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
				return jid.slice(index);
			} else {
				return jid;
			}
		},
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/empathy/main.html', function(mainWindow) {
				that._$win = $(mainWindow);
				var $win = that._$win;

				$win.window('open');

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
					lock: (that.countConnections() <= 1)
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
				$contact.find('.contact-status').html(readablePresence);
				$contact.find('.contact-picture').attr('src', contact.picture);

				$contact.off('click.empathy').on('click.empathy', function () {
					$contactsCtn.children('.item-active').removeClass('item-active');
					$(this).addClass('item-active').removeClass('contact-conversation-unread');
					that._switchConversation(contact.jid, contact.conn);
				});
			});

			this.on('userupdated', function (contact) {
				$win.find('.conversation-compose .compose-contact-picture').attr('src', contact.picture);
			});

			this.on('messagesent', function (msg) {
				var dst = that.contact(msg.to), src = that.loggedInUser(msg.from);

				var $msg = $('<li></li>', { 'class': 'msg msg-sent' });
				$msg.append('<img src="'+src.picture+'" alt="" class="msg-contact-picture">');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).text(msg.message));

				if (that.currentDst() && that.currentDst().jid == msg.to) {
					$msg.appendTo($win.find('.conversation ul'));
				} else if (that._isConversationDetached(msg.to)) {
					$msg.appendTo(that._$conversations[msg.to]);
				}
			});
			this.on('messagereceived', function (msg) {
				var src = that.contact(msg.from), dst = that.loggedInUser(msg.to);

				var $msg = $('<li></li>', { 'class': 'msg msg-received' });
				$msg.append('<img src="'+src.picture+'" alt="" class="msg-contact-picture">');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).text(msg.message));

				if (that.currentDst() && that.currentDst().jid == msg.from) {
					$msg.appendTo($win.find('.conversation ul'));
				} else if (that._isConversationDetached(msg.from)) {
					that._$conversations[msg.from] = that._$conversations[msg.from].add($msg);

					//Set conversation as unread
					var $contact = $contactsCtn.children('li').filter(function () {
						return ($(this).data('jid') == msg.from);
					});
					$contact.addClass('contact-conversation-unread').detach().prependTo($contactsCtn);
				}
			});

			$(document).on('composing.chatstates', function (e) {
				console.log('composing', e);
			});
			$(document).on('paused.chatstates', function (e) {
				console.log('paused', e);
			});
			$(document).on('active.chatstates', function (e) {
				console.log('active', e);
			});

			$win.find('.conversation-compose .compose-msg').keydown(function (e) {
				if (e.keyCode == 13) { //Enter
					var dst = that.currentDst();

					if (!dst) {
						return;
					}

					var msgContent = $(this).val();

					var msg = {
						from: dst.conn,
						to: dst.jid,
						message: msgContent
					};
					that.sendMessage(msg);

					$(this).val('').focus();
				}
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
		},
		disconnect: function () {
			for (var jid in this._conns) {
				this._conns[jid].disconnect();
			}

			this._conns = {};
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
			console.log('I sent to ' + msg.to + ': ' + msg.message);
		}
	};
	Webos.inherit(Empathy, Webos.Observable);

	Empathy.open = function () {
		return new Empathy();
	};

	window.Empathy = Empathy;

	Empathy.open();
});