var myWindow = $.w.window({
	width: 300,
	height: 300
});

contents = myWindow.window('content');

$('<img />', { src: 'usr/share/images/distributor/logo.png', width: '75px' }).draggable({
	data: 'Hello world !',
	dragImage: $('<img />', { src: 'usr/share/images/distributor/logo.png', width: '85px' }).css('opacity', '0.5')
}).appendTo(contents);

$('<div></div>').css({
	width: 100,
	height: 100,
	'background-color': 'blue'
}).droppable({
	activate: function() {
		$(this).css('background-color', 'yellow');
	},
	desactivate: function() {
		$(this).css('background-color', 'blue');
	},
	over: function(e, data) {
		$(this).css('background-color', 'red');
	},
	out: function(e, data) {
		$(this).css('background-color', 'yellow');
	},
	drop: function(e, data) {
		$(this).css('background-color', 'red');
	}
}).appendTo(contents);

myWindow.window('open');