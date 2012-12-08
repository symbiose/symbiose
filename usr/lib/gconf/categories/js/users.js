var confWindow = args.getParam(0);
var content = confWindow.window('content');

confWindow.window('dialog', true).window('stylesheet', 'usr/share/css/gconf/categories/users.css');

var form = $.w.entryContainer().appendTo(content);

var usersList = $.w.list().addClass('userslist').appendTo(form);

var addButton = $.w.button('Ajouter').click(function() {
	createUserFn();
});
usersList.list('addButton', addButton);
var removeButton = $.w.button('Supprimer');
usersList.list('addButton', removeButton);

var editUser = $.w.container().addClass('edituser').appendTo(form);
var editUser_picture = $('<img />', { src: new W.Icon('stock/person'), 'class': 'userpicture' }).appendTo(editUser);
var editUser_name = $.w.label();
$('<h2></h2>').append(editUser_name).appendTo(editUser);
var editUser_username = $.w.label().appendTo(editUser);
var editUser_email = $.w.label().appendTo(editUser);
editUser.append('<br />');
var editUser_disabled = $.w.label().appendTo(editUser);
var editUser_authorizations = $.w.label().appendTo(editUser);
editUser.append('<br />');
$('<strong></strong>').html('Options de connexion').appendTo(editUser);
var editUser_password = $.w.label().appendTo(editUser);

