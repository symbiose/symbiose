Webos.Script.load('usr/lib/easyrtc/socket.io.js');

Webos.require(['/usr/lib/easyrtc/easyrtc.js'], function() {
	var Empathy = function () {
		this._init();
	};
	Empathy.prototype = {
		_easyRTCId: null,
		_init: function() {
			var that = this;

			this._window = $.w.window.main({
				title: 'Empathy',
				width: 400,
				height: 300
			});

			var $winContent = this._window.window('content');
			$winContent.html('<div id="sendMessageArea"><textarea id="sendMessageText"></textarea><div id="otherClients"></div></div><div id="receiveMessageArea">Received Messages:<div id="conversation"></div></div>');

			easyRTC.setSocketUrl(":8080");

			easyRTC.setLoggedInListener(function(connected) {
				that._onLoggedIn(connected);
			});
			easyRTC.setDataListener(this._onData);

			Webos.User.get(function(user) {
				if (user) {
					easyRTC.setUserName(user.get('realname'));
				} else {
					easyRTC.setUserName('anonymous');
				}

				easyRTC.connect('im', function(easyRTCId) {
					that._onConnected(easyRTCId);
				}, function(msg) {
					that._onConnectError(msg);
				});
			});

			this._window.window('open');

			this._window.on('windowclose', function() {
				easyRTC.disconnect();
			});
		},
		_onConnected: function(easyRTCId) {
			this._easyRTCId = easyRTCId;
		},
		_onConnectError: function(message) {
			easyRTC.showError("LOGIN-FAILURE", message);
		},
		_onLoggedIn: function(connected) {
			var that = this;

			var otherClientDiv = document.getElementById('otherClients');
			while (otherClientDiv.hasChildNodes()) {
				otherClientDiv.removeChild(otherClientDiv.lastChild);
			}
			for(var i in connected) {
				var button = document.createElement('button');
				button.onclick = function(easyrtcid) {
					return function() {
						that._sendMsg(easyrtcid);
					}
				}(i);

				var label = document.createTextNode("Send to " + easyRTC.idToName(i));
				button.appendChild(label);
				otherClientDiv.appendChild(button);
			}

			if( !otherClientDiv.hasChildNodes() ) {
				otherClientDiv.innerHTML = "<em>Nobody else logged in to talk to...</em>";
			}
		},
		_onData: function(who, content) {
			// Escape html special characters, then add linefeeds.
			content = content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
			content = content.replace(/\n/g, "<br />");
			document.getElementById("conversation").innerHTML += "<b>" + easyRTC.idToName(who) + ":</b>&nbsp;" + content + "<br />";
		},
		_sendMsg: function(otherEasyrtcid) {
			var text = document.getElementById("sendMessageText").value;
			if(text.replace(/\s/g, "").length == 0) { // Don"t send just whitespace
				return;
			}

			easyRTC.sendDataWS(otherEasyrtcid, text);
			this._onData("Me", text);
			document.getElementById("sendMessageText").value = "";
		}
	};

	Empathy.open = function () {
		return new Empathy();
	};

	Empathy.open();
}, {
	exportApis: ['easyRTC']
});