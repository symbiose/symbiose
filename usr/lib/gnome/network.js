var item = $('<li></li>');

var label = $('<a href="#"></a>').appendTo(item);

var icon = $('<img />', { 'class': 'icon', src: new W.Icon('status/network-idle', 24, 'ubuntu-mono-dark'), title: 'Aucune activité réseau' }).appendTo(label);

var networkData = {
	total: W.ServerCall.getNbrPendingCalls(),
	pending: W.ServerCall.getNbrPendingCalls(),
	failed: 0
};

var menu = $('<ul></ul>').appendTo(item);
var menuTotal = $('<li></li>').appendTo(menu);
var menuPending = $('<li></li>').appendTo(menu);
var menuFailed = $('<li></li>').appendTo(menu);
$('<li>R&eacute;initialiser</li>').click(function() {
	networkData = {
		total: 0,
		pending: 0,
		failed: 0
	};
	refreshMenuFn();
}).appendTo(menu);

new SIndicator(item);

var refreshMenuFn = function() {
	menuTotal.html('Requ&ecirc;tes envoy&eacute;es : '+networkData.total);
	menuPending.html('Requ&ecirc;tes en cours de chargement : '+networkData.pending);
	menuFailed.html('Requ&ecirc;tes &eacute;chou&eacute;es : '+networkData.failed);
};

var serverCallStart = function() {
	icon
		.attr('src', new W.Icon('status/network-transmit-receive', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Chargement de cours...');
};
W.ServerCall.bind('start', serverCallStart);
if (W.ServerCall.getNbrPendingCalls() > 0) {
	serverCallStart();
}
W.ServerCall.bind('stop', function() {
	icon
		.attr('src', new W.Icon('status/network-idle', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Aucune activité réseau');
});

W.ServerCall.bind('register', function() {
	networkData.total++;
	networkData.pending++;
	refreshMenuFn();
});
W.ServerCall.bind('complete', function(data) {
	if (networkData.pending > 0) {
		networkData.pending--;
	}
	if (typeof data.call.response != 'undefined' && !data.call.response.isSuccess()) {
		networkData.failed++;
	}
	refreshMenuFn();
});

refreshMenuFn();