var editables = {
	'realname': {
		element: editUser_name,
		label: 'Nom r&eacute;el : ',
		onEdit: function(user, realname) {
			if (realname == user.get('realname')) {
				return;
			}
			
			if (!user.set('realname', realname)) {
				W.Error.trigger('Impossible de modifier le nom r&eacute;el de l\'utilisateur "'+user.get('username')+'"');
				return;
			}
			
			confWindow.window('loading', true);
			
			user.sync(new W.Callback(function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				response.triggerError('Impossible de modifier l\'utilisateur "'+user.get('username')+'"');
			}));
		}
	},
	'username': {
		element: editUser_username,
		label: 'Nom d\'utilisateur : ',
		onEdit: function(user, username) {
			if (username == user.get('username')) {
				return;
			}
			
			if (!user.set('username', username)) {
				W.Error.trigger('Impossible de modifier l\'identifiant de l\'utilisateur "'+user.get('username')+'"');
				return;
			}
			
			confWindow.window('loading', true);
			
			user.sync(new W.Callback(function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				response.triggerError('Impossible de modifier l\'utilisateur "'+user.get('username')+'"');
			}));
		}
	},
	'email': {
		element: editUser_email,
		label: 'E-mail : ',
		onEdit: function(user, email) {
			if (email == user.get('email')) {
				return;
			}
			
			if (!user.set('email', email)) {
				W.Error.trigger('Impossible de modifier l\'email de l\'utilisateur "'+user.get('username')+'"');
				return;
			}
			
			confWindow.window('loading', true);
			
			user.sync(new W.Callback(function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				response.triggerError('Impossible de modifier l\'utilisateur "'+user.get('username')+'"');
			}));
		}
	},
	'disabled': {
		element: editUser_disabled,
		type: 'boolean',
		label: 'Compte d&eacute;sactiv&eacute;',
		onEdit: function(user, value) {
			if (!user.set('disabled', value)) {
				W.Error.trigger('Impossible de modifier la d&eacute;sactivation de l\'utilisateur "'+user.get('username')+'"');
				return;
			}
			
			confWindow.window('loading', true);

			user.sync(new W.Callback(function() {
				confWindow.window('loading', false);
			}, function(response) {
				confWindow.window('loading', false);
				response.triggerError('Impossible de modifier l\'utilisateur "'+user.get('username')+'"');
			}));
		}
	},
	'authorizations': {
		element: editUser_authorizations,
		type: 'authorizations',
		label: 'Type de compte : ',
		onEdit: function(user, selection) {
			confWindow.window('loading', true);
			
			user.authorizations(new W.Callback(function(auth) {
				if (selection == 'select') { //Autorisations specifiques
					confWindow.window('loading', false);
					
					var editAuthorizationsWindow = $.w.window.dialog({
						title: 'Modification des autorisations',
						parentWindow: confWindow,
						resizable: false
					});
					
					var form = $.w.entryContainer().appendTo(editAuthorizationsWindow.window('content'));
					
					var entries = {};
					for (var i = 0; i < W.Authorizations.all.length; i++) {
						var checked = false;
						if (auth.can(W.Authorizations.all[i])) {
							checked = true;
						}
						
						entries[W.Authorizations.all[i]] = $.w.checkButton(W.Authorizations.all[i], checked).appendTo(form);
					}
					
					var buttonContainer = $.w.buttonContainer().appendTo(form);
					$.webos.button('Annuler').click(function() {
						editAuthorizationsWindow.window('close');
					}).appendTo(buttonContainer);
					$.webos.button('Valider', true).appendTo(buttonContainer);
					
					form.submit(function() {
						var authorizations = [];
						for (var authorization in entries) {
							if (entries[authorization].checkButton('value')) {
								authorizations.push(authorization);
							}
						}
						
						editAuthorizationsWindow.window('close');
						
						auth.set(authorizations);
						
						user.setAuthorizations(auth, new W.Callback(function() {
							confWindow.window('loading', false);
						}, function(response) {
							confWindow.window('loading', false);
							response.triggerError('Impossible de modifier les autorisations de l\'utilisateur "'+user.getAttribute('username')+'"');
						}));
					});
					
					editAuthorizationsWindow.window('open');
				} else {
					auth.model(selection, new W.Callback(function() {
						confWindow.window('loading', false);
					}, function(response) {
						confWindow.window('loading', false);
						if (typeof response != 'undefined') {
							response.triggerError('Impossible de modifier les autorisations de l\'utilisateur "'+user.getAttribute('username')+'"');
						}
					}));
				}			
			}));
		},
		choices: {
			'user': 'Utilisateur limit&eacute;',
			'admin': 'Administrateur',
			'guest': 'Visiteur',
			'select': 'Autorisations sp&eacute;cifiques'
		}
	},
	'password': {
		element: editUser_password,
		type: 'password',
		label: 'Mot de passe : ',
		onShowEdit: function(user) {
			var editPasswordWindow = $.w.window.dialog({
				title: 'Modification du mot de passe',
				parentWindow: confWindow,
				resizable: false
			});
			
			var form = $.w.entryContainer().appendTo(editPasswordWindow.window('content'));
			
			var actualPassword = $.w.passwordEntry('Mot de passe actuel :').appendTo(form);
			var newPassword = $.w.passwordEntry('Nouveau mot de passe :').appendTo(form);
			$.w.label('Fiabilit&eacute; du mot de passe :').appendTo(form);
			var passwordPowerIndicator = $.webos.progressbar().appendTo(form);
			var verifNewPassword = $.w.passwordEntry('Confirmez le mot de passe :').appendTo(form);
			
			var buttonContainer = $.w.buttonContainer().appendTo(form);
			$.webos.button('Annuler').click(function() {
				editPasswordWindow.window('close');
			}).appendTo(buttonContainer);
			var applyButton = $.webos.button('Valider', true).button('disabled', true).appendTo(buttonContainer);
			
			newPassword.keyup(function() {
				var passwordPower = Webos.User.evalPasswordPower(newPassword.passwordEntry('value'));
				passwordPowerIndicator.progressbar('value', passwordPower);
			});
			
			var checkFormFn = function() {
				var valid = true;
				
				var passwordPower = Webos.User.evalPasswordPower(newPassword.passwordEntry('value'));
				if (passwordPower == 0) {
					valid = false;
				}
				
				if (newPassword.passwordEntry('value') !== verifNewPassword.passwordEntry('value')) {
					valid = false;
				}
				
				return valid;
			};
			form.keyup(function() {
				if (checkFormFn() !== true) {
					applyButton.button('disabled', true);
				} else {
					applyButton.button('disabled', false);
				}
			}).submit(function() {
				if (checkFormFn() !== true) {
					return;
				}
				
				editPasswordWindow.window('close');
				confWindow.window('loading', true);
				
				user.setPassword(actualPassword.passwordEntry('value'), newPassword.passwordEntry('value'), new W.Callback(function() {
					confWindow.window('loading', false);
				}, function(response) {
					confWindow.window('loading', false);
					response.triggerError('Impossible de modifier le mot de passe de l\'utilisateur "'+user.getAttribute('username')+'"');
				}));
			});
			
			editPasswordWindow.window('open');
			return false;
		}
	}
};

