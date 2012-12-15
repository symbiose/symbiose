/**
 * Lecteur multimedia Intermezzo.
 * @author Doppelganger & $imon
 * @version 2.0
 */
new W.ScriptFile('usr/lib/intermezzo/jquery.jplayer.min.js');
new W.ScriptFile('usr/lib/webos/fullscreen.js');
new W.Stylesheet('usr/share/css/intermezzo/main.css');

$.webos.widget('intermezzo', 'container', {
	_name: 'intermezzo',
	options: {
		file: undefined
	},
	_translationsName: 'intermezzo',
	_create: function() {
		this._super('_create');

		if (Webos.isInstanceOf(this.options.file, W.File)) {
			this.open(this.options.file);
		} else {
			this.loadEmpty();
		}
	},
	_loadProfile: function(type, callback) {
		callback = Webos.Callback.toCallback(callback);
		var that = this, t = this.translations();
		
		if (!type) {
			callback.error(new Webos.Callback.Result.error(t.get('Unknown driver')));
			return;
		}
		
		this.options.type = type;
		
		$.ajax({
			url: 'usr/lib/intermezzo/html/'+type+'.html',
			success: function(response) {
				that.element.html(response);
				callback.success();
				that._trigger('loadprofile');
			},
			error: function() {
				callback.error(new Webos.Callback.Result.error(t.get('Can\'t load media player\'s profile "${type}"', { type: type })));
			}
		});
	},
	_initPlayer: function(supplied, userCallback) {
		var that = this, t = this.translations();

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
					if (Webos.fullscreen.support) {
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
					if (Webos.fullscreen.support) {
						Webos.fullscreen.cancel();
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
				var mess = t.get('An error has occurred with the multimedia player jPlayer');
				switch (e.jPlayer.error.type) {
					case $.jPlayer.error.FLASH:
						mess = t.get('An error occurred while inserting the video with Flash plugin');
						break;
					case $.jPlayer.error.FLASH_DISABLED:
						mess = t.get('An error has occurred with the Flash plugin, which has been disabled');
						break;
					case $.jPlayer.error.NO_SOLUTION:
						mess = t.get('Can\'t read the media, your browser is outdated');
						break;
					case $.jPlayer.error.NO_SUPPORT:
						mess = t.get('Can\'t read the media, file format not supported');
						break;
					case $.jPlayer.error.URL:
						mess = t.get('Can\'t read the media, the file path is invalid');
						break;
					case $.jPlayer.error.URL_NOT_SET:
						return;
						break;
					case $.jPlayer.error.VERSION:
						mess = t.get('Your Javascript and Flash version is not supported');
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
			filepath = this.options.file.get('realpath');
		
		switch (this.options.file.get('extension')) { // selon les types MIME, on cré une playlist différente
			case 'mp3':
				fileObject = {
					mp3: filepath
				};
				supplied = "mp3";
				type = 'audio';
			break;
			case 'oga':
				fileObject = {
					oga: filepath
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
					mp4: filepath
				};
				supplied = "m4v";
				type = 'video';
			break;
			case 'm4v':
				fileObject = {
					m4v: filepath
				};
				supplied = "m4v";
				type = 'video';
			break;
			case 'm4a':
				fileObject = {
					m4a: filepath
				};
				supplied = "m4a";
				type = 'audio';
			break;
			case 'wav':
				fileObject = {
					wav: filepath
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
		
		var that = this, t = this.translations();
		
		this._loadProfile(type, function() {
			if (!supported) {
				W.Error.trigger(t.get('Can\'t open file "${basename}"', { basename: that.options.file.get('basename') }), t.get('Unsupported file type'));
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
$.webos.intermezzo = function(options) {
	return $('<div></div>').intermezzo(options);
};

// Application sous forme de classe
window.IntermezzoWindow = function IntermezzoWindow(options) {
	Webos.Observable.call(this);

	options = options || {};
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;

		this.window = $.w.window({
			title : t.get('Intermezzo multimedia player'),
			icon: new W.Icon('applications/intermezzo')
		});
		
		var headers = this.window.window('header');
		
		this._menu = $.w.menuWindowHeader().appendTo(headers);
		
		var fileItem = $.w.menuItem(t.get('File')).appendTo(this._menu);
		fileItemContent = fileItem.menuItem('content');
		
		$.w.menuItem(t.get('Open'))
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
		
		$.w.menuItem(t.get('Quit'))
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
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
};
IntermezzoWindow.prototype = {
	_translationsName: 'intermezzo'
};
Webos.inherit(IntermezzoWindow, Webos.Observable);
Webos.inherit(IntermezzoWindow, Webos.TranslatedLibrary);