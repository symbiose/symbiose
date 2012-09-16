/**
 * Lecteur multimedia Intermezzo.
 * @author Doppelganger & $imon
 * @version 2.0
 */
new W.ScriptFile('usr/lib/intermezzo/jquery.jplayer.min.js');
new W.ScriptFile('usr/lib/webos/fullscreen.js');
new W.Stylesheet('usr/share/css/intermezzo/main.css');

var intermezzoProperties = $.webos.extend(containerProperties, {
	_name: 'intermezzo',
	options: {
		file: undefined
	},
	_create: function() {
		if (this.options.file instanceof W.File) {
			this.open(this.options.file);
		} else {
			this.loadEmpty();
		}
	},
	_loadProfile: function(type, callback) {
		var that = this;
		
		if (typeof type == 'undefined') {
			W.Error.trigger('Profil du lecteur inconnu');
		}
		
		this.options.type = type;
		
		$.ajax({
			url: 'usr/lib/intermezzo/html/'+type+'.html',
			success: function(response) {
				that.element.html(response);
				if (typeof callback != 'undefined') {
					callback();
				}
				that._trigger('loadprofile');
			},
			error: function() {
				W.Error.trigger('Impossible de charger le profil "'+type+'" du lecteur');
			}
		});
	},
	_initPlayer: function(supplied, userCallback) {
		var that = this;
		
		this.options._components.player = this.element.find('.jp-jplayer').jPlayer({
			swfPath: 'usr/lib/intermezzo/swf',
			supplied: supplied,
			solution: 'html,flash',
			cssSelectorAncestor: '#'+that.element.attr('id')+' .jp-'+that.options.type,
			ready: function() {
				var hideCursorTimeout, mousePosition = [];
				var cursorTimeoutFn = function(e) {
					that.element.find('.jp-video .jp-jplayer').addClass('cursor-none');
					hideCursorTimeout = undefined;
				};
				var mousemoveFn = function(e) {
					if (typeof mousePosition != 'undefined') {
						if (mousePosition[0] == e.pageX && mousePosition[1] == e.pageY) {
							return;
						}
					}
					if (typeof hideCursorTimeout != 'undefined') {
						 clearTimeout(hideCursorTimeout);
					}
					that.element.find('.jp-video .jp-jplayer').removeClass('cursor-none');
					hideCursorTimeout = setTimeout(cursorTimeoutFn, 5000);
					
					mousePosition = [e.pageX, e.pageY];
				};
				
				hideCursorTimeout = setTimeout(cursorTimeoutFn, 5000);
				that.element.find('.jp-video .jp-jplayer').mousemove(mousemoveFn);
				
				that.element.find('.jp-full-screen').click(function() {
					if (fullScreenApi.supportsFullScreen) {
						if (fullScreenApi.isFullScreen()) {
							fullScreenApi.cancelFullScreen();
						}
						that.element.find('.jp-video').requestFullScreen();
					} else {
						$('#header').animate({
							top: '-=25px'
						});
						$('#footer').animate({
							bottom: '-=25px'
						});
					}
				});
				
				that.element.find('.jp-restore-screen').click(function() {
					if (fullScreenApi.supportsFullScreen) {
						fullScreenApi.cancelFullScreen();
					} else {
						$('#header').animate({
							top: '+=25px'
						});
						$('#footer').animate({
							bottom: '+=25px'
						});
					}
				});
				
				that._trigger('ready');
				
				if (typeof userCallback != 'undefined') {
					userCallback();
				}
			},
			error: function(e) {
				var mess = 'Une erreur est survenue avec le lecteur multim&eacute;dia jPlayer';
				switch (e.jPlayer.error.type) {
					case $.jPlayer.error.FLASH:
						mess = 'Une erreur est survenue lors de l\'insertion de la vid&eacute;o avec le greffon Flash';
						break;
					case $.jPlayer.error.FLASH_DISABLED:
						mess = 'Une erreur est survenue avec le greffon Flash, qui a &eacute;t&eacute; d&eacute;sactiv&eacute;';
						break;
					case $.jPlayer.error.NO_SOLUTION:
						mess = 'Impossible de lire le m&eacute;dia, votre navigateur Internet n\'est pas &agrave; jour';
						break;
					case $.jPlayer.error.NO_SUPPORT:
						mess = 'Impossible de lire le m&eacute;dia, le format du fichier n\'est pas support&eacute;';
						break;
					case $.jPlayer.error.URL:
						mess = 'Impossible de lire le m&eacute;dia, le chemin vers le fichier est invalide';
						break;
					case $.jPlayer.error.URL_NOT_SET:
						return;
						break;
					case $.jPlayer.error.VERSION:
						mess = 'Votre version de Javascript et de Flash n\'est pas support&eacute;e';
						break;
				}
				W.Error.trigger(mess, e.jPlayer.error.message+"\n"+e.jPlayer.error.hint);
			}
		});		
	},
	play: function() {
		this.player().jPlayer('play');
	},
	open: function(file) {
		this.options.file = file;
		if (typeof this.options.file == 'undefined') {
			return;
		}
		var supported = true,
			fileObject = {},
			type = 'audio',
			supplied = '',
			filepath = this.options.file.getAttribute('realpath');
		
		switch (this.options.file.getAttribute('extension')) { // selon les types MIME, on cré une playlist différente
			case 'mp3':
				fileObject = {
					mp3: filepath
				};
				supplied = "mp3";
				type = 'audio';
			break;
			case 'oga':
				fileObject = {
					oga:filepath
				};
				supplied = "oga";
				type = 'audio';
			break;
			case 'ogg':
				fileObject = {
					ogv: filepath
				};
				supplied = "ogv";
				type = 'video';
			break;
			case 'ogv':
				fileObject = {
					ogv: filepath
				};
				supplied = "ogv";
				type = 'video';
			break;
			case 'mp4':
				fileObject = {
					mp4:filepath
				};
				supplied = "m4v";
				type = 'video';
			break;
			case 'm4v':
				fileObject = {
					m4v:filepath
				};
				supplied = "m4v";
				type = 'video';
			break;
			case 'm4a':
				fileObject = {
					m4a:filepath
				};
				supplied = "m4a";
				type = 'audio';
			break;
			case 'wav':
				fileObject = {
					wav:filepath
				};
				supplied = "wav";
			break;
			case 'webma':
				fileObject = {
					webma:filepath
				};
				supplied = "webma";
				type = 'audio';
			break;
			case 'webmv':
				fileObject = {
					webmv:filepath
				};
				supplied = "webmv";
				type = 'video';
			break;
			case 'webm':
				fileObject = {
					webmv:filepath
				};
				supplied = "webmv";
				type = 'video';
			break;
			default:
				supported = false;
		}
		
		this.options.type = type;
		
		var that = this;
		
		this._loadProfile(type, function() {
			if (!supported) {
				W.Error.trigger('Impossible d\'ouvrir le fichier "'+that.options.file.getAttribute('basename')+'"', 'Ce type de fichier n\'est pas support&eacute;');
				that.loadEmpty();
				return;
			}
			
			that._initPlayer(supplied, function() {
				that.player()
					.jPlayer('setMedia', fileObject)
					.jPlayer('play');
				that._trigger('play');
			});
		});
	},
	loadEmpty: function(callback) {
		var that = this;
		
		this._loadProfile('audio', function() {
			that._initPlayer('mp3', callback);
		});
	},
	player: function() {
		return this.options._components.player;
	}
});
$.widget('webos.intermezzo', intermezzoProperties);