var userBeingEdited = null;
var enableUserEditFn = function(user) {
	editUser.show();

	if (userBeingEdited) {
		userBeingEdited.unbind('update.user_editing.users.gconf');
	}

	user.bind('update.user_editing.users.gconf', function() {
		enableUserEditFn(userBeingEdited);
	});

	userBeingEdited = user;
	
	for (var key in editables) {
		(function(key, editable) {
			var editButton, editEntry, editArea = $.w.entryContainer();
			switch(editable.type) {
				case 'password':
					editButton = $.w.button('Changer');
					editEntry = $.w.passwordEntry(editable.label);
					break;
				case 'authorizations':
					editEntry = $.w.selectButton(editable.label, editable.choices).bind('change', function() {
						editArea.submit();
					}).selectButton('value', 'select');
					editEntry.append($.w.button('Valider', true));
					editButton = $.w.button('Changer');
					user.authorizations(new W.Callback(function(auth) {
						var model = auth.model();
						editEntry.selectButton('value', auth.model());
						editButton.button('option', 'label', editable.choices[auth.model()]);
					}));
					break;
				case 'boolean':
					editButton = $.w.button((user.get(key)) ? 'Oui' : 'Non');
					editEntry = $.w.checkButton(editable.label).checkButton('value', user.get(key));
					editEntry.append($.w.button('Valider', true));
					break;
				case 'varchar':
				default:
					editButton = $.w.button(user.get(key) || 'Vide');
					editEntry = $.w.textEntry(editable.label).textEntry('value', user.get(key));
			}
			
			editArea.append(editEntry);
			
			editButton.click(function() {
				if (typeof editable.onShowEdit != 'undefined' && !editable.onShowEdit(user)) {
					return;
				}
				
				editable.element.hide();
				editArea.show();
				editArea.find('input').focus();
			});
			
			editArea.submit(function() {
				var newValue;
				switch(editable.type) {
					case 'password':
						newValue = editEntry.passwordEntry('value');
						break;
					case 'authorizations':
						newValue = editEntry.selectButton('value');
						editButton.html(editable.choices[newValue]);
						break;
					case 'boolean':
						newValue = editEntry.checkButton('value');
						break;
					case 'varchar':
					default:
						newValue = editEntry.textEntry('value');
						editButton.text(newValue || 'Vide');
				}
				
				editable.element.show();
				editArea.hide();
				
				editable.onEdit(user, newValue);
			});
			
			editable.element.html(editable.label).append(editButton);
			editArea.hide();
			editable.element.after(editArea);
		})(key, editables[key]);
	}
};

var disableUserEditFn = function() {
	editUser.hide();
	userBeingEdited = null;
};

var createUserFn = function() {
	var createUserWindow = $.w.window.dialog({
		title: 'Cr&eacute;ation d\'un utilisateur',
		parentWindow: confWindow,
		resizable: false
	});
	
	var form = $.w.entryContainer().appendTo(createUserWindow.window('content'));
	
	var checkFormFns = [];
	var checkFormFn = function() {
		for (var i = 0; i < checkFormFns.length; i++) {
			if (checkFormFns[i]() == false) {
				return false;
			}
		}
		return true;
	};
	
	var entries = {};
	
	for (var key in editables) {
		(function(key, editable) {
			var editEntry;
			switch(editable.type) {
				case 'password':
					editEntry = $.w.label();
					var newPassword = $.w.passwordEntry('Nouveau mot de passe :').appendTo(editEntry);
					$.w.label('Fiabilit&eacute; du mot de passe :').appendTo(editEntry);
					var passwordPowerIndicator = $.webos.progressbar().appendTo(editEntry);
					var verifNewPassword = $.w.passwordEntry('Confirmez le mot de passe :').appendTo(editEntry);
					
					newPassword.keyup(function() {
						var passwordPower = Webos.User.evalPasswordPower(newPassword.passwordEntry('value'));
						passwordPowerIndicator.progressbar('value', passwordPower);
					});
					
					checkFormFns.push(function() {
						if (Webos.User.evalPasswordPower(newPassword.passwordEntry('value')) == 0) {
							return false;
						}
						
						if (newPassword.passwordEntry('value') != verifNewPassword.passwordEntry('value')) {
							return false;
						}
					});
					
					entries[key] = newPassword;
					break;
				case 'authorizations':
					editEntry = $.w.selectButton(editable.label, editable.choices);
					entries[key] = editEntry;
					break;
				case 'varchar':
				default:
					editEntry = $.w.textEntry(editable.label);
					checkFormFns.push(function() {
						if (editEntry.textEntry('value').length == 0) {
							return false;
						}
					});
					entries[key] = editEntry;
			}
			
			form.append(editEntry);
		})(key, editables[key]);
	}
	
	var buttonContainer = $.w.buttonContainer().appendTo(form);
	$.webos.button('Annuler').click(function() {
		createUserWindow.window('close');
	}).appendTo(buttonContainer);
	var applyButton = $.webos.button('Valider', true).button('disabled', true).appendTo(buttonContainer);
	
	form.keyup(function() {
		if (checkFormFn() !== true) {
			applyButton.button('disabled', true);
		} else {
			applyButton.button('disabled', false);
		}
	}).submit(function() {
		if (checkFormFn() !== true) {
			return;
		}
		
		var data = {
			'username': entries.username.textEntry('value'),
			'realname': entries.realname.textEntry('value'),
			'password': entries.password.passwordEntry('value'),
			'email': entries.email.textEntry('value')
		};
		
		var authObject = W.Authorizations.models[entries.authorizations.selectButton('value')];
		if (typeof authObject == 'undefined') {
			authObject = {};
		}
		var auth = new W.Authorizations(authObject);
		
		createUserWindow.window('loading', true);
		
		W.User.create(data, auth, new W.Callback(function() {
			createUserWindow.window('close');
			refreshUsersListFn();
		}, function(response) {
			createUserWindow.window('loading', false);
			response.triggerError();
		}));
	});
	
	createUserWindow.window('open');
};

