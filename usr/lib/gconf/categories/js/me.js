var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true);
confWindow.window('stylesheet', '/usr/share/css/gconf/categories/users.css');

(function() {
	var user = null;

	var form = $.w.entryContainer().appendTo(content);
	var editUser = $.w.container().addClass('edituser edituser-nouserlist').appendTo(form);

	var editBtns = {};

	var editUser_name_container = $.w.container().appendTo(editUser);
	var editUser_picture = $('<img />', { 'src': new W.Icon('stock/person') }).css({
		maxHeight: '48px',
		maxWidth: '48px'
	});
	var editUser_picture_btn = $.w.button(editUser_picture).addClass('userpicture').click(function () {
		new NautilusFileSelectorWindow({
			parentWindow: confWindow,
			mime_type: 'image/png'
		}, function(files) {
			if (files.length) {
				var file = files[0];

				confWindow.window('loading', true);
				file.readAsDataUrl([function (dataUrl) {
					user.setAvatar(dataUrl).always(function () {
						confWindow.window('loading', false);
					});
				}, function (resp) {
					confWindow.window('loading', false);
					resp.triggerError();
				}]);
			}
		});
	}).appendTo(editUser_name_container);
	editUser_realname = $.w.label();
	editBtns.realname = $.w.button().appendTo(editUser_realname);
	var editUser_name_title = $('<h2></h2>').append(editUser_realname).appendTo(editUser_name_container);
	
	editUser_realname = $.w.label('Username: ').appendTo(editUser);
	editBtns.username = $.w.button().appendTo(editUser_realname);

	editUser_email = $.w.label('E-mail: ').appendTo(editUser);
	editBtns.email = $.w.button().appendTo(editUser_email);

	var editUser_password_container = $.w.container().appendTo(editUser);
	$('<strong></strong>').html('Login settings').appendTo(editUser_password_container);
	editUser_password = $.w.label('Password: ').appendTo(editUser_password_container);
	editBtns.password = $.w.button().appendTo(editUser_password);

	var editUser_removeUser_container = $.w.label('<strong>Delete account</strong><br />').appendTo(editUser);
	editUser_removeUser_container.append('Deleting your account will destroy your files and settings. You can backup your personnal files before deleting your account.<br />');
	var editUser_removeUser = $.w.button('Delete my account').click(function() {
		if (!user) {
			return;
		}

		$.webos.window.confirm({
			title: 'Delete my account',
			label: 'Are you sure you want to delete your account ?',
			details: 'You cannot undo this operation.',
			cancelLabel: 'Cancel',
			confirmLabel: 'Delete my account',
			confirm: function() {
				confWindow.window('loading', true);
				user.remove([function() {
					confWindow.window('loading', false).window('close');

					$.webos.window.messageDialog({
						title: 'Account deleted',
						label: 'Your account has been deleted.',
						closeLabel: 'Close'
					}).window('open');
				}, function(res) {
					confWindow.window('loading', false);
					res.triggerError();
				}]);
			}
		}).window('open');
	}).appendTo(editUser_removeUser_container);
	var editUser_backup = $.w.button('Backup my files').click(function() {
		if (!user) {
			return;
		}

		var homeDir = Webos.File.get('~');

		var downloadHomeDir = function() {
			if (homeDir.get('download_url')) {
				window.open(homeDir.get('download_url'));
			} else {
				W.Error.trigger('Cannot backup home directory : unsupported operation');
			}
		};

		if (homeDir.get('download_url')) {
			downloadHomeDir();
		} else {
			confWindow.window('loading', true);
			homeDir.load([function() {
				confWindow.window('loading', false);
				downloadHomeDir();
			}, function(resp) {
				confWindow.window('loading', false);
				resp.triggerError();
			}]);
		}
	}).appendTo(editUser_removeUser_container);

	for (var userAttr in editBtns) {
		(function(userAttr) {
			var $btn = editBtns[userAttr];

			var showEditTextEntry = function() {
				var $editEntry = $.w.textEntry().textEntry('option', 'value', $btn.text());
				$editEntry.insertAfter($btn.parent());

				form.one('submit', function() {
					var newValue = $editEntry.textEntry('value');
					$editEntry.remove();
					changeAttr(newValue);
				});
			};
			var showEditPasswordEntry = function() {
				var $oldPasswdEntry = $.w.passwordEntry('Old password: ');
				$oldPasswdEntry.insertAfter($btn.parent());

				var $newPasswdEntry = $.w.passwordEntry('New password: ');
				$newPasswdEntry.insertAfter($oldPasswdEntry);

				var $retypeNewPasswdEntry = $.w.passwordEntry('Retype new password: ');
				$retypeNewPasswdEntry.insertAfter($newPasswdEntry);

				form.one('submit', function() {
					var oldPasswd = $oldPasswdEntry.passwordEntry('value'),
						newPasswd = $newPasswdEntry.passwordEntry('value'),
						retypeNewPasswd = $retypeNewPasswdEntry.passwordEntry('value');

					$oldPasswdEntry.remove();
					$newPasswdEntry.remove();
					$retypeNewPasswdEntry.remove();
					changePassword(oldPasswd, newPasswd, retypeNewPasswd);
				});
			};

			var showEditEntry = function() {
				$btn.parent().hide();

				$submitBtn = $.w.button('OK', true).insertAfter($btn.parent());
				if (userAttr == 'password') {
					showEditPasswordEntry();
				} else {
					showEditTextEntry();
				}

				form.one('submit', function() {
					$submitBtn.remove();
					$btn.parent().show();
				});
			};

			var changeAttr = function(newValue) {
				if (user.set(userAttr, newValue) === false) {
					Webos.Error.trigger('Cannot change your account\'s settings', 'invalid value "'+newValue+'" for attribute "'+userAttr+'"', 400);
					return;
				}

				confWindow.window('loading', true);
				user.sync([function() {
					confWindow.window('loading', false);
				}, function(resp) {
					confWindow.window('loading', false);
					resp.triggerError();
				}]);
			};
			var changePassword = function(oldPasswd, newPasswd, retypeNewPasswd) {
				if (newPasswd != retypeNewPasswd) {
					Webos.Error.trigger('New passwords don\'t match', '', 400);
					return;
				}

				confWindow.window('loading', true);
				user.setPassword(oldPasswd, newPasswd, [function() {
					confWindow.window('loading', false);
				}, function(resp) {
					confWindow.window('loading', false);
					resp.triggerError();
				}]);
			};

			$btn.click(function() {
				if (!user) {
					return;
				}

				showEditEntry();
			});
		})(userAttr);
	}

	var refreshUserData = function() {
		confWindow.window('loading', true);
		W.User.get([function(loggedUser) {
			confWindow.window('loading', false);

			if (!loggedUser) {
				W.Error.trigger('Cannot show your account data : you\'re not logged in', '', 403);
				return;
			}

			user = loggedUser;

			var updateUserAttrs = function(user) {
				editBtns.realname.button('option', 'label', user.get('realname'));
				editBtns.username.button('option', 'label', user.get('username'));
				editBtns.email.button('option', 'label', user.get('email'));
				editBtns.password.button('option', 'label', '&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;&#x26ab;');

				user.getAvatar(function (imgUri) {
					editUser_picture.attr('src', imgUri || new W.Icon('stock/person'));
				});
			};

			user.on('update', function() {
				updateUserAttrs(user);
			});
			updateUserAttrs(user);
		}, function(res) {
			confWindow.window('loading', false);
			res.triggerError();
		}]);
	};

	refreshUserData();
})();