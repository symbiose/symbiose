Webos.Translation.load(function(t) {
	var item = $('<li></li>');
	
	var label = $('<a href="#" style="position: relative;"></a>').appendTo(item);

	var icons = {
		idle: $('<img />', { 'class': 'icon', src: new W.Icon('status/network-idle-symbolic', 16), title: t.get('No network activity') }).appendTo(label),
		transmit_receive: $('<img />', { 'class': 'icon', src: new W.Icon('status/network-transmit-receive-symbolic', 16), title: t.get('Loading, please wait...') }).css('position', 'absolute').hide().appendTo(label)
	};
	
	var networkData = {
		total: W.ServerCall.getNbrPendingCalls(),
		pending: W.ServerCall.getNbrPendingCalls(),
		failed: 0
	};
	
	var menu = $('<ul></ul>').appendTo(item);
	var menuTotal = $('<li></li>').appendTo(menu);
	var menuPending = $('<li></li>').appendTo(menu);
	var menuFailed = $('<li></li>').appendTo(menu);
	$('<li></li>', { 'class': 'separator' }).appendTo(menu);
	$('<li>' + t.get('Reset') + '</li>').click(function() {
		networkData = {
			total: 0,
			pending: 0,
			failed: 0
		};
		refreshMenuFn();
	}).appendTo(menu);
	
	new SIndicator(item);
	
	var refreshMenuFn = function() {
		menuTotal.html(t.get('Sent queries : ${total}', { total: networkData.total }));
		menuPending.html(t.get('Queries being loaded : ${pending}', { pending: networkData.pending }));
		menuFailed.html(t.get('Failed queries : ${failed}', { failed: networkData.failed }));
	};
	
	var serverCallStart = function() {
		icons.transmit_receive.stop().fadeIn('fast');
	};
	W.ServerCall.bind('start', serverCallStart);
	if (W.ServerCall.getNbrPendingCalls() > 0) {
		serverCallStart();
	}
	W.ServerCall.bind('complete', function() {
		icons.transmit_receive.stop().fadeOut('fast');
	});
	
	W.ServerCall.bind('callstart', function() {
		networkData.total++;
		networkData.pending++;
		refreshMenuFn();
	});
	W.ServerCall.bind('callcomplete', function(data) {
		if (networkData.pending > 0) {
			networkData.pending--;
		}
		if (typeof data.call.response != 'undefined' && !data.call.response.isSuccess()) {
			networkData.failed++;
		}
		refreshMenuFn();
	});
	
	refreshMenuFn();
}, 'gnome');