$.webos.intermezzo = function(options) {
	return $('<div></div>').intermezzo(options);
};

// Application sous forme de classe
function IntermezzoWindow(options) {
	this.window = $.w.window({
		title : 'Lecteur audio et vid&eacute;o Intermezzo',
		icon: new W.Icon('applications/intermezzo')
	});
	var that = this;
	
	var headers = this.window.window('header');
	
	this._menu = $.w.menuWindowHeader().appendTo(headers);
	
	var fileItem = $.w.menuItem('Fichier').appendTo(this._menu);
	fileItemContent = fileItem.menuItem('content');
	
	$.w.menuItem('Ouvrir')
		.click(function() {
			new NautilusFileSelectorWindow({
				parentWindow: that.window
			}, function(files) {
				if (files.length) {
					that.player.intermezzo('open', files[0]);
				}
			});
		})
		.appendTo(fileItemContent);
	
	$.w.menuItem('Quitter')
		.click(function() {
			that.window.window('close');
		})
		.appendTo(fileItemContent);

	this.player = $.webos.intermezzo({
		file: options.file
	});
	
	var resizeFn = function() {
		var windowsContent = that.window.window('content'),
			windowsWidth = windowsContent.innerWidth(),
			cssClass;
		
		if (windowsWidth < 480) {
			cssClass = '';
		} else if (windowsWidth < 640) {
			cssClass = 'jp-video-270p';
		} else {
			cssClass = 'jp-video-360p';
		}
		that.player.intermezzo('player').jPlayer('option', 'size', { cssClass: cssClass });
	};
	
	this.window.bind('windowresize', resizeFn);

	this.player.appendTo(this.window.window('content'));
	
	this.window.window('open');
	
	this.player.bind('intermezzoloadprofile', function() {
		that.window.window('center');
	});
	
	resizeFn();
}