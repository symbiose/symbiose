Webos.require([
	'/usr/lib/webos/applications.js',
	'/usr/lib/webos/data.js',
	//Strophe
	'/usr/lib/strophejs/strophe.js',
	'/usr/lib/strophejs/strophe.vcard.js',
	'/usr/lib/strophejs/strophe.chatstates.js',
	//PeerJS
	{
		path: '/usr/lib/peerjs/peer.js',
		context: window
	},
	'/usr/lib/peerjs/webos.js',
	//OTR
	{
		path: '/usr/lib/webos/bigint.js',
		context: window
	},
	{
		path: '/usr/lib/webos/crypto.js',
		context: window
	},
	{
		path: '/usr/lib/webos/eventemitter.js',
		context: window
	},
	{
		path: '/usr/lib/webos/salsa20.js',
		context: window
	},
	{
		path: '/usr/lib/otr/otr.min.js',
		context: window
	},
	//Jingle
	//Not working really well... At least with Facebook and Google's servers
	/*'/usr/lib/strophejs/jingle/strophe.jingle.js',
	{
		path: '/usr/lib/strophejs/jingle/strophe.jingle.session.js',
		exportApis: ['JingleSession']
	},
	{
		path: '/usr/lib/strophejs/jingle/strophe.jingle.sdp.js',
		exportApis: ['SDP']
	},
	{
		path: '/usr/lib/strophejs/jingle/strophe.jingle.adapter.js',
		exportApis: ['TraceablePeerConnection', 'setupRTC', 'getUserMediaWithConstraints']
	}*/
], function() {
	Webos.xmpp = {
		config: {
			//boshHttpUrl: 'http://'+window.location.hostname+':5280/http-bind',
			//boshHttpUrl: 'http://bosh.metajack.im:5280/xmpp-httpbind',
			//boshHttpUrl: 'https://jwchat.org/http-bind/',
			boshHttpUrl: 'http://emersion.fr:5280/http-bind/',
			//boshWsUrl: 'ws://'+window.location.hostname+':5280'
			boshWsUrl: 'ws://emersion.fr:5280/'
		},
		initialize: function (config) {
			config = $.extend({}, this.config, config);

			var boshUrl = config.boshHttpUrl;
			if (window.WebSocket && config.boshWsUrl) {
				boshUrl = config.boshWsUrl;
			}

			return new Strophe.Connection(boshUrl);
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
		}
	};

	/**
	 * Create a new Empathy instance.
	 * @constructor
	 * @author Emersion <contact@emersion.fr>
	 */
	var Empathy = function () {
		Webos.Observable.call(this);

		this.initialize();
	};

	/**
	 * List all available services.
	 * @var {Object}
	 * @private
	 */
	Empathy._services = {
		facebook: {
			type: 'xmpp',
			title: 'Facebook',
			options: {
				host: 'chat.facebook.com'
			}
		},
		google: {
			type: 'xmpp',
			title: 'Google',
			options: {
				host: 'gmail.com'
			}
		},
		xmpp: {
			type: 'xmpp',
			title: 'XMPP'
		},
		peerjs: {
			type: 'peerjs',
			title: 'PeerJS'
		}
	};
	/**
	 * Get a service.
	 * @param {String} serviceName The service name.
	 * @return {Object} The service data.
	 */
	Empathy.service = function (serviceName) {
		return this._services[serviceName];
	};
	/**
	 * List services.
	 * @return {Object} An object containing services.
	 */
	Empathy.listServices = function () {
		return this._services;
	};

	/**
	 * Get a service API.
	 * @param {String} serviceType The service type.
	 * @return {Object} The service API.
	 */
	Empathy.serviceApi = function (serviceType) {
		var serviceApiName = serviceType[0].toUpperCase() + serviceType.substr(1),
			serviceApi = this[serviceApiName];

		return serviceApi;
	};

	/**
	 * Create a new connection.
	 * @param {String} serviceType The service type.
	 * @param {Object} options Options.
	 * @return {Object} The connection.
	 */
	Empathy.createConnection = function (serviceType, options) {
		var serviceApi = Empathy.serviceApi(serviceType);

		if (!serviceApi) {
			return false;
		}

		return serviceApi.create(options);
	};

	/**
	 * Get priority from presence.
	 * @param {String} presence The presence.
	 * @return {Number} The priority.
	 */
	Empathy.priorityFromPresence = function (presence) {
		var priority = -128;

		switch (presence)  {
			case 'online':
				priority = 0;
				break;
			case 'away':
				priority = -8;
				break;
			case 'dnd':
				priority = -4;
				break;
			case 'xa':
				priority = -12;
				break;
			default:
				priority = -128;
		}

		return priority;
	};

	Empathy.prototype = {
		_$win: $(),
		_$settingsWin: $(),
		_$callWin: $(),
		_calls: {},
		_$conversations: {},
		_conns: [],
		_loggedInUsers: {},
		_contacts: {},
		_defaultContactIcon: new W.Icon('stock/person').realpath(32),
		_currentDst: null,
		_config: {
			accounts: [],
			sendComposing: true,
			sendActive: false,
			boshHttpUrl: Webos.xmpp.config.boshHttpUrl,
			boshWsUrl: Webos.xmpp.config.boshWsUrl,
			useOtr: false,
			saveOtrKey: false
		},
		_conn: function (index) {
			return this._conns[index];
		},
		connection: function (index) {
			return this._conn(index);
		},
		connectionByUsername: function (username) {
			for (var i = 0; i < this._conns.length; i++) {
				var conn = this._conns[i];

				if (conn.option('username') == username) {
					return conn;
				}
			}
		},
		countConnections: function () {
			return this._conns.length;
		},
		contacts: function () {
			return this._contacts;
		},
		contact: function (username) {
			return this._contacts[username];
		},
		loggedInUser: function (username) {
			return this._loggedInUsers[username];
		},
		currentDst: function () {
			return this._currentDst;
		},
		initialize: function () {
			var that = this;

			W.xtag.loadUI('/usr/share/templates/empathy/main.html', function(windows) {
				that._$win = $(windows).filter(':eq(0)');
				that._$settingsWin = $(windows).filter(':eq(1)');
				that._$callWin = $(windows).filter(':eq(2)');

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

			var services = Empathy.listServices();

			var $services = $win.find('.view-login .login-service');
			for (var serviceName in services) {
				var service = services[serviceName];

				$services.append('<option value="'+serviceName+'">'+service.title+'</option>');
			}
		},
		_initEvents: function () {
			var that = this;
			var $win = this._$win;

			$win.find('.view-login form').submit(function (e) {
				e.preventDefault();

				var serviceName = $win.find('.view-login .login-service').val(),
					username = $win.find('.view-login .login-username').val(),
					password = $win.find('.view-login .login-password').val();

				that.connect({
					username: username,
					password: password,
					service: serviceName
				});
			});

			$win.find('.view-login .login-service').change(function () {
				var serviceName = $win.find('.view-login .login-service').val();

				var service = Empathy.service(serviceName);
				if (!service) {
					return;
				}

				var serviceApi = Empathy.serviceApi(service.type);
				if (!serviceApi) {
					return;
				}

				$win.find('.view-login .login-credentials').toggle(serviceApi.prototype.needsCredentials());
			}).change();

			this.on('connecting', function (data) {
				$win.window('loading', true, {
					message: 'Logging in '+data.connection.option('username'),
					lock: (that.countConnections() == 1)
				});

				var connId = data.id;
				this.once('connected connecterror autherror', function (data) {
					if (data.id == connId) {
						$win.window('loading', false);
					}
				});
			});

			this.on('disconnecting', function (data) {
				$win.window('loading', true, {
					message: 'Disconnecting '+data.connection.option('username'),
					lock: (that.countConnections() <= 1)
				});

				var connId = data.id;
				this.once('disconnected', function (data) {
					if (data.id == connId) {
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

			var $contactsCtn = $win.find('.view-conversations .friends-list ul'),
				$conversationCtn = $win.find('.conversation ul');
			this.on('contactupdated', function (contact) {
				var conn;

				var $contact = $contactsCtn.children('li').filter(function () {
					return ($(this).data('username') == contact.username);
				});

				var $contactActions = $();
				if (!$contact.length) {
					$contact = $('<li></li>').data('username', contact.username).appendTo($contactsCtn);
					$contact.append('<span class="contact-status"></span>');
					$contact.append('<ul class="contact-actions"></ul>');
					$contact.append('<img alt="" class="contact-picture"/>');
					$contact.append('<span class="contact-name"></span>');
					$contact.append('<span class="contact-server"></span>');

					$contactActions = $contact.find('.contact-actions');
					
					conn = that.connection(contact.conn);
					var connFeatures = conn.features();

					for (var i = 0; i < connFeatures.length; i++) {
						$('<li></li>', {
							'class': 'action-'+connFeatures[i]+' cursor-pointer'
						}).appendTo($contactActions);
					}

					$('<li></li>', {
						'class': 'action-url cursor-pointer'
					}).appendTo($contactActions);
				} else {
					$contactActions = $contact.find('.contact-actions');
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
					var thisContact = that.contact($(this).data('username'));

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
				
				var $picture = $contact.find('.contact-picture');
				if ($picture.attr('src') != contact.picture) {
					$picture.attr('src', contact.picture);
				}

				$contactActions.find('.action-url').toggle(!!contact.url);

				if (typeof contact.conn != 'undefined') {
					conn = that._conn(contact.conn);

					if (conn.option('service')) {
						var service = Empathy.service(conn.option('service'));

						$contact.find('.contact-server').text(service.title);
					}
				}

				$contactsCtn.toggleClass('hide-contact-server', (that.countConnections() <= 1));
			});

			this.on('userupdated', function (contact) {
				$win.find('.conversation-compose .compose-contact-picture').attr('src', contact.picture);
			});

			var scrollToConversationBottom = function () {
				var conversationHeight = 0;
				$conversationCtn.children().each(function () {
					conversationHeight += $(this).outerHeight(true);
				});

				$conversationCtn.scrollTop(conversationHeight);
			};
			this.on('messagesent', function (msg) {
				var dst = that.contact(msg.to), src = that.loggedInUser(msg.from);

				var $msg = $('<li></li>', { 'class': 'msg msg-sent' });
				$msg.append('<div class="msg-contact-picture-ctn"><img src="'+src.picture+'" alt="" class="msg-contact-picture"></div>');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).html(msg.message));
				$msg.toggleClass('msg-encrypted', msg.encrypted);

				if (that.currentDst() && that.currentDst().username == msg.to) {
					$msg.appendTo($conversationCtn);
					scrollToConversationBottom();
				} else {
					var $msgs = $();
					if (that._isConversationDetached(msg.to)) {
						$msgs = that._$conversations[msg.to];
					}
					that._$conversations[msg.to] = $msgs.add($msg);
				}
			});
			this.on('messagereceived', function (msg) {
				var src = that.contact(msg.from), dst = that.loggedInUser(msg.to);

				var $msg = $('<li></li>', { 'class': 'msg msg-received' });
				$msg.append('<div class="msg-contact-picture-ctn"><img src="'+src.picture+'" alt="" class="msg-contact-picture"></div>');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).html(msg.message));
				$msg.toggleClass('msg-encrypted', msg.encrypted);

				if (that.currentDst() && that.currentDst().username == msg.from) {
					$conversationCtn.find('.msg-typing').remove();
					$msg.appendTo($conversationCtn);
					scrollToConversationBottom();
				} else {
					var $msgs = $();
					if (that._isConversationDetached(msg.from)) {
						$msgs = that._$conversations[msg.from];
					}
					that._$conversations[msg.from] = $msgs.not('.msg-typing').add($msg);

					var $contact = $contactsCtn.children('li').filter(function () {
						return ($(this).data('username') == msg.from);
					});

					//Update main window badge
					if (!$contact.is('.contact-conversation-unread')) {
						$win.window('option', 'badge', $win.window('option', 'badge') + 1);
					}

					//Set conversation as unread
					$contact.addClass('contact-conversation-unread').detach().prependTo($contactsCtn);

					//Show a little notification
					var $replyEntry = $('<input />', { type: 'text', placeholder: 'Reply...' })
						.css({ 'float': 'left' })
						.keydown(function (e) {
							if (e.keyCode == 13) {
								var msg = {
									from: src.conn,
									to: src.username,
									message: $replyEntry.val()
								};
								that.sendMessage(msg);

								$replyEntry.val('');
							}
						});
					var $talkBtn = $.w.button('Talk').click(function() {
						that._switchConversation(src.username, src.conn);
					});

					$.w.notification({
						title: 'New message from '+src.name,
						icon: 'apps/chat',
						message: msg.message,
						widgets: [$replyEntry, $talkBtn]
					});
				}
			});

			var createFileMsgContent = function (fileSending, isSent) {
				var file = Webos.BlobFile.create(fileSending.blob, {
					basename: fileSending.basename
				});

				var openFile = function () {
					Webos.Application.openFile(file);
				};

				var saveFile = function () {
					new NautilusFileSelectorWindow({
						parentWindow: $win,
						exists: false,
						mime_type: fileSending.type
					}, function(paths) {
						if (paths.length) {
							var path = paths[0];

							W.File.get(path).writeAsBlob(fileSending.blob);
						} else {
							//Operation aborded
						}
					});
				};

				var $openFileLink = $('<a href="#"></a>').html('Open').click(function (e) {
					e.preventDefault();
					openFile();
				});
				var $saveFileLink = $('<a href="#"></a>').html('Save').click(function (e) {
					e.preventDefault();
					saveFile();
				});

				var $msgContent = $('<span></span>', { 'class': 'msg-content' });

				if (file.matchesMimeType('image/*') ||
					file.matchesMimeType('audio/*') ||
					file.matchesMimeType('video/*')) {
					var $media = $();

					if (file.matchesMimeType('image/*')) {
						$media = $('<img />');
					} else if (file.matchesMimeType('audio/*')) {
						$media = $('<audio controls></audio>');
					} else if (file.matchesMimeType('video/*')) {
						$media = $('<video controls></video>');
					}
					if ($media.is('audio,video')) {
						$media.error(function () {
							W.Error.trigger('Cannot play media', $media[0].error);
						});
					}
					$media.addClass('msg-content-media').appendTo($msgContent);

					file.readAsDataUrl(function (dataUrl) {
						$media.attr('src', dataUrl);
					});

					$msgContent.append('<br />');
				} else {
					$msgContent.append((isSent) ? 'File sent: ' : 'File received: ');
				}

				$msgContent.append($openFileLink);
				$msgContent.append(' &middot; ');
				$msgContent.append($saveFileLink);

				return $msgContent;
			};
			this.on('filesent', function (fileSending) {
				var dst = that.contact(fileSending.to), src = that.loggedInUser(fileSending.from);

				var $msg = $('<li></li>', { 'class': 'msg msg-sent' });
				$msg.append('<div class="msg-contact-picture-ctn"><img src="'+src.picture+'" alt="" class="msg-contact-picture"></div>');
				$msg.append(createFileMsgContent(fileSending, true));
				$msg.toggleClass('msg-encrypted', fileSending.encrypted);

				if (that.currentDst() && that.currentDst().username == fileSending.to) {
					$msg.appendTo($conversationCtn);
					scrollToConversationBottom();
				} else {
					var $msgs = $();
					if (that._isConversationDetached(fileSending.to)) {
						$msgs = that._$conversations[fileSending.to];
					}
					that._$conversations[fileSending.to] = $msgs.add($msg);
				}
			});

			this.on('filereceived', function (fileSending) {
				var src = that.contact(fileSending.from), dst = that.loggedInUser(fileSending.to);

				var $msg = $('<li></li>', { 'class': 'msg msg-received' });
				$msg.append('<div class="msg-contact-picture-ctn"><img src="'+src.picture+'" alt="" class="msg-contact-picture"></div>');
				$msg.append(createFileMsgContent(fileSending));
				$msg.toggleClass('msg-encrypted', fileSending.encrypted);

				if (that.currentDst() && that.currentDst().username == fileSending.from) {
					$conversationCtn.find('.msg-typing').remove();
					$msg.appendTo($conversationCtn);
					scrollToConversationBottom();
				} else {
					var $msgs = $();
					if (that._isConversationDetached(fileSending.from)) {
						$msgs = that._$conversations[fileSending.from];
					}
					that._$conversations[fileSending.from] = $msgs.add($msg);

					var $contact = $contactsCtn.children('li').filter(function () {
						return ($(this).data('username') == fileSending.from);
					});

					//Update main window badge
					if (!$contact.is('.contact-conversation-unread')) {
						$win.window('option', 'badge', $win.window('option', 'badge') + 1);
					}

					//Set conversation as unread
					$contact.addClass('contact-conversation-unread').detach().prependTo($contactsCtn);

					//Show a little notification
					var $saveBtn = $.w.button('Save').click(function() {
						saveFile();
					});

					$.w.notification({
						title: 'File received',
						icon: 'apps/chat',
						message: 'New file received from '+src.name,
						widgets: [$saveBtn]
					});
				}
			});

			this.on('contactcomposing', function (data) {
				var src = that.contact(data.username);
				if (!src) {
					return;
				}

				var $msg = $('<li></li>', { 'class': 'msg msg-received msg-typing' });
				$msg.append('<img src="'+src.picture+'" alt="" class="msg-contact-picture">');
				$msg.append($('<span></span>', { 'class': 'msg-content' }).html('...'));

				if (that.currentDst() && that.currentDst().username == data.username) {
					if (!$conversationCtn.find('.msg-typing').length) {
						$msg.appendTo($conversationCtn);
						scrollToConversationBottom();
					}
				} else {
					var $msgs = $();
					if (that._isConversationDetached(data.username)) {
						$msgs = that._$conversations[data.username];
					}

					if (!$msgs.filter('.msg-typing').length) {
						that._$conversations[data.username] = $msgs.add($msg);
					}
				}
			});

			this.on('contactpaused', function (data) {
				var src = that.contact(data.username);

				if (that.currentDst() && that.currentDst().username == data.username) {
					$conversationCtn.find('.msg-typing').remove();
				} else {
					if (that._isConversationDetached(data.username)) {
						that._$conversations[data.username] = that._$conversations[data.username].not('.msg-typing');
					}
				}
			});

			/*!
			 * True if the user is composing a message, false otherwise.
			 * @type {Boolean}
			 */
			var isComposing = false;
			var sendActive = function (dstUsername) {
				if (!that._config.sendActive) {
					return;
				}

				var dst = that.contact(dstUsername), conn = that.connection(dst.conn);

				conn.sendChatstate({
					to: dst.username,
					type: 'active'
				});
			};
			var sendComposing = function (dstUsername) {
				if (!that._config.sendComposing) {
					return;
				}

				if (!isComposing) {
					var dst = that.contact(dstUsername), conn = that.connection(dst.conn);

					conn.sendChatstate({
						to: dst.username,
						type: 'composing'
					});
					isComposing = true;
				}
			};
			var sendPaused = function (dstUsername) {
				if (isComposing) {
					var dst = that.contact(dstUsername), conn = that.connection(dst.conn);

					conn.sendChatstate({
						to: dst.username,
						type: 'paused'
					});
					isComposing = false;
				}
			};

			$contactsCtn.on('click', '.contact-actions li', function (e) {
				var previousDst = that.currentDst();

				var $contact = $(this).parentsUntil($contactsCtn, 'li'),
					contactUsername = $contact.data('username'),
					contact = that.contact(contactUsername),
					conn = that.connection(contact.conn);

				if (!contact || typeof contact.conn == 'undefined') {
					return;
				}

				if ($(this).is('.action-message')) {
					return; // It's like just clicking the contact
				} else {
					e.stopPropagation();
					that._getContactPicture(contact.conn, contact.username);

					if ($(this).is('.action-call')) {
						conn.call({
							to: contact.username
						});
					} else if ($(this).is('.action-url')) {
						if (contact.url) {
							window.open(contact.url);
						}
					}
				}
			});
			$contactsCtn.on('click', 'li', function () {
				var previousDst = that.currentDst();
				if (previousDst) {
					sendPaused(previousDst.username);
				}

				var $contact = $(this),
					contactUsername = $contact.data('username'),
					contact = that.contact(contactUsername);

				if (!contact || typeof contact.conn == 'undefined') {
					return;
				}

				that._switchConversation(contact.username, contact.conn);
				sendActive(contact.username);

				that._getContactPicture(contact.conn, contact.username);
			});

			$win.find('.conversation-compose .compose-msg').keydown(function (e) {
				var dst = that.currentDst(),
					msgContent = $(this).val();

				if (!dst) {
					return;
				}

				if (msgContent) {
					sendComposing(dst.username);
				} else {
					sendPaused(dst.username);
				}

				if (e.keyCode == 13) { //Enter
					sendPaused(dst.username);

					if (!msgContent) {
						return;
					}

					var msg = {
						connId: dst.conn,
						to: dst.username,
						message: msgContent
					};
					that.sendMessage(msg);

					$(this).val('').focus();
				}
			});

			$win.find('.conversation-compose .compose-attach').click(function () {
				var dst = that.currentDst(), conn = that.connection(dst.conn);

				if (!dst) {
					return;
				}
				if (!conn.hasFeature('fileSending')) {
					return;
				}

				new NautilusFileSelectorWindow({
					parentWindow: $win
				}, function(files) {
					if (files.length) {
						var file = files[0];

						file.readAsBlob(function (blob) {
							conn.sendFile({
								to: dst.username,
								file: blob,
								basename: file.get('basename')
							});
						});
					}
				});
			});

			$win.find('.btn-accounts').click(function () {
				that.openSettings();
			});

			$win.on('windowclose', function () {
				that.disconnect();
			});

			this.on('accountupdate accountremove', function () {
				that._saveConfig();
			});

			this.on('configchange', function () {
				$win.find('.btn-encryption').toggle(that._config.useOtr);

				if (that._config.privKey) {
					Empathy.OtrMessageInterface.importKey(decodeURIComponent(that._config.privKey));
				}
				if (that._config.useOtr && !Empathy.OtrMessageInterface.otrReady()) {
					that.generateOtrKey();
				}
			});
			$win.find('.btn-encryption').hide();
			
			this.on('conversationswitch', function () {
				$win.find('.btn-encryption').button('option', 'disabled', true);
				$win.find('.conversation-compose .compose-attach').button('option', 'disabled', true);

				if (that.currentDst()) {
					var dst = that.currentDst(), conn = that.connection(dst.conn);
					
					var encrypted = false;
					if (conn.hasFeature('otr')) {
						var status = conn.otrStatus(dst.username);
						encrypted = status.encrypted;

						$win.find('.btn-encryption').button('option', 'disabled', false);
					}
					$win.find('.btn-encryption').button('option', 'activated', encrypted);

					if (conn.hasFeature('fileSending')) {
						$win.find('.conversation-compose .compose-attach').button('option', 'disabled', false);
					}
				}
			});
			this.on('otrake', function (status) {
				if (that.currentDst()) {
					var dst = that.currentDst(), conn = that.connection(status.connId);

					if (status.from === dst.username) {
						$win.find('.btn-encryption').button('option', 'activated', status.encrypted);
					}
				}
			});
			this.on('otrend', function (status) {
				if (that.currentDst()) {
					var dst = that.currentDst(), conn = that.connection(status.connId);

					if (status.from === dst.username) {
						$win.find('.btn-encryption').button('option', 'activated', false);
					}
				}
			});
			$win.find('.btn-encryption').click(function () {
				if (!that.currentDst()) {
					return;
				}

				var dst = that.currentDst(), conn = that.connection(dst.conn);
				if (!conn.hasFeature('otr')) {
					return;
				}

				var status = conn.otrStatus(dst.username);

				if (!status.encrypted) {
					conn.sendOtrQuery(dst.username);
				} else {
					conn.endOtr(dst.username);
				}
			});

		},
		switchView: function (newView) {
			var $views = this._$win.find('.views > div'),
				$newView = $views.filter('.view-'+newView);

			$views.hide();
			$newView.show();
		},
		connect: function (options) {
			var that = this;

			options = $.extend({
				username: '',
				password: '',
				service: ''
			}, options);

			var service = Empathy.service(options.service);
			if (!service) {
				return false;
			}

			var serviceApi = Empathy.serviceApi(service.type);
			if (!serviceApi) {
				return false;
			}

			if (!options.username && serviceApi.prototype.needsCredentials()) {
				return false;
			}

			var connectOptions = $.extend({}, options);

			if (service.options) {
				if (service.options.host) {
					if (connectOptions.username.indexOf('@') == -1) {
						connectOptions.username += '@'+service.options.host;
					}
				}
			}

			var conn = Empathy.createConnection(service.type, {
				boshHttpUrl: this._config.boshHttpUrl,
				boshWsUrl: this._config.boshWsUrl
			});
			if (!conn) {
				return false;
			}

			var connId = this._conns.length;
			this._conns.push(conn);

			conn.on('status', function (data) {
				switch (data.type) {
					case 'connecting':
						that.trigger('connecting', {
							connection: conn,
							id: connId
						});
						break;
					case 'connfail':
						that.trigger('connecterror', {
							connection: conn,
							id: connId
						});

						Webos.Error.trigger('Failed to connect to server with username "'+options.username+'"', '', 400);
						break;
					case 'connected':
						that._connected(connId);
						break;
					case 'disconnecting':
						that.trigger('disconnecting', {
							connection: conn,
							id: connId
						});
						break;
					case 'disconnected':
						that.trigger('disconnected', {
							connection: conn,
							id: connId
						});

						that._conns.splice(connId, 1);
						break;
					case 'authenticating':
						that.trigger('authenticating', {
							connection: conn,
							id: connId
						});
						break;
					case 'authfail':
						that.trigger('autherror', {
							connection: conn,
							id: connId
						});

						Webos.Error.trigger('Failed to authenticate with username "'+options.username+'"', '', 401);
						break;
					case 'error':
						that.trigger('connerror', {
							connection: conn,
							id: connId
						});

						Webos.Error.trigger('An error occured with connection "'+options.username+'"', '', 400);
						break;
				}
			});

			conn.connect(connectOptions);

			this._addAccount(options);
		},
		disconnect: function (connId) {
			if (typeof connId == 'undefined') {
				for (var i = 0; i < this._conns.length; i++) {
					this._conns[i].disconnect();
				}

				this._conns = [];
			} else {
				if (!this._conns[connId]) {
					return false;
				}

				this._conns[connId].disconnect();
			}
		},
		_addAccount: function (newAccount) {
			var accounts = this._config.accounts;

			newAccount.password = null; //Remove password!

			for (var i = 0; i < accounts.length; i++) {
				var account = accounts[i];

				if (account.username == newAccount.username) {
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
		_removeAccount: function (username) {
			var accounts = this._config.accounts;

			for (var i = 0; i < accounts.length; i++) {
				var account = accounts[i];

				if (account.username == username) {
					this._config.accounts.splice(i, 1); //Remove item
					this.trigger('accountremove', { account: account });
					return true;
				}
			}

			return false;
		},
		_loadConfig: function () {
			var that = this;
			var op = Webos.Operation.create();

			Webos.DataFile.loadUserData('empathy', [function (dataFile) {
				var config = dataFile.data();

				if (Object.keys(config).length) {
					that._config = config;
				}

				op.setCompleted();
				that.trigger('configchange');
			}, function (resp) {
				op.setCompleted(resp);
			}]);

			return op;
		},
		_saveConfig: function () {
			var that = this;

			var config = $.extend({}, that._config);
			if (!config.saveOtrKey) {
				config.privKey = null;
			}

			Webos.User.getLogged(function(user) {
				if (user) { //User logged in
					Webos.DataFile.loadUserData('empathy', function (dataFile) {
						dataFile.setData(config);
						dataFile.sync();

						that.trigger('configchange');
					});
				} else {
					that.trigger('configchange');
				}
			});
		},
		_autoConnect: function () {
			var that = this;

			if (this._config.accounts.length == 1) {
				var account = this._config.accounts[0];

				if (account.password) {
					this.connect(account);
				} else {
					this._$win.find('.view-login .login-service').val(account.service);
					
					this._$win.find('.view-login .login-username').val(account.username);
					this._$win.find('.view-login .login-password').focus();
				}
			} else {
				var accounts = this._config.accounts;
				for (var i = 0; i < accounts.length; i++) {
					(function (account) {
						if (account.password) {
							this.connect(account);
						} else {
							var service = Empathy.service(account.service);
							if (!service) {
								return;
							}

							var $askPasswordWin = $.w.window({
								title: 'Logging in '+account.username+' to '+service.title,
								dialog: true,
								resizable: false,
								width: 350
							});

							var $form = $.w.entryContainer().appendTo($askPasswordWin.window('content'));

							$.w.label('Please enter your password for '+account.username+'.').appendTo($form);
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

								that.connect($.extend({}, account, {
									password: password
								}));
								$askPasswordWin.window('close');
							});

							$askPasswordWin.window('open');
						}
					})(accounts[i]);
				}
			}
		},
		_connected: function (connId) {
			var that = this, conn = this._conn(connId);

			this.trigger('connected', {
				id: connId,
				connection: conn
			});

			conn.on('messagereceived', function (msg) {
				that.trigger('messagereceived', {
					from: msg.from,
					to: msg.to,
					connId: connId,
					message: msg.body,
					encrypted: !!msg.encrypted
				});
			});
			conn.on('messagesent', function (msg) {
				that.trigger('messagesent', {
					from: msg.from,
					to: msg.to,
					connId: connId,
					message: msg.body,
					encrypted: !!msg.encrypted
				});
			});
			conn.on('filereceived', function (fileSending) {
				that.trigger('filereceived', {
					from: fileSending.from,
					to: fileSending.to,
					connId: connId,
					blob: fileSending.blob,
					type: fileSending.type,
					basename: fileSending.basename,
					encrypted: !!fileSending.encrypted
				});
			});
			conn.on('filesent', function (fileSending) {
				that.trigger('filesent', {
					from: fileSending.from,
					to: fileSending.to,
					connId: connId,
					blob: fileSending.blob,
					type: fileSending.type,
					basename: fileSending.basename,
					encrypted: !!fileSending.encrypted
				});
			});
			conn.on('otrstatus', function (status) {
				switch (status.type) {
					case 'ake':
						that.trigger('otrake', {
							connId: connId,
							from: status.from,
							encrypted: status.encrypted
						});
						break;
					case 'end':
						that.trigger('otrend', {
							connId: connId,
							from: status.from,
							encrypted: status.encrypted
						});
						break;
				}
			});
			conn.on('otrkeygenstart', function () {
				var $loadingDialog = $.w.window({
					title: 'Generating OTR key...',
					resizable: false,
					closeable: false,
					dialog: true,
					width: 300,
					parentWindow: that._$win
				});
				$loadingDialog.window('open').window('loading', true, {
					message: 'Generating OTR key...'
				});

				conn.once('otrkeygencomplete', function () {
					$loadingDialog.window('close');
				});
			});
			conn.on('callinitiate', function (data) {
				that._callUpdate(data, connId);
			});
			conn.on('callincoming', function (data) {
				var src = that.contact(data.remote);

				if (!src) { //Do not allow anonymous calls
					conn.endCall(data.callId);
					return;
				}

				$answerBtn = $.w.button('Answer').click(function () {
					conn.answerCall(data.callId);
				});

				$.w.notification({
					title: 'Incoming call',
					message: src.name+' is calling you.',
					icon: 'apps/chat',
					widgets: [$answerBtn],
					life: 60
				});
			});
			conn.on('callstart', function (data) {
				that._callUpdate(data, connId);
			});
			conn.on('callend', function (data) {
				that._callUpdate(data, connId);
				delete that._calls[data.callId];
			});

			this._initChatstates(connId);

			this._listContacts(connId);
		},
		_initChatstates: function (connId) {
			var that = this, conn = this._conn(connId);

			conn.on('chatstate', function (state) {
				switch (state.type) {
					case 'active':
						that.trigger('contactactive', {
							username: state.from
						});
						break;
					case 'composing':
						console.log('state', state);
						that.trigger('contactcomposing', {
							username: state.from
						});
						break;
					case 'paused':
						that.trigger('contactpaused', {
							username: state.from
						});
						break;
				}
			});
		},
		_callUpdate: function (callData, connId) {
			var that = this, conn = this._conn(connId);
			var $callWin = this._$callWin;

			this._calls[callData.callId] = callData;

			var remoteNames = [];
			for (var callId in this._calls) {
				var thisCallData = this._calls[callId];

				var src = that.contact(thisCallData.remote);
				if (!src) {
					continue;
				}

				remoteNames.push(src.name);
			}
			$callWin.window('option', 'title', 'Call with '+remoteNames.join(', '));

			var $localVideo = $callWin.find('.video-local'),
				$remoteVideosCtn = $callWin.find('.video-remote'),
				$remoteVideo = $remoteVideosCtn.find('.video-remote-'+callData.callId);

			var closeWin = ($remoteVideo.attr('src') && !callData.remoteStream && remoteNames.length <= 1);

			if (!$callWin.window('is', 'opened') && !closeWin) {
				$callWin.window('open');

				$callWin.on('windowclose', function () {
					for (var callId in that._calls) {
						conn.endCall(callId);
					}
				});
			}

			if (!$remoteVideo.length) {
				$remoteVideo = $('<video></video>', { 'class': 'video-remote-'+callData.callId });
				$remoteVideosCtn.append($('<li></li>').append($remoteVideo));

				var nbrRemotes = $remoteVideosCtn.children().length;
				$remoteVideosCtn
					.removeClass('video-remote-'+(nbrRemotes - 1))
					.addClass('video-remote-'+nbrRemotes);
			}

			var URL = window.URL || window.webkitURL;
			if (!$localVideo.attr('src') && callData.localStream) {
				$localVideo.attr('src', URL.createObjectURL(callData.localStream));
				$localVideo[0].play();
			}
			if (!$remoteVideo.attr('src') && callData.remoteStream) {
				$remoteVideo.attr('src', URL.createObjectURL(callData.remoteStream));
				$remoteVideo[0].play();
			}

			if ($localVideo.attr('src') && !callData.localStream) {
				$localVideo.attr('src', '');
			}
			if ($remoteVideo.attr('src') && !callData.remoteStream) {
				$remoteVideo.remove();

				var nbrRemotes = $remoteVideosCtn.children().length;
				$remoteVideosCtn
					.removeClass('video-remote-'+(nbrRemotes + 1))
					.addClass('video-remote-'+nbrRemotes);

				if (closeWin) {
					$callWin.window('close');
				}
			}
		},
		_listContacts: function (connId) {
			var that = this, conn = this._conn(connId);

			//Set user info
			var connUsername = conn.option('username');
			this._loggedInUsers[connUsername] = {
				username: connUsername,
				name: 'Me'
			};
			that._getContactPicture(connId, connUsername);

			conn.on('contact', function (contact) {
				that._setContact($.extend({}, contact, {
					conn: connId
				}));

				var updatedContact = that.contact(contact.username);
				if (updatedContact && updatedContact.presence && updatedContact.presence != 'offline' && updatedContact.picture !== false) {
					that._getContactPicture(connId, contact.username);
				}
			});

			conn.listContacts();
		},
		_setContact: function (contact) {
			var isLoggedInUser = (!!this._loggedInUsers[contact.username]),
				currentContact = (isLoggedInUser) ? this._loggedInUsers[contact.username] : this._contacts[contact.username];

			contact = $.extend({
				hasPicture: true
			}, currentContact, {
				username: contact.username,
				conn: contact.conn,
				name: contact.name,
				presence: contact.presence,
				priority: contact.priority,
				picture: contact.picture,
				hasPicture: contact.hasPicture,
				url: contact.url
			});

			contact.name = contact.name || contact.username;

			contact.presence = contact.presence || 'offline';
			contact.priority = Empathy.priorityFromPresence(contact.presence);

			if (contact.picture === false) {
				contact.hasPicture = false;
			}
			contact.picture = contact.picture || this._defaultContactIcon;

			if (isLoggedInUser) {
				this._loggedInUsers[contact.username] = contact;

				this.trigger('userupdated', contact);
			} else {
				this._contacts[contact.username] = contact;

				this.trigger('contactupdated', contact);
			}
		},
		_getContactPicture: function (connId, username) {
			var that = this, conn = this._conn(connId), contact = this.contact(username);

			// Picture already loaded?
			if (contact && contact.picture != this._defaultContactIcon) {
				return;
			}
			if (contact && !contact.hasPicture) {
				return;
			}

			conn.getContactPicture(username);
		},
		$conversation: function () {
			return this._$win.find('.conversation ul');
		},
		_isConversationDetached: function (username) {
			return (!!this._$conversations[username]);
		},
		_detachCurrentConversation: function () {
			if (!this._currentDst) {
				return;
			}

			this._$conversations[this._currentDst.username] = this.$conversation().children().detach();
			this._currentDst = null;
		},
		_reattachConversation: function (username) {
			if (!this._isConversationDetached(username)) {
				return;
			}

			this._detachCurrentConversation();

			this._currentDst = this.contact(username);
			this.$conversation().append(this._$conversations[this._currentDst.username]);
			delete this._$conversations[this._currentDst.username];
		},
		_switchConversation: function (dst, connId) {
			var conn = this._conn(connId);

			this._detachCurrentConversation();
			this._reattachConversation(dst);
			this._currentDst = this.contact(dst);

			this._$win.find('.conversation .conversation-compose').show();
			this._$win.find('.conversation .conversation-compose .compose-msg').focus();

			var $contactsCtn = this._$win.find('.view-conversations .friends-list ul');
			var $contact = $contactsCtn.children('li').filter(function () {
				return ($(this).data('username') == dst);
			});
			$contactsCtn.children('.item-active').removeClass('item-active');

			//Update main window badge
			if ($contact.is('.contact-conversation-unread')) {
				this._$win.window('option', 'badge', this._$win.window('option', 'badge') - 1);
			}

			//Set conversation as read
			$contact.addClass('item-active').removeClass('contact-conversation-unread');

			this.trigger('conversationswitch', {
				dst: dst
			});
		},
		sendMessage: function (msg) {
			var conn = this._conn(msg.connId);

			conn.sendMessage({
				to: msg.to,
				body: msg.message
			});
		},
		searchContacts: function (searchQuery) {
			var that = this;

			var searchAttrs = ['username', 'name', 'presence'];

			var $contactsCtn = this._$win.find('.view-conversations .friends-list ul');

			if (!searchQuery) {
				$contactsCtn.children().show();
			} else {
				$contactsCtn.children().each(function () {
					var contactUsername = $(this).data('username'),
						contact = that.contact(contactUsername);

					if (!contactUsername || !contact) {
						$(this).hide();
						return;
					}

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

				$settingsWin.find('.settings-close').off('click.settings.empathy').on('click.settings.empathy', function () {
					$settingsWin.window('close');
				});
			}
			$settingsWin.window('toForeground');

			// Accounts

			var $form = $settingsWin.find('form'),
				$serviceEntry = $settingsWin.find('.account-service'),
				$usernameEntry = $settingsWin.find('.account-username'),
				$passwordEntry = $settingsWin.find('.account-password'),
				$removeAccountBtn = $settingsWin.find('.acount-remove');


			var services = Empathy.listServices();
			$serviceEntry.empty();
			for (var serviceName in services) {
				var service = services[serviceName];

				$serviceEntry.append('<option value="'+serviceName+'">'+service.title+'</option>');
			}

			var editedAccount = -1;

			var $accountsList = $settingsWin.find('.accounts-list').list('content').empty();
			var accounts = this._config.accounts;
			for (var i = 0; i < accounts.length; i++) {
				(function (i, account) {
					var service = Empathy.service(account.service);

					var $item = $.w.listItem(account.username+' on '+service.title);
					$item.on('listitemselect', function () {
						editedAccount = i;

						$serviceEntry.val(account.service);
						$usernameEntry.val(account.username);
						$passwordEntry.val(account.password || '');

						$removeAccountBtn.button('option', 'disabled', false);
					});

					if (i === 0) { //Select first item
						$item.listItem('option', 'active', true);
					}

					$item.appendTo($accountsList);
				})(i, accounts[i]);
			}

			var $newItem = $.w.listItem('New account').appendTo($accountsList);
			$newItem.on('listitemselect', function () {
				editedAccount = -1;

				$serviceEntry.val('');
				$usernameEntry.val('');
				$passwordEntry.val('');

				$removeAccountBtn.button('option', 'disabled', true);
			});
			if (i === 0) { //Select first item
				$newItem.listItem('option', 'active', true);
			}

			$form.off('submit.settings.empathy').on('submit.settings.empathy', function (e) {
				e.preventDefault();

				var account = {
					service: $serviceEntry.val(),
					username: $usernameEntry.val(),
					password: $passwordEntry.val()
				};

				if (~editedAccount && that._config.accounts[editedAccount].username != account.username) {
					that._removeAccount(that._config.accounts[editedAccount].username);
				}

				var conn = that.connectionByUsername(account.username);
				if (conn) {
					conn.disconnect();
				}
				that.connect(account);
			});

			$removeAccountBtn.off('click.settings.empathy').on('click.settings.empathy', function () {
				if (editedAccount == -1) {
					return;
				}

				var username = that._config.accounts[editedAccount].username;

				var conn = that.connectionByUsername(username);
				if (conn) {
					conn.disconnect();
				}

				that._removeAccount(username);
			});

			// Other settings

			var $others = $('.settings-composing, .settings-servers, .settings-encryption');
			var loadSettings = function () {
				$others.find('input').each(function () {
					var settingName = $(this).data('setting');

					if (!settingName) {
						return;
					}

					if (typeof that._config[settingName] != 'undefined') {
						if ($(this).is('[type=checkbox]')) {
							$(this).prop('checked', that._config[settingName]);
						} else {
							$(this).val(that._config[settingName]);
						}
					}
				});
			};
			loadSettings();

			$others.off('change.settings.empathy').on('change.settings.empathy', 'input', function () {
				var val = $(this).val(), settingName = $(this).data('setting');

				if ($(this).is('[type=checkbox]')) {
					val = $(this).prop('checked');
				}

				that._config[settingName] = val;
				that._saveConfig();
			});

			$settingsWin.find('.servers-reset').off('click.settings.empathy').on('click.settings.empathy', function () {
				that._config.boshHttpUrl = Webos.xmpp.config.boshHttpUrl;
				that._config.boshWsUrl = Webos.xmpp.config.boshWsUrl;
				loadSettings();
			});

			$settingsWin.find('.encryption-generateKey').off('click.settings.empathy').on('click.settings.empathy', function () {
				that.generateOtrKey();
			});
		},
		generateOtrKey: function () {
			var that = this;

			var $loadingDialog = $.w.window({
				title: 'Generating OTR key...',
				resizable: false,
				closeable: false,
				dialog: true,
				width: 300,
				parentWindow: that._$win
			});
			$loadingDialog.window('open').window('loading', true, {
				message: 'Generating OTR key...'
			});

			Empathy.OtrMessageInterface.generateKey(true).on('success', function () {
				Empathy.OtrMessageInterface.exportKey().on({
					success: function (data) {
						var exportedKey = data.result;

						that._config.privKey = encodeURIComponent(exportedKey);
						that._saveConfig();

						$loadingDialog.window('close');
					}
				});
			});
		}
	};
	Webos.inherit(Empathy, Webos.Observable);

	/**
	 * An Empathy connection interface.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Webos.Observable}
	 * @author emersion
	 */
	Empathy.Interface = function (options) {
		Webos.Observable.call(this);

		options = options || {};
		this._options = options;
	};
	/**
	 * The connection interface's prototype.
	 */
	Empathy.Interface.prototype = {
		/**
		 * The connection type.
		 * @var {String}
		 * @private
		 */
		_type: '',
		/**
		 * The connection's features.
		 * @var {Array}
		 * @private
		 */
		_features: [],
		/**
		 * True if the connection needs credentials, false otherwise.
		 * @var {Boolean}
		 * @private
		 */
		_needsCredentials: false,
		/**
		 * Get this connection's options.
		 * @return {Object} The options.
		 */
		options: function () {
			return this._options;
		},
		/**
		 * Get an option.
		 * @param {String} key The option key.
		 * @return {String} The option value.
		 */
		option: function (key) {
			return this._options[key];
		},
		/**
		 * Get this connection type.
		 * @return {String} The connection type.
		 */
		type: function () {
			return this._type;
		},
		/**
		 * Get this connection's features.
		 * @return {Array} The connection's features.
		 */
		features: function () {
			return this._features;
		},
		/**
		 * Check if this connection has a feature or not.
		 * @param {String} feat The feature name.
		 * @return {Boolean} True if the connection has the specified feature, false otherwise.
		 */
		hasFeature: function (feat) {
			return ~$.inArray(feat, this._features);
		},
		/**
		 * Remove a connection's feature.
		 * @param {String} feat The feature name.
		 * @private
		 */
		_removeFeature: function (feat) {
			var featIndex = this._features.indexOf(feat);

			if (featIndex >= 0) {
				this._features.splice(featIndex, 1);
			}
		},
		/**
		 * Check if this connection needs credentials.
		 * @return {Boolean} True if this connection needs credentials, false otherwise.
		 */
		needsCredentials: function () {
			return this._needsCredentials;
		},
		/**
		 * Connect this interface.
		 * @return {Webos.Operation} The operation.
		 */
		connect: function () {},
		/**
		 * Disconnect this interface.
		 */
		disconnect: function () {},
		/**
		 * List all contacts.
		 * @return {Webos.Operation} The operation.
		 */
		listContacts: function () {},
		/**
		 * Get a contact's picture.
		 * @return {Webos.Operation} The operation.
		 */
		getContactPicture: function (username) {}
	};
	Webos.inherit(Empathy.Interface, Webos.Observable);

	/**
	 * A message interface (i.e. a connection interface which is able to send messages).
	 * It has the feature `message`.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.Interface}
	 * @author emersion
	 */
	Empathy.MessageInterface = function (options) {
		this._features.push('message');

		Empathy.Interface.call(this, options);
	};
	/**
	 * Empathy.MessageInterface's prototype.
	 */
	Empathy.MessageInterface.prototype = {
		/**
		 * Should be called when a message is received.
		 * @param {Object} msg The message data.
		 * @private
		 */
		_receiveMessage: function (msg) {
			this.trigger('message messagereceived', msg);
		},
		/**
		 * Send a message.
		 * @param {Object} msg The message data. Should contain these fields: `to` the recipient's username, `body` the message body.
		 * @return {Webos.Operation} The operation.
		 */
		sendMessage: function (msg) {}
	};
	Webos.inherit(Empathy.MessageInterface, Empathy.Interface);

	/**
	 * A message interface which supports OTR (Off-The-Record encryption).
	 * It has the feature `otr`.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.MessageInterface}
	 * @author emersion
	 */
	Empathy.OtrMessageInterface = function (options) {
		this._features.push('otr');

		Empathy.MessageInterface.call(this, options);
	};
	Webos.Observable.build(Empathy.OtrMessageInterface);

	/**
	 * The OTR private key.
	 * @var {Object}
	 * @private
	 */
	Empathy.OtrMessageInterface._otrPrivKey = null;
	/**
	 * Check if OTR is available.
	 * @return {Boolean} True if OTR is available, false otherwise.
	 */
	Empathy.OtrMessageInterface.otrAvailable = function () {
		return !!Empathy.OtrMessageInterface._otrPrivKey;
	};
	/**
	 * Check if OTR is ready for use.
	 * @return {Boolean} True if OTR is ready, false otherwise.
	 */
	Empathy.OtrMessageInterface.otrReady = function () {
		return !!Empathy.OtrMessageInterface._otrPrivKey;
	};
	/**
	 * Create/import/get the OTR key.
	 * @param {String} [base64Key] If specified, the base64-encoded key will be imported.
	 * @return {Webos.Operation} The operation.
	 * @private
	 */
	Empathy.OtrMessageInterface._createKey = function (base64Key) {
		var that = this;
		var op = Webos.Operation.create();

		if (that._otrPrivKey) {
			op.setCompleted(that._otrPrivKey);
			return op;
		}

		if (base64Key) { //Import a key
			var key = DSA.parsePrivate(base64Key);
			that._otrPrivKey = key;

			op.setCompleted(key);
		} else {
			var imports = [
				'/usr/lib/webos/bigint.js',
				'/usr/lib/webos/crypto.js',
				'/usr/lib/webos/eventemitter.js',
				'/usr/lib/webos/salsa20.js',
				'/usr/lib/otr/lib/const.js',
				'/usr/lib/otr/lib/helpers.js',
				'/usr/lib/otr/lib/dsa.js'
			];
			for (var i = 0; i < imports.length; i++) {
				imports[i] = '../'+W.File.get(imports[i]).get('realpath'); //TODO: get absolute path
			}

			op.setStarted();
			that.trigger('keygenstart', {
				operation: op
			});

			// generate a DSA key in a web worker
			DSA.createInWebWorker({
				path: Webos.File.get('/usr/lib/otr/dsa-webworker.js').get('realpath'),
				imports: imports
			}, function (key) {
				that._otrPrivKey = key;

				op.setCompleted(key);

				that.trigger('keygencomplete', {
					key: key
				});
			});
		}

		return op;
	};
	/**
	 * Export the OTR key.
	 * @return {Webos.Operation} The operation.
	 */
	Empathy.OtrMessageInterface.exportKey = function () {
		var that = this;
		var op = Webos.Operation.create();

		this._createKey().on('success', function (data) {
			var key = data.result;
			op.setCompleted(key.packPrivate());
		});

		return op;
	};
	/**
	 * Import an OTR key.
	 * @param {String} base64Key The base64-encoded key which will be imported.
	 * @return {Webos.Operation} The operation.
	 */
	Empathy.OtrMessageInterface.importKey = function (base64Key) {
		var that = this;
		var op = Webos.Operation.create();

		this._createKey(base64Key).on('success', function (data) {
			op.setCompleted();
		});

		return op;
	};
	/**
	 * Generate the OTR key.
	 * @param {Boolean} [regenerate] If set to true, this will force to regenerate the key even if it has been already generated.
	 * @return {Webos.Operation} The operation.
	 */
	Empathy.OtrMessageInterface.generateKey = function (regenerate) {
		var that = this;
		var op = Webos.Operation.create();

		if (regenerate) {
			that._otrPrivKey = null;
		}

		this._createKey().on('success', function (data) {
			op.setCompleted();
		});

		return op;
	};

	/**
	 * Empathy.OtrMessageInterface's prototype.
	 */
	Empathy.OtrMessageInterface.prototype = {
		_otr: {},
		otrAvailable: function () {
			return Empathy.OtrMessageInterface.otrAvailable();
		},
		_startOtr: function (dst) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			if (that._otr[dst]) {
				op.setCompleted(that._otr[dst]);
				return op;
			}

			Empathy.OtrMessageInterface._createKey().on({
				start: function () {
					that.trigger('otrkeygenstart', { operation: op });

					this.once('complete', function () {
						that.trigger('otrkeygencomplete');
					});
				},
				success: function (data) {
					var key = data.result;

					//Start new OTR
					var buddy = new OTR({
						priv: key,
						debug: true
					});

					buddy.REQUIRE_ENCRYPTION = false;
					buddy.SEND_WHITESPACE_TAG = true;
					buddy.WHITESPACE_START_AKE = true;
					buddy.ERROR_START_AKE = false;

					buddy.on('ui', function (msg, encrypted) { //Message received
						that._receiveMessage({
							from: dst,
							to: conn.jid,
							body: msg,
							encrypted: encrypted
						});
					});

					buddy.on('io', function (msg) { //Message to send
						that._sendMessage({
							to: dst,
							body: msg
						});
					});

					buddy.on('error', function (err) { //Error
						console.warn(err);
						that.trigger('messageerror', {
							from: dst,
							to: conn.jid,
							body: err
						});
					});

					buddy.on('status', function (state) {
						switch (state) {
							case OTR.CONST.STATUS_AKE_SUCCESS:
								// sucessfully ake'd with buddy
								// check if buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED
								that.trigger('otrstatus', {
									type: 'ake',
									from: dst,
									to: conn.jid,
									encrypted: (buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED)
								});
								break;
							case OTR.CONST.STATUS_END_OTR:
								// if buddy.msgstate === OTR.CONST.MSGSTATE_FINISHED
								// inform the user that his correspondent has closed his end
								// of the private connection and the user should do the same
								that.trigger('otrstatus', {
									type: 'end',
									from: dst,
									to: conn.jid,
									encrypted: (buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED)
								});

								if (buddy.msgstate === OTR.CONST.MSGSTATE_FINISHED) {
									buddy.endOtr();
								}
								break;
						}
					});

					that._otr[dst] = buddy;

					op.setCompleted(buddy);
				}
			});

			return op;
		},
		sendOtrQuery: function (dst) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			this._startOtr(dst).on('success', function (data) {
				var buddy = data.result;

				buddy.sendQueryMsg();

				op.setCompleted();
			});

			return op;
		},
		endOtr: function (dst) {
			var that = this, conn = this._conn;

			if (!this._otr[dst]) {
				return;
			}

			this._otr[dst].endOtr();
		},
		otrStatus: function (dst) {
			var that = this, conn = this._conn;

			var otrStatus = {
				available: false,
				encrypted: false
			};

			if (this._otr[dst]) {
				otrStatus.available = true;

				var buddy = this._otr[dst];

				otrStatus.encrypted = (buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED);
			}

			return otrStatus;
		}
	};
	Webos.inherit(Empathy.OtrMessageInterface, Empathy.MessageInterface);

	/**
	 * A call interface (i.e. a connection interface which is able to make calls with other users).
	 * It has the feature `call`.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.Interface}
	 * @author emersion
	 */
	Empathy.CallInterface = function (options) {
		this._features.push('call');

		Empathy.Interface.call(this, options);
	};
	/**
	 * Empathy.CallInterface's prototype.
	 */
	Empathy.CallInterface.prototype = {
		/**
		 * Initiate a new call.
		 * @param {Object} call The call data. Should contain these fields: `to` the call recipient.
		 * @return {Webos.operation} The operation.
		 */
		call: function (call) {},
		/**
		 * Answer a to an incoming call.
		 * @param {Number} callId The call ID.
		 * @return {Webos.operation} The operation.
		 */
		answerCall: function (callId) {},
		/**
		 * End a call.
		 * @param {Number} callId The call ID.
		 * @return {Webos.operation} The operation.
		 */
		endCall: function (callId) {}
	};
	Webos.inherit(Empathy.CallInterface, Empathy.Interface);

	/**
	 * A file sending interface (i.e. a connection interface which is able to send files to other users).
	 * It has the feature `fileSending`.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.Interface}
	 * @author emersion
	 */
	Empathy.FileSendingInterface = function (options) {
		this._features.push('fileSending');

		Empathy.Interface.call(this, options);
	};
	/**
	 * Empathy.CallInterface's prototype.
	 */
	Empathy.FileSendingInterface.prototype = {
		/**
		 * Send a file.
		 * @param {Object} fileSending The file sending.
		 * Should contain these fields: `to` the recipient's username, `file` the file to send, as Blob.
		 * Can contain these fields: `basename` the file's basename (e.g. `mysuperpicture.jpg`).
		 * @return {Webos.operation} The operation.
		 */
		sendFile: function (fileSending) {}
	};
	Webos.inherit(Empathy.FileSendingInterface, Empathy.Interface);

	/**
	 * An XMPP connection.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.Interface}
	 * @author emersion
	 */
	Empathy.Xmpp = function (options) {
		Empathy.OtrMessageInterface.call(this, options);
		Empathy.CallInterface.call(this, options);

		this.initialize(this._options);
	};
	Empathy.Xmpp.prototype = {
		_type: 'xmpp',
		_needsCredentials: true,
		_RTC: null,
		_localVideoSteam: null,
		_jids: {},
		getSubJid: Webos.xmpp.getSubJid,
		getJidDomain: Webos.xmpp.getJidDomain,
		getJidUsername: Webos.xmpp.getJidUsername,
		_updateContactJid: function (contact, fullJid) {
			if (!this._jids[contact.username]) {
				this._jids[contact.username] = {};
			}

			this._jids[contact.username][fullJid] = {
				priority: contact.priority,
				presence: contact.presence
			};
		},
		_getFullJid: function (bareJid) {
			bareJid = this.getSubJid(bareJid); //Make sure that's a bare jid

			if (!this._jids[bareJid]) {
				return '';
			}

			var availableJids = this._jids[bareJid];

			var preferedJid = '', preferedJidPriority = -129;
			for (var fullJid in availableJids) {
				var fullJidContact = availableJids[fullJid];

				var fullJidPriority = fullJidContact.priority;
				if (typeof fullJidPriority != 'number') {
					fullJidPriority = Empathy.priorityFromPresence(fullJidContact.presence);
				}

				if (preferedJidPriority < fullJidPriority) {
					preferedJidPriority = fullJidPriority;
					preferedJid = fullJid;
				}
			}

			return preferedJid;
		},
		initialize: function (options) {
			var that = this;

			var conn = Webos.xmpp.initialize(options); //Initialize a new XMPP connection

			//Connection handlers
			conn.addHandler(function (msg) {
				var to = msg.getAttribute('to');
				var from = msg.getAttribute('from');
				var type = msg.getAttribute('type');
				var elems = msg.getElementsByTagName('body');

				if (type == 'error') {
					that.trigger('messageerror', {
						from: from,
						to: to,
						body: 'An error occured! Is your account verified? Is the individual in your contacts?'
					});
					return;
				}

				if (/*type == "chat" && */ elems.length > 0) {
					var body = Strophe.getText(elems[0]);

					if (that.otrAvailable()) {
						that._startOtr(that.getSubJid(from)).on('success', function (data) {
							var buddy = data.result;

							buddy.receiveMsg(body);
						});
					} else {
						that._receiveMessage({
							from: from,
							to: to,
							body: body
						});
					}
				}

				// we must return true to keep the handler alive.
				// returning false would remove it after it finishes.
				return true;
			}, null, 'message');

			conn.addHandler(function (presence) {
				var presenceType = $(presence).attr('type'); // unavailable, subscribed, etc...
				var from = $(presence).attr('from'), // the jabber_id of the contact
					fromUsername = that.getSubJid(from);

				var connJid = that.getSubJid(conn.jid);

				var contact = {
					username: fromUsername,
					account: connJid
				};

				if (presenceType != 'error') {
					if (presenceType === 'unavailable') {
						contact.presence = 'offline';
					} else {
						var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
						if (show === 'chat' || !show) {
							// Mark contact as online
							contact.presence = 'online';
						} else {
							contact.presence = show;
						}
					}
				}

				that._updateContactJid(contact, from);
				that.trigger('contact', contact);

				return true;
			}, null, 'presence');

			if (conn.chatstates) { // Chatstates plugin loaded
				conn.chatstates.onActive = function (jid) {
					var connJid = that.getSubJid(conn.jid);

					that.trigger('chatstate', {
						type: 'active',
						from: jid,
						to: connJid
					});
				};

				conn.chatstates.onComposing = function (jid) {
					var connJid = that.getSubJid(conn.jid);

					that.trigger('chatstate', {
						type: 'composing',
						from: jid,
						to: connJid
					});
				};

				conn.chatstates.onPaused = function (jid) {
					var connJid = that.getSubJid(conn.jid);

					that.trigger('chatstate', {
						type: 'paused',
						from: jid,
						to: connJid
					});
				};
			}

			if (conn.jingle) { // Jingle plugin loaded (for video calls)
				
				RTC = setupRTC();
				if (RTC) {
					conn.jingle.pc_constraints = RTC.pc_constraints;

					if (RTC.browser == 'firefox') {
						conn.jingle.media_constraints.mandatory.MozDontOfferDataChannel = true;
					}

					window.RTCPeerconnection = RTC.peerconnection;
				} else {

				}

				conn.jingle.ice_config = {
					iceServers: [{ url: 'stun:stun.l.google.com:19302' }]
				};

				var handlers = {
					'mediaready.jingle': function (event, localStream) {
						conn.jingle.localStream = localStream;
						console.log('media ready');
					},
					'mediafailure.jingle': function () {
						console.warn('media failure');
					},
					'callincoming.jingle': function () {
						console.log('call incoming');
					},
					'callactive.jingle': function () {
						console.log('call active');
					},
					'callterminated.jingle': function () {
						console.log('call terminated');
					},
					'remotestreamadded.jingle': function () {
						console.log('remote stream added');
					},
					'remotestreamremoved.jingle': function () {
						console.log('remote stream removed');
					},
					'iceconnectionstatechange.jingle': function () {
						console.log('ice connection state change');
					},
					'nostuncandidates.jingle': function () {
						console.warn('no stun candidates');
					},
					'ack.jingle': function (event, sid, ack) {
						console.log('got stanza ack for ' + sid, ack);
					},
					'error.jingle': function (event, sid, err) {
						console.warn('got stanza error for ' + sid, err);
					},
					'packetloss.jingle': function (event, sid, err) {
						console.warn('packetloss', sid, loss);
					}
				};

				for (var eventName in handlers) {
					$(document).off(eventName).on(eventName, handlers[eventName]);
				}

				this.on('status', function (status) {
					if (status.type != 'connected') {
						return;
					}

					conn.jingle.getStunAndTurnCredentials();
				});
			} else { // Jingle not loaded, no call support
				this._removeFeature('call');
			}

			if (conn.disco) { // Disco plugin loaded
				this.on('status', function (status) {
					if (status.type != 'connected') {
						return;
					}

					conn.disco.addIdentity('client', 'web');
					conn.disco.addFeature(Strophe.NS.DISCO_INFO);
				});
			}

			//Log Strophe io
			/*conn.rawInput = function (data) { console.log('RECV: ' + data); };
			conn.rawOutput = function (data) { console.log('SEND: ' + data); };//*/

			this._conn = conn;
		},
		connect: function (options) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			options = $.extend({
				username: '',
				password: ''
			}, this.options(), options);
			this._options = options;

			conn.connect(options.username, options.password, function (status) {
				var statusData = {
					type: ''
				};

				switch (status) {
					case Strophe.Status.CONNECTING:
						statusData.type = 'connecting';
						break;
					case Strophe.Status.CONNFAIL:
						statusData.type = 'error';
						statusData.error = 'connfail';

						op.setCompleted(false);
						break;
					case Strophe.Status.CONNECTED:
						statusData.type = 'connected';

						//Send priority
						conn.send($pres().c("priority").t(String(0)));

						op.setCompleted();
						break;
					case Strophe.Status.DISCONNECTING:
						statusData.type = 'disconnecting';
						break;
					case Strophe.Status.DISCONNECTED:
						statusData.type = 'disconnected';
						break;
					case Strophe.Status.AUTHENTICATING:
						statusData.type = 'authenticating';
						break;
					case Strophe.Status.AUTHFAIL:
						statusData.type = 'error';
						statusData.error = 'autherror';
						break;
					case Strophe.Status.ERROR:
						statusData.type = 'error';
						statusData.error = 'connerror';
						break;
					default:
						console.warn('Strophe: unknown connection status: '+status);
				}

				if (statusData.type) {
					that.trigger('status', statusData);
				}
			});

			return op;
		},
		disconnect: function () {
			this._conn.disconnect();
		},
		listContacts: function () {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			var connJid = that.getSubJid(conn.jid);

			//Get roster
			var iq = $iq({type: 'get'}).c('query', { xmlns: 'jabber:iq:roster' });

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

					var contact = {
						username: that.getSubJid(jid),
						account: connJid,
						name: (jid != name) ? name : ''
					};

					that.trigger('contact', contact);
					that._updateContactJid(contact, jid);
					contacts.push(contact);
				});

				op.setCompleted(contacts);
			}, function () {
				op.setCompleted(false);
			});

			return op;
		},
		getContactPicture: function (jid) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			if (!conn.vcard) {
				op.setCompleted(false);
				return op;
			}

			var connJid = that.getSubJid(conn.jid);

			conn.vcard.get(function (stanza) {
				var $vCard = $(stanza).find("vCard");

				if ($vCard.is(':empty')) {
					op.setCompleted(false);
					return;
				}

				var img = $vCard.find('BINVAL').text();
				var type = $vCard.find('TYPE').text();

				var fullname = $vCard.find('FN').text();
				var url = $vCard.find('URL').text();

				var contact = {
					username: that.getSubJid(jid),
					account: connJid
				};

				if (img && type) {
					contact.picture = 'data:'+type+';base64,'+img;
				} else {
					contact.picture = false;
				}
				if (fullname) {
					contact.name = fullname;
				}
				if (url) {
					contact.url = url;
				}

				that.trigger('contact', contact);
				op.setCompleted(contact);
			}, jid, function () {
				op.setCompleted(false);
			});

			return op;
		},
		_sendMessage: function (msg) {
			var that = this, conn = this._conn;

			var reply = $msg({
				to: msg.to,
				from: conn.jid,
				type: 'chat'
			}).c("body").t(msg.body);

			conn.send(reply.tree());
		},
		sendMessage: function (msg) {
			var that = this, conn = this._conn;
			var encrypted = false;

			var triggerEvent = function () {
				that.trigger('message messagesent', {
					from: that.getSubJid(conn.jid),
					to: msg.to,
					body: msg.body,
					encrypted: encrypted
				});
			};
			
			if (that.otrAvailable()) {
				that._startOtr(that.getSubJid(msg.to)).on('success', function (data) {
					var buddy = data.result;

					buddy.sendMsg(msg.body);

					encrypted = (buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED);
					triggerEvent();
				});
			} else {
				this._sendMessage(msg);
				triggerEvent();
			}
		},
		sendChatstate: function (state) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			if (!conn.chatstates) {
				op.setCompleted(false);
				return op;
			}

			var method = '';
			switch (state.type) {
				case 'active':
					method = 'sendActive';
					break;
				case 'composing':
					method = 'sendComposing';
					break;
				case 'paused':
					method = 'sendPaused';
					break;
				default:
					op.setCompleted(false);
					return op;
			}

			conn.chatstates[method](state.to);

			op.setCompleted();

			return op;
		},
		_call: function (call) {
			var that = this, conn = this._conn;

			if (!conn.jingle) {
				return false;
			}

			conn.send($pres({ to: call.to }));

			conn.jingle.initiate(call.to, conn.jid);
		},
		call: function (call) {
			var that = this, conn = this._conn;

			if (!conn.jingle) {
				return false;
			}

			//We must provide a full jid here
			var to = that._getFullJid(call.to);
			if (to) {
				call.to = to;
			}

			if (!conn.jingle.localStream) { //Get local stream
				$(document).one('mediaready.jingle mediafailure.jingle', function (e) {
					if (e.type == 'mediaready') { //Got media
						that._call(call);
					}
				});

				getUserMediaWithConstraints(['audio', 'video']);
			} else {
				that._call(call);
			}
		}
	};
	Webos.inherit(Empathy.Xmpp, Empathy.OtrMessageInterface);
	Webos.inherit(Empathy.Xmpp, Empathy.CallInterface);

	/**
	 * Create a new XMPP connection.
	 * @return {Empathy.Xmpp} The connection.
	 */
	Empathy.Xmpp.create = function () {
		return new Empathy.Xmpp();
	};

	/**
	 * A PeerJS connection.
	 * @param {Object} [options] The connection's options.
	 * @constructor
	 * @augments {Empathy.Interface}
	 * @author emersion
	 */
	Empathy.Peerjs = function (options) {
		Empathy.MessageInterface.call(this, options);
		Empathy.CallInterface.call(this, options);
		Empathy.FileSendingInterface.call(this, options);

		this.initialize(this._options);
	};
	Empathy.Peerjs.prototype = {
		_type: 'peerjs',
		_peer: null,
		_peerAppName: 'empathy',
		_contactsPeerIds: [],
		initialize: function (options) {},
		connect: function (options) {
			var that = this, conn = this._conn;
			var op = Webos.Operation.create();

			options = $.extend({}, this.options(), options);
			this._options = options;

			var peer = Webos.Peer.connect();

			var contactsInterval = null;
			peer.on('open', function (id) {
				that._options.username = id;
				console.log('My id: '+id);

				Webos.Peer.attach(id, that._peerAppName).on('complete', function () {
					contactsInterval = setInterval(function () {
						that.listContacts();
					}, 15*1000);

					that.trigger('status', {
						type: 'connected'
					});

					op.setCompleted();
				});
			});
			peer.on('close', function () {
				that.trigger('status', {
					type: 'disconnected'
				});

				if (contactsInterval) {
					clearInterval(contactsInterval);
				}
			});
			peer.on('error', function (err) {
				that.trigger('status', {
					type: 'connfail',
					msg: 'Error: '+err.type
				});
				op.setCompleted(false);
			});

			peer.on('connection', function (conn) {
				that._handleConnection(conn);
			});

			peer.on('call', function(call) {
				that._handleCall(call);

				that.trigger('callincoming', {
					remote: call.peer,
					local: peer.id,
					callId: call.id
				});
			});

			this._peer = peer;

			this.trigger('status', {
				type: 'connecting'
			});

			return op;
		},
		disconnect: function () {
			this._peer.destroy();
		},
		_handleConnection: function (conn) {
			var that = this, peer = this._peer;

			conn.on('data', function(data) {
				console.log(data);

				switch (data.type) {
					case 'message': //Receive messages
						if (!data.contents || !data.contents.body) {
							break;
						}

						that._receiveMessage({
							from: conn.peer,
							to: peer.id,
							body: data.contents.body
						});
						break;
					case 'chatstate': //Chatstates
						if (!data.contents || !data.contents.type) {
							break;
						}

						that.trigger('chatstate', {
							type: data.contents.type,
							from: conn.peer,
							to: peer.id
						});
						break;
					case 'file': //Receive a file
						if (!data.contents || !data.contents.bytes || !window.Blob) {
							break;
						}

						var blob = new Blob([data.contents.bytes], { type: data.contents.type });

						that.trigger('filereceived file', {
							blob: blob,
							type: data.contents.type,
							basename: data.contents.basename,
							from: conn.peer,
							to: peer.id
						});
						break;
					case 'contact': //Contact update
						if (!data.contents || !data.contents.type) {
							break;
						}

						if (data.contents.type == 'request') {
							var sendPicture = function (imgUri) {
								conn.send({
									type: 'contact',
									contents: {
										type: 'response',
										picture: imgUri || null
									}
								});
							};

							that.getContactPicture(peer.id).then(function (data) {
								sendPicture(data.result);
							}, function () {
								sendPicture();
							});
						} else if (data.contents.type == 'response') {
							var contact = {
								username: conn.peer,
								account: peer.id
							};

							if (typeof data.contents.picture != 'undefined') {
								contact.picture = data.contents.picture || false;
							}

							that.trigger('contact', contact);
						} else {
							break;
						}
						break;
					default:
						console.warn('Empathy: Unknown PeerJS message type: '+data.type);
				}
			});

			conn.on('close', function () {});

			conn.on('error', function (err) {
				that.trigger('status', {
					type: 'error',
					error: 'connerror',
					msg: 'Error: '+err.type
				});
			});
		},
		_openConnection: function (dst) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			var conn = this._getConnection(dst, 'data');
			if (conn) {
				if (conn.open) {
					op.setCompleted(conn);
				} else {
					conn.once('open', function(data) {
						op.setCompleted(conn);
					});
				}
			} else {
				conn = peer.connect(dst);

				conn.on('open', function(data) {
					that._handleConnection(conn);

					op.setCompleted(conn);
				});
			}

			return op;
		},
		_listConnections: function (peerId, connType) {
			var peer = this._peer;

			var connections = peer.connections[peerId] || [], matching = [];
			for (var i = 0; i < connections.length; i++) {
				var conn = connections[i];

				if (!connType || conn.type == connType) {
					matching.push(conn);
				}
			}

			return matching;
		},
		_getConnection: function (peerId, connType) {
			return this._listConnections(peerId, connType)[0];
		},
		_handleCall: function (call) {
			var that = this, peer = this._peer;

			call.on('stream', function (stream) {
				that.trigger('call callstart', {
					remote: call.peer,
					local: peer.id,
					remoteStream: stream,
					localStream: call.localStream,
					callId: call.id
				});
			});
			call.on('close', function () {
				that.trigger('callend', {
					remote: call.peer,
					local: peer.id,
					callId: call.id
				});
			});
			call.on('error', function (err) {
				that.trigger('status', {
					type: 'error',
					error: 'connerror',
					msg: 'Error: '+err.type
				});
			});
		},
		_getCall: function (callId) {
			var peer = this._peer;

			for (var peerId in peer.connections) {
				var connections = peer.connections[peerId];
				for (var i = 0; i < connections.length; i++) {
					var conn = connections[i];

					if (conn.type == 'media' && conn.id == callId) {
						return conn;
					}
				}
			}
		},
		listContacts: function () {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			Webos.Peer.listByApp(this._peerAppName).on({
				success: function (data) {
					var list = data.result, contacts = [], offlinePeers = that._contactsPeerIds;
					that._contactsPeerIds = [];

					for (var i = 0; i < list.length; i++) {
						var thisPeer = list[i];

						if (!thisPeer.get('peerId')) {
							continue;
						}

						var contact = {
							username: thisPeer.get('peerId'),
							account: peer.id,
							name: '',
							presence: 'offline'
						};

						if (thisPeer.get('online')) {
							contact.presence = 'online';
						}
						if (thisPeer.get('user')) {
							contact.name = thisPeer.get('user')['realname'];
						}

						that.trigger('contact', contact);
						contacts.push(contact);

						var j = offlinePeers.indexOf(contact.username);
						if (~j) {
							offlinePeers.splice(j, 1);
						}
						that._contactsPeerIds.push(contact.username);
					}

					for (i = 0; i < offlinePeers.length; i++) {
						that.trigger('contact', {
							username: offlinePeers[i],
							account: peer.id,
							presence: 'offline'
						});
					}

					op.setCompleted(contacts);
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		getContactPicture: function (peerId) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			if (peerId == peer.id) {
				Webos.User.getLogged([function (user) {
					if (user) {
						user.getAvatar([function (imgUri) {
							op.setCompleted(imgUri);
						}, function (resp) {
							op.setCompleted(resp);
						}]);
					} else {
						op.setCompleted(null);
					}
				}, function (resp) {
					op.setCompleted(resp);
				}]);
				return op;
			}

			that._openConnection(peerId).on({
				success: function (data) {
					var conn = data.result;

					conn.send({
						type: 'contact',
						contents: {
							type: 'request'
						}
					});
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		_sendMessage: function (msg) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			that._openConnection(msg.to).on({
				success: function (data) {
					var conn = data.result;

					conn.send({
						type: 'message',
						contents: {
							body: msg.body
						}
					});

					op.setCompleted();
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		sendMessage: function (msg) {
			var that = this, peer = this._peer;

			var triggerEvent = function () {
				that.trigger('message messagesent', {
					from: peer.id,
					to: msg.to,
					body: msg.body
				});
			};

			/*if (that.otrAvailable()) {
				that._startOtr(that.getSubJid(msg.to)).on('success', function (data) {
					var buddy = data.result;

					buddy.sendMsg(msg.body);

					encrypted = (buddy.msgstate === OTR.CONST.MSGSTATE_ENCRYPTED);
					triggerEvent();
				});
			} else {*/
				var op = this._sendMessage(msg);
				triggerEvent();
			//}

			return op;
		},
		sendChatstate: function (state) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			that._openConnection(state.to).on({
				success: function (data) {
					var conn = data.result;

					conn.send({
						type: 'chatstate',
						contents: {
							type: String(state.type)
						}
					});

					op.setCompleted();
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		_getUserMedia: function () {
			var op = Webos.Operation.create();

			// Compatibility shim
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

			// Get audio/video stream
			navigator.getUserMedia({ audio: true, video: true }, function (stream) {
				op.setCompleted(stream);
			}, function(err) {
				op.setCompleted(false);
			});

			return op;
		},
		call: function (callMetadata) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			this._getUserMedia().on({
				success: function (data) {
					var stream = data.result,
						call = peer.call(callMetadata.to, stream);

					that.trigger('callinitiate calling', {
						remote: callMetadata.to,
						local: peer.id,
						localStream: stream,
						callId: call.id
					});

					that._handleCall(call);

					op.setCompleted();
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		answerCall: function (callId) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();
			var call = this._getCall(callId);

			this._getUserMedia().on({
				success: function (data) {
					var stream = data.result;
					call.answer(stream);

					op.setCompleted();
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		},
		endCall: function (callId) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();
			var call = this._getCall(callId);

			call.close();
			op.setCompleted();

			return op;
		},
		sendFile: function (fileSending) {
			var that = this, peer = this._peer;
			var op = Webos.Operation.create();

			if (!window.Blob) {
				op.setCompleted(false);
				return op;
			}

			if (!fileSending.file instanceof Blob) {
				op.setCompleted(false);
				return op;
			}

			that._openConnection(fileSending.to).on({
				success: function (data) {
					var conn = data.result;

					conn.send({
						type: 'file',
						contents: {
							bytes: fileSending.file,
							type: fileSending.file.type,
							basename: fileSending.basename
						}
					});

					that.trigger('filesent', {
						blob: fileSending.file,
						from: peer.id,
						to: conn.peer
					});

					op.setCompleted();
				},
				error: function () {
					op.setCompleted(false);
				}
			});

			return op;
		}
	};

	Webos.inherit(Empathy.Peerjs, Empathy.MessageInterface);
	Webos.inherit(Empathy.Peerjs, Empathy.CallInterface);
	Webos.inherit(Empathy.Peerjs, Empathy.FileSendingInterface);

	/**
	 * Create a new PeerJS connection.
	 * @return {Empathy.Peerjs} The connection.
	 */
	Empathy.Peerjs.create = function () {
		return new Empathy.Peerjs();
	};

	/**
	 * Open a new Empathy window.
	 * @return {Empathy} The new Empathy instance.
	 */
	Empathy.open = function () {
		return new Empathy();
	};

	window.Empathy = Empathy;
});
