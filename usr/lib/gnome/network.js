var item = $('<li></li>');

var label = $('<a href="#"></a>').appendTo(item);

var icon = $('<img />', { 'class': 'icon', src: new SIcon('status/network-idle', 24, 'ubuntu-mono-dark'), title: 'Aucune activité réseau' }).appendTo(label);

new SIndicator(item);

var serverCallStart = function() {
	icon
		.attr('src', new SIcon('status/network-transmit-receive', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Chargement de cours...');
};
W.ServerCall.bind('start', serverCallStart);
if (W.ServerCall.getNbrPendingCalls() > 0) {
	serverCallStart();
}
W.ServerCall.bind('stop', function() {
	icon
		.attr('src', new SIcon('status/network-idle', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Aucune activité réseau');
});