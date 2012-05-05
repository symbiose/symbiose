var item = $('<li></li>');

var label = $('<a href="#"></a>').appendTo(item);

var icon = $('<img />', { 'class': 'icon', src: new SIcon('status/network-idle', 24, 'ubuntu-mono-dark'), title: 'Aucune activité réseau' }).appendTo(label);

new SIndicator(item);

$(window).bind('servercallstart', function() {
	icon
		.attr('src', new SIcon('status/network-transmit-receive', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Chargement de cours...');
}).bind('servercallstop', function() {
	icon
		.attr('src', new SIcon('status/network-idle', 24, 'ubuntu-mono-dark'))
		.attr('title', 'Aucune activité réseau');
});