var refreshUsersListFn = function() {
	disableUserEditFn();
	usersList.list('content').empty();
	confWindow.window('loading', true);
	W.User.list(new W.Callback(function(list) {
		for (var id in list) {
			(function(user) {
				var item = $.w.listItem();
				var removeUserFn = function() {
					var confirm = $.w.window.confirm({
						parentWindow: confWindow,
						label: '&Ecirc;tes-vous s&ucirc;r de vouloir supprimer l\'utilisateur <em>'+user.getAttribute('username')+'</em> ?',
						confirm: function() {
							confWindow.window('loading', true);
							user.remove(new W.Callback(function() {
								confWindow.window('loading', false);
							}, function(response) {
								confWindow.window('loading', false);
								response.triggerError('Impossible de supprimer l\'utilisateur "'+user.getAttribute('username')+'"');
							}));
						}
					});
					confirm.window('open');
				};
				item.bind('listitemselect', function() {
					if (usersList.list('selection').length == 1) {
						enableUserEditFn(user);
					}
					removeButton.unbind('click').click(removeUserFn);
				}).bind('listitemunselect', function() {
					disableUserEditFn();
					removeButton.unbind('click');
				}).appendTo(usersList.list('content'));
				
				var column = item.listItem('column');
				
				$('<img />', { src: new W.Icon('stock/person'), 'class': 'userpicture' }).appendTo(column);
				var realname = $('<strong></strong>').text(user.get('realname')).appendTo(column);
				column.append('<br />');
				var username = $('<em></em>').text(user.get('username')).appendTo(column);
				
				user.unbind('update.users_list.users.gconf remove.users_list.users.gconf');
				user.bind('update.users_list.users.gconf', function(data) {
					switch (data.key) {
						case 'realname':
							realname.text(data.value);
							break;
						case 'username':
							username.text(data.value);
							break;
						case 'disabled':
							item.toggleClass('userdisabled', data.value);
							break;
					}
				});
				user.bind('remove.users_list.users.gconf', function() {
					if (item.listItem('active')) {
						disableUserEditFn();
						removeButton.unbind('click');
					}
					
					item.remove();
				});

				item.toggleClass('userdisabled', user.get('disabled'));
				
				if (user.isLogged()) {
					item.listItem('active', true);
				}
			})(list[id]);
		}
		
		confWindow.window('loading', false);
	}, function(response) {
		form.hide().after('<p>Impossible de r&eacute;cup&eacute;rer la liste des utilisateurs.</p>');
		confWindow.window('loading', false);
		response.triggerError('Impossible de r&eacute;cup&eacute;rer la liste des utilisateurs.');
	}));
};

refreshUsersListFn();