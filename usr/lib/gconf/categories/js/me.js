var confWindow = args.getParam(0);
var content = confWindow.window('content');

var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);
confWindow.window('stylesheet', '/usr/share/css/gconf/categories/users.css');

(function() {
	var form = $.w.entryContainer().appendTo(content);
	var editUser = $.w.container().addClass('edituser').appendTo(form);

	var editUser_name_container = $.w.container().appendTo(editUser);
	var editUser_picture = $('<img />', { src: new W.Icon('stock/person'), 'class': 'userpicture' }).appendTo(editUser_name_container);
	var editUser_name = $.w.label();
	var editUser_name_title = $('<h2></h2>').append(editUser_name).appendTo(editUser_name_container);
	var editUser_username = $.w.label().appendTo(editUser);
	var editUser_email = $.w.label().appendTo(editUser);
	editUser.append('<br />');
	var editUser_password_container = $.w.container().appendTo(editUser);
	$('<strong></strong>').html('Options de connexion').appendTo(editUser_password_container);
	var editUser_password = $.w.label().appendTo(editUser_password_container);

	var refreshUserData = function() {
		confWindow.window('loading', true);
		W.User.get([function(user) {
			confWindow.window('loading', false);

			if (!user) {
				W.Error.trigger('Cannot show your account data : you\'re not logged in');
				return;
			}

			editUser_name.html(user.get('realname'));
			editUser_username.html(user.get('username'));
			editUser_email.html(user.get('email'));
			editUser_password.html('&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;');
		}, function(res) {
			confWindow.window('loading', false);
			res.triggerError();
		}]);
	};

	refreshUserData();
})();