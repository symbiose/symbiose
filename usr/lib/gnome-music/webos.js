Webos.require([
	'/usr/lib/webos/md5.js', //LastFM requires MD5
	'/usr/lib/lastfm/lastfm.js'
], function () {
	if (window.GnomeMusic) {
		return;
	}

	var GnomeMusic = function (options) {
		var that = this;
		options = options || {};

		Webos.Observable.call(this);

		this.bind('translationsloaded', function () {
			this._init(function () {
				if (options.file) {
					that.playFile(options.file);
				}
			});
		});

		Webos.TranslatedLibrary.call(this);
	};
	GnomeMusic.prototype = {
		_tree: [],
		_tracks: [],
		_albumsCovers: {},
		_isPlaying: false,
		_nowPlayingTrack: '',
		_nowPlayingData: null,
		_translationsName: 'gnome-music',
		_init: function (callback) {
			var that = this, t = this._translations;
			callback = Webos.Callback.toCallback(callback);

			W.xtag.loadUI('/usr/share/templates/gnome-music/main.html', function(mainWindow) {
				that._window = $(mainWindow);

				that._window
					.window('option', 'stylesheet', '/usr/share/css/gnome-music/main.css')
					.window('open');

				that._initEvents();
				that._translateUi();
				that._buildLastfm();

				that._buildTree(function() {
					that._parseTree();
					that.displayAlbums();

					callback.success();
				});
			});
		},
		_translateUi: function() {
			var that = this, t = this._translations;

			var $translatables = this._window.find(
				'.back-btn-ctn .btn-back,'+
				'.tabs-btn-ctn .tab-btn-albums,'+
				'.tabs-btn-ctn .tab-btn-artists,'+
				'.tabs-btn-ctn .tab-btn-tracks'
			);

			$translatables.each(function() {
				$(this).html(t.get($(this).html()));
			});
		},
		_initEvents: function () {
			var that = this, t = this._translations;

			this._window.find('.btn-back').click(function () {
				that.displayAlbums();
			});

			this._window.find('.tab-btn-albums').click(function () {
				that.displayAlbums();
			});
			this._window.find('.tab-btn-artists').click(function () {
				that.displayArtists();
			});
			this._window.find('.tab-btn-tracks').click(function () {
				that.displayTracks();
			});

			this._window.find('.now-playing .now-playing-btns .btn-previous').click(function () {
				that.previous();
			});
			this._window.find('.now-playing .now-playing-btns .btn-play').click(function () {
				if (that.isPlaying()) {
					that.pause();
				} else {
					that.play();
				}
			});
			this._window.find('.now-playing .now-playing-btns .btn-next').click(function () {
				that.next();
			});

			this._window.find('.now-playing .now-playing-info .album-cover').click(function () {
				that.showAlbum(that._nowPlayingTrack);
			});
			this._window.find('.now-playing .now-playing-info .track-artist').click(function () {
				//that.showArtist(that._parsePath(that._nowPlayingTrack).artist);
			});
			this._window.find('.now-playing .now-playing-info .track-title').click(function () {
				that.showAlbum(that._nowPlayingTrack);
			});

			this.player().on('ended', function () {
				that.next();
			});
			this.player().on('timeupdate', function () {
				that._updatePlayingTime();
			});
			this.player().on('error', function (e) {
				W.Error.trigger(t.get('Error when trying to play the audio file'));
			});
		},
		player: function () {
			return this._window.find('.now-playing .now-playing-audio');
		},
		_buildTree: function (callback) {
			var that = this, t = this._translations;
			var tree = [];
			callback = Webos.Callback.toCallback(callback);

			var rootMusicPath = '~/'+t.get('Music'),
				rootMusicDir = Webos.File.get(rootMusicPath, { is_dir: true });

			that._window.window('loading', true, {
				lock: false
			});

			var scanDir = function(dir, callback) {
				var dirOp = new Webos.Operation();
				dirOp.addCallbacks(callback);

				dir.getContents([function (contents) {
					var nbrDirs = 0, completedDirs = 0;

					for (var i = 0; i < contents.length; i++) {
						var file = contents[i];

						if (file.get('is_dir')) {
							nbrDirs++;
							var subdirOp = scanDir(file, [function() {}, function(resp) {}]);
							subdirOp.on('complete', function () {
								completedDirs++;
								if (nbrDirs == completedDirs) {
									dirOp.setCompleted();
								}
							});
						} else if (/^audio\//.test(file.get('mime_type'))) {
							tree.push(file);
						}
					}

					if (nbrDirs == 0) {
						dirOp.setCompleted();
					}
				}, function(resp) {
					dirOp.setCompleted(resp);
				}]);

				return dirOp;
			};

			return scanDir(rootMusicDir, [function () {
				that._tree = tree;

				that._window.window('loading', false);

				callback.success();
			}, function(resp) {
				that._window.window('loading', false);
				callback.error(resp);
			}]);
		},
		_parseTree: function () {
			var that = this, t = this._translations;
			var tracks = [], tree = this._tree;

			var rootMusicPath = '~/'+t.get('Music');

			for (var i = 0; i < tree.length; i++) {
				var file = tree[i];

				var track = {
					file: file,
					title: file.get('filename'),
					album: '',
					artist: '',
					path: '',
					albumPath: ''
				};

				if (file.get('dirname') != rootMusicPath) {
					var dirname = file.get('dirname');

					if (dirname.indexOf(rootMusicPath) === 0) {
						var relativePath = dirname.substr(rootMusicPath.length + 1);

						var dirnames = relativePath.split('/');
						if (dirnames.length == 2) {
							track.artist = dirnames[0];
							track.album = dirnames[1];
						}
					}
				}

				track.albumPath = track.artist+'/'+track.album;
				track.path = track.albumPath+'/'+track.title;

				tracks.push(track);
			}

			tracks.sort(function (a, b) {
				if (a.title < b.title) {
					return -1;
				}
				if (a.title > b.title) {
					return 1;
				}
				return 0;
			});

			this._tracks = tracks;
		},
		_buildLastfm: function () {
			this._lastfm = new LastFM({
				apiKey    : 'cc9bc03b2209f344204cda5642aa2959',
				apiSecret : 'e62159edea7dc9fadcac219d85b389d9'
			});
		},
		_parsePath: function (path) {
			var parts = path.split('/');

			return {
				artist: parts[0] || '',
				album: parts[1] || '',
				title: parts[2] || ''
			};
		},
		_buildPath: function (data, allFields) {
			if (allFields) {
				data = $.extend({
					artist: '',
					album: '',
					title: ''
				}, data);
			}

			var path = data.artist;

			if (typeof data.album != 'undefined') {
				path += '/'+data.album;
			}
			if (typeof data.title != 'undefined') {
				path += '/'+data.title;
			}

			return path;
		},
		_loadAlbumCover: function (path, callback) {
			var that = this, t = this._translations;
			callback = Webos.Callback.toCallback(callback);

			var albumData = this._parsePath(path),
				albumPath = this._buildPath({
					artist: albumData.artist,
					album: albumData.album
				});

			if (this._albumsCovers[albumPath]) {
				callback.success(this._albumsCovers[albumPath]);
				return;
			}

			var albumData = this._parsePath(albumPath);

			this._lastfm.album.getInfo({
				artist: albumData.artist,
				album: albumData.album
			}, {
				success: function (data) {
					var albumData = data.album,
						covers = albumData.image,
						coversUrls = {};
					for (var i = 0; i < covers.length; i++) {
						var cover = covers[i];
						if (cover['#text']) {
							coversUrls[cover.size] = cover['#text'];
						}
					}

					if (Object.keys(coversUrls).length) {
						that._albumsCovers[albumPath] = coversUrls;
						callback.success(coversUrls);
					} else {
						callback.error();
					}
				},
				error: function () {
					callback.error();
				}
			});
		},
		_showView: function(newView) {
			var $views = this._window.find('.tabs-content > div'),
				$newView = $views.filter('.tab-'+newView);

			$views.hide();
			$newView.show();

			if (newView == 'albums-details') {
				this._window.find('.back-btn-ctn').show();
				this._window.find('.tabs-btn-ctn').hide();
			} else {
				this._window.find('.back-btn-ctn').hide();
				this._window.find('.tabs-btn-ctn').show();
			}

			var $tabs = this._window.find('.tabs-btn-ctn > x-button'),
				$newTab = $tabs.filter('.tab-btn-'+newView);

			$tabs.button('option', 'activated', false);
			$newTab.button('option', 'activated', true);
		},
		displayAlbums: function() {
			var that = this, t = this._translations;
			var tracks = this._tracks,
				albums = [];

			this._showView('albums');
			this._window.window('option', 'title', t.get('Music'));

			if (this._albumsDisplayed) {
				return;
			}

			var $albums = this._window.find('.tab-albums ul'),
				$albumTpl = this._window.find('.templates .album');

			$albums.empty();

			for (var i = 0; i < tracks.length; i++) {
				(function (track) {
					if (~$.inArray(track.albumPath, albums)) {
						//...
					} else {
						var $album = $('<li></li>').html($albumTpl.clone());

						$album.find('.album-title').text(track.album || t.get('Unknown'));
						$album.find('.album-artist').text(track.artist || t.get('Unknown'));

						if (track.artist && track.album) {
							that._loadAlbumCover(track.albumPath, [function (coversUrls) {
								$album.find('.album-cover').attr('src', coversUrls['large']);
							}, function() {}]);
						}

						$album.click(function () {
							that.showAlbum(track.albumPath);
						});

						$albums.append($album);
						albums.push(track.albumPath);
					}
				})(tracks[i]);
			}

			this._albumsDisplayed = true;
		},
		showAlbum: function (path) {
			var that = this, t = this._translations;

			var $album = this._window.find('.tab-albums-details'),
				$albumTpl = this._window.find('.templates .album-details');

			$album.html($albumTpl.html());
			var $tracks = $album.find('.album-tracks ul');

			var albumData = this._parsePath(path),
				albumPath = this._buildPath({
					artist: albumData.artist,
					album: albumData.album
				});
			$album.find('.album-title').text(albumData.album || t.get('Unknown'));
			$album.find('.album-artist').text(albumData.artist || t.get('Unknown'));
			if (albumData.album) {
				this._window.window('option', 'title', albumData.album);
			}

			for (var i = 0; i < this._tracks.length; i++) {
				(function (track) {
					if (track.albumPath != albumPath) {
						return;
					}

					var $track = $('<li></li>').text(track.title);

					$track.click(function () {
						that._nowPlayingData = {
							artist: albumData.artist,
							album: albumData.album
						};
						that.playTrack(track.path);
					});

					$tracks.append($track);
				})(this._tracks[i]);
			}

			this._loadAlbumCover(albumPath, [function (coversUrls) {
				$album.find('.album-cover').attr('src', coversUrls['extralarge']);
			}, function() {}]);

			this._showView('albums-details');
		},
		displayArtists: function () {
			var that = this, t = this._translations;
			var artists = {};

			var $artists = this._window.find('.tab-artists'),
				$artistTpl = this._window.find('.templates .artist'),
				$artistAlbumTpl = this._window.find('.templates .artist-album');

			$artists.empty();

			for (var i = 0; i < this._tracks.length; i++) {
				(function (track) {
					if (!artists[track.artist]) {
						artists[track.artist] = {};
					}
					if (!artists[track.artist][track.album]) {
						artists[track.artist][track.album] = [];
					}

					artists[track.artist][track.album].push(track);
				})(this._tracks[i]);
			}

			for (var artist in artists) {
				var albums = artists[artist];

				var $artist = $artistTpl.clone();
				$artist.find('.artist-name').text(artist || t.get('Unknown'));

				var $albums = $artist.find('.artist-albums');

				for (var album in albums) {
					(function (album, tracks) {
						var albumPath = that._buildPath({
							artist: artist,
							album: album
						});

						var $album = $artistAlbumTpl.clone();
						$album.find('.album-title').text(album || t.get('Unknown'));

						var $tracks = $album.find('.album-tracks');

						for (var i = 0; i < tracks.length; i++) {
							(function (track) {
								var $track = $('<li></li>').text(track.title);
								$track.click(function () {
									that._nowPlayingData = {
										artist: track.artist
									};
									that.playTrack(track.path);
								});
								$tracks.append($track);
							})(tracks[i]);
						}

						that._loadAlbumCover(albumPath, [function (coversUrls) {
							$album.find('.album-cover').attr('src', coversUrls['large']).show();
						}, function() {}]);

						$album.find('.album-cover').click(function () {
							that.showAlbum(albumPath);
						});

						$albums.append($album);
					})(album, albums[album]);
				}

				$artists.append($artist);
			}

			this._showView('artists');
		},
		displayTracks: function () {
			var that = this, t = this._translations;
			var tracks = this._tracks;

			var $tracks = this._window.find('.tab-tracks table tbody');

			this._showView('tracks');
			this._window.window('option', 'title', t.get('Music'));

			for (var i = 0; i < tracks.length; i++) {
				(function (track) {
					var $track = $('<tr></tr>');

					$track.append('<td class="track-title">'+track.title+'</td>');
					$track.append('<td class="track-artist">'+(track.artist || t.get('Unknown'))+'</td>');
					$track.append('<td class="track-album">'+(track.album || t.get('Unknown'))+'</td>');

					$track.click(function () {
						that._nowPlayingData = {};
						that.playTrack(track.path);
					});

					$tracks.append($track);
				})(tracks[i]);
			}
		},
		playTrack: function (trackPath) {
			var that = this, t = this._translations;
			var $nowPlaying = this._window.find('.now-playing'),
				$player = this.player();
			var trackData = this._parsePath(trackPath);

			$nowPlaying.find('.track-title').text(trackData.title);
			$nowPlaying.find('.track-artist').text(trackData.artist || t.get('Unknown'));

			$nowPlaying.find('.album-cover').hide();
			this._loadAlbumCover(trackPath, [function (coversUrls) {
				$nowPlaying.find('.album-cover').attr('src', coversUrls['small']).show();
			}, function() {}]);

			for (var i = 0; i < this._tracks.length; i++) {
				var track = this._tracks[i];
				
				if (track.path == trackPath) {
					break;
				} else {
					delete track;
				}
			}

			if (track) {
				$player.attr('src', track.file.get('realpath'));
				this._nowPlayingTrack = trackPath;
				this.play();
			}
		},
		playFile: function(file) {
			var that = this, t = this._translations;
			file = Webos.File.get(file);

			var $nowPlaying = this._window.find('.now-playing'),
				$player = this.player();

			$nowPlaying.find('.track-title').text(file.get('filename'));
			$nowPlaying.find('.track-artist').text(t.get('Unknown'));
			$nowPlaying.find('.album-cover').hide();

			Webos.File.load(file.get('path'), [function(file) {
				if (!/^audio\//.test(file.get('mime_type'))) {
					Webos.Error.trigger('Unsupported file type "'+file.get('path')+'"');
				}

				$player.attr('src', file.get('realpath'));
				that._nowPlayingTrack = that._buildPath({
					title: file.get('filename')
				});
				that.play();
			}, function(resp) {
				Webos.Error.trigger('Cannot access to file "'+file.get('path')+'"');
			}]);
		},
		isPlaying: function() {
			return this._isPlaying;
		},
		nowPlayingTrack: function() {
			return this._nowPlayingTrack;
		},
		_updatePlayingTime: function() {
			var $timeCtn = this._window.find('.now-playing-time'),
				$progress = $timeCtn.find('.time-progress'),
				$count = $timeCtn.find('.time-count'),
				$player = this.player();

			var formatUnit = function(nbr) {
				nbr = String(nbr);
				return (nbr.length == 1) ? '0'+nbr : nbr;
			};
			var formatTime = function (time) {
				var date = new Date(time * 1000);

				var formatted = formatUnit(date.getMinutes())+':'+formatUnit(date.getSeconds());

				return formatted;
			};

			var currentTime = $player[0].currentTime,
				duration = $player[0].duration,
				count = formatTime(currentTime);

			if (duration) {
				var ratio = currentTime / duration;
				$progress.show().progressbar('option', 'value', ratio * 100);

				count += ' / '+formatTime(duration);
			} else {
				$progress.hide();
			}
			
			$count.html(count);
		},
		play: function () {
			this.player()[0].play();

			this._isPlaying = true;

			this._window.find('.player').removeClass('player-stopped');
			this._window.find('.now-playing .now-playing-btns .btn-play').button('option', 'activated', true);
		},
		pause: function () {
			this.player()[0].pause();

			this._isPlaying = false;

			this._window.find('.now-playing .now-playing-btns .btn-play').button('option', 'activated', false);
		},
		stop: function() {
			this.pause();

			this._window.find('.player').addClass('player-stopped');
		},
		goTo: function(offset) {
			if (!this.nowPlayingTrack()) {
				return;
			}

			var playlist = [];

			var playingTrack = this.nowPlayingTrack(),
				playlistData = this._nowPlayingData;

			for (var i = 0; i < this._tracks.length; i++) {
				var track = this._tracks[i];
				
				var keep = true;
				for (var attr in playlistData) {
					if (playlistData[attr] != track[attr]) {
						keep = false;
						break;
					}
				}

				if (keep) {
					playlist.push(track);
				}
			}

			var playingIndex = -1;
			for (var i = 0; i < playlist.length; i++) {
				var track = playlist[i];

				if (track.path == playingTrack) {
					playingIndex = i;
					break;
				}
			}

			if (!~playingIndex) {
				return;
			}

			var newIndex = (playingIndex + offset) % playlist.length;
			if (newIndex < 0) {
				newIndex += playlist.length;
			}

			var newTrack = playlist[newIndex];

			this.playTrack(newTrack.path);
		},
		previous: function () {
			this.goTo(-1);
		},
		next: function () {
			this.goTo(1);
		}
	};

	Webos.inherit(GnomeMusic, Webos.Observable);
	Webos.inherit(GnomeMusic, Webos.TranslatedLibrary);

	GnomeMusic.open = function (options) {
		return new GnomeMusic(options);
	};

	window.GnomeMusic = GnomeMusic; // Export API
});