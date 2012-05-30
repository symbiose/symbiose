var item = $('<li></li>');

var label = $('<a href="#"></a>').appendTo(item);

var icon = $('<img />', { 'class': 'icon', src: new W.Icon('status/indicator-messages', 24, 'ubuntu-mono-dark') }).appendTo(label);

var menu = $('<ul></ul>').appendTo(item);

var emailItem = $('<li></li>').appendTo(menu);
$('<a href="#"></a>').html('Configurer le courriel...').prepend($('<img />', { 'class': 'icon', src: new W.Icon('status/indicator-messages', 24, 'ubuntu-mono-dark') })).appendTo(emailItem);

//new SIndicator(item);