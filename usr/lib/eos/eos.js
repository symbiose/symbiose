/**
 * Visionneuse d'images Eye Of Symbiose.
 * @version 1.3.1
 * @author $imon
 */

new W.ScriptFile('usr/lib/webos/jquery.transit.min.js');

function EyeOfSymbiose(image) {
	Webos.Observable.call(this);
	
	this.bind('translationsloaded', function() {
		var that = this, t = this._translations;
		
		this.window = $.w.window.main({
			title: t.get('Image viewer'),
			icon: new W.Icon('applications/eos'),
			width: 500,
			height: 300,
			stylesheet: 'usr/share/css/eos/main.css'
		});
		
		this.zoom = 1;
		
		this.open = function(image, userCallback) {
			userCallback = W.Callback.toCallback(userCallback);
			
			image = W.File.get(image);
			
			if (this.file && this.file.get('path') == image.get('path')) {
				return;
			}
			
			this.file = image;
			this.window.window('loading', true);
			this.window.window('option', 'title', image.getAttribute('basename')+' - '+t.get('Image viewer'));
			
			this.loadingImage = new W.LoadImage({
				images: image.getAttribute('realpath'),
				callback: function(data) {
					delete that.loadingImage;
					if (data.IsEnd) {
						that.image.attr('src', image.getAttribute('realpath'));
						that.window.window('loading', false);
						that.windowsSize();
						userCallback.success(that);
					} else {
						that.window.window('loading', false);
						userCallback.error(data);
					}
				}
			});
		};
		
		this.imageTo = function(position) {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			this._getImagesInDir(new W.Callback(function(images) {
				if (position == -1) {
					position = images.length - 1;
				}
				
				if (!images[position]) {
					return;
				}
				
				that.open(images[position]);
			}));
		};
		this.imageBy = function(position) {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			this._getImagesInDir(new W.Callback(function(images) {
				for (var i = 0; i < images.length; i++) {
					if (images[i].get('path') == that.file.get('path')) {
						break;
					}
				}
				var imageIndex = i + position;
				if (imageIndex >= images.length) {
					imageIndex -= images.length;
				}
				if (imageIndex < 0) {
					imageIndex += images.length;
				}
				that.open(images[imageIndex]);
			}));
		};
		
		this.previousImage = function() {
			this.imageBy(-1);
		};
		this.nextImage = function() {
			this.imageBy(1);
		};
		this.firstImage = function() {
			this.imageTo(0);
		};
		this.lastImage = function() {
			this.imageTo(-1);
		};
		this.randomImage = function() {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			this._getImagesInDir(new W.Callback(function(images) {
				var pos = Math.round((images.length - 1) * Math.random());
				that.imageTo(pos);
			}));
		};
		
		this._getImagesInDir = function(userCallback) {
			if (typeof this.file == 'undefined') {
				userCallback.error(response);
				return;
			}
			
			var dir = this.file.getAttribute('dirname');
			
			if (!dir) {
				userCallback.success([this.file]);
				return;
			}
			
			if (typeof this.imagesInDir == 'undefined') {
				var callback = new W.Callback(function(files) {
					var images = [];
					for (var i = 0; i < files.length; i++) {
						if (jQuery.inArray(files[i].getAttribute('extension'), EyeOfSymbiose.supported) != -1) {
							images.push(files[i]);
						}
					}
					that.imagesInDir = images;
					userCallback.success(images);
				}, function(response) {
					userCallback.error(response);
				});
				
				W.File.listDir(dir, callback);
			} else {
				userCallback.success(that.imagesInDir);
			}
		};
		
		this.zoomTo = function(value) {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			var dimentions = {
				width: that.image.width(),
				height: that.image.height()
			};
			this.zoom = value;
			this.image
				.width(dimentions.width)
				.height(dimentions.height)
				.css({
					transformOrigin: 'center center'
				})
				.transition({
					scale: value,
					x: dimentions.width / (value * 100), // But why does it work ? xD
					y: dimentions.height / (value * 100) // Why 100 ?
				});
		};
		
		this.zoomIn = function() {
			this.zoomTo(this.zoom * 1.2);
		};
		
		this.zoomOut = function() {
			this.zoomTo(this.zoom / 1.2);
		};
		
		this.realSize = function() {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			this._buttons.windowsSize.toolbarWindowHeaderItem('option', 'active', false);
			this.zoomTo(1);
			this.image.css({
				'width': 'auto',
				'height': 'auto',
				'max-width': 'none',
				'max-height': 'none'
			});
		};
		
		this.windowsSize = function() {
			if (typeof this.file == 'undefined') {
				return;
			}
			
			this._buttons.windowsSize.toolbarWindowHeaderItem('option', 'active', true);
			this.zoomTo(1);
			this.image.css({
				'width': 'auto',
				'height': 'auto',
				'max-width': '100%',
				'max-height': '99%'
			});
		};
		
		this.openAboutWindow = function() {
			$.w.window.about({
				name: t.get('Image viewer'),
				version: '1.3.1',
				description: t.get('GNOME\'s image viewer.'),
				author: '$imon',
				icon: new W.Icon('applications/eos')
			}).window('open');
		};
		
		var headers = this.window.window('header');
		
		var menu = $.w.menuWindowHeader().appendTo(headers);
		this._menus = {};
		
		var imageItem = $.w.menuItem(t.get('File')).appendTo(menu);
		imageItemContent = imageItem.menuItem('content');
		
		$.w.menuItem(t.get('Open...'))
			.click(function() {
				new NautilusFileSelectorWindow({
					parentWindow: that.window
				}, function(files) {
					if (files.length) {
						that.open(files[0]);
					}
				});
			})
			.appendTo(imageItemContent);
		
		$.w.menuItem(t.get('Quit'), true)
			.click(function() {
				that.window.window('close');
			})
			.appendTo(imageItemContent);
		
		var viewItem = $.w.menuItem(t.get('View')).appendTo(menu);
		viewItemContent = viewItem.menuItem('content');
		
		$.w.menuItem(t.get('Zoom in'))
			.click(function() {
				that.zoomIn();
			})
			.appendTo(viewItemContent);
		$.w.menuItem(t.get('Zoom out'))
			.click(function() {
				that.zoomOut();
			})
			.appendTo(viewItemContent);
		$.w.menuItem(t.get('Original size'), true)
			.click(function() {
				that.realSize();
			})
			.appendTo(viewItemContent);
		$.w.menuItem(t.get('Ideal size'))
			.click(function() {
				that.windowsSize();
			})
			.appendTo(viewItemContent);
		
		var gotoItem = $.w.menuItem(t.get('Go to')).appendTo(menu);
		gotoItemContent = gotoItem.menuItem('content');
		
		$.w.menuItem(t.get('Previous image'))
			.click(function() {
				that.previousImage();
			})
			.appendTo(gotoItemContent);
		$.w.menuItem(t.get('Next image'))
			.click(function() {
				that.nextImage();
			})
			.appendTo(gotoItemContent);
		$.w.menuItem(t.get('First image'), true)
			.click(function() {
				that.firstImage();
			})
			.appendTo(gotoItemContent);
		$.w.menuItem(t.get('Last image'))
			.click(function() {
				that.lastImage();
			})
			.appendTo(gotoItemContent);
		$.w.menuItem(t.get('Random image'), true)
			.click(function() {
				that.randomImage();
			})
			.appendTo(gotoItemContent);
		
		var helpItem = $.w.menuItem(t.get('Help')).appendTo(menu);
		helpItemContent = helpItem.menuItem('content');
		
		$.w.menuItem(t.get('About'))
			.click(function() {
				that.openAboutWindow();
			})
			.appendTo(helpItemContent);
		
		var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
		
		this._buttons = {};
		
		this._buttons.previous = $.w.toolbarWindowHeaderItem(t.get('Previous'), new W.Icon('actions/go-previous', 'button'))
			.click(function() {
				that.previousImage();
			})
			.appendTo(toolbar);
		
		this._buttons.next = $.w.toolbarWindowHeaderItem(t.get('Next'), new W.Icon('actions/go-next', 'button'))
			.click(function() {
				that.nextImage();
			})
			.appendTo(toolbar);
		
		this._buttons.zoomIn = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/zoom-in', 'button'))
			.click(function() {
				that.zoomIn();
			})
			.appendTo(toolbar);
		
		this._buttons.zoomOut = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/zoom-out', 'button'))
			.click(function() {
				that.zoomOut();
			})
			.appendTo(toolbar);
		
		this._buttons.realSize = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/zoom-1', 'button'))
			.click(function() {
				that.realSize();
			})
			.appendTo(toolbar);
		
		this._buttons.windowsSize = $.w.toolbarWindowHeaderItem('', new W.Icon('actions/zoom-page', 'button'))
			.click(function() {
				that.windowsSize();
			})
			.appendTo(toolbar);
		
		this.container = $.w.container()
			.addClass('eos')
			.appendTo(this.window.window('content'));
		
		this.container.droppable({
			accept: '*',
			scope: 'webos',
			drop: function(event, ui) {
				if (typeof ui.draggable.data('file') == 'undefined') {
					return;
				}
				that.open(ui.draggable.data('file')());
				return false;
			}
		});
		
		this.image = $('<img/>', { alt: '' }).appendTo(this.container);
		
		this.window.window('open');
		
		if (typeof image != 'undefined') {
			this.open(image);
		}
		
		this.notify('ready');
	});
	
	Webos.TranslatedLibrary.call(this);
}
EyeOfSymbiose.prototype = {
	_translationsName: 'eos'
};
Webos.inherit(EyeOfSymbiose, Webos.Observable);
Webos.inherit(EyeOfSymbiose, Webos.TranslatedLibrary);

EyeOfSymbiose.supported = ['png', 'jpeg', 'jpg', 'gif'];