/**
 * Visionneuse d'images Eye Of Symbiose.
 * @version 1.3
 * @author $imon
 */

new W.ScriptFile('usr/lib/webos/jquery.transit.min.js');

function EyeOfSymbiose(image) {
	this.window = $.w.window({
		title: 'Visionneuse d\'images',
		icon: new W.Icon('applications/eos'),
		width: 500,
		height: 300,
		stylesheet: 'usr/share/css/eos/main.css'
	});
	
	this.zoom = 1;
	
	var that = this;
	
	this.open = function(image, userCallback) {
		userCallback = W.Callback.toCallback(userCallback);
		
		image = W.File.get(image);
		
		if (this.file && this.file.get('path') == image.get('path')) {
			return;
		}
		
		this.file = image;
		this.window.window('loading', true);
		this.window.window('option', 'title', image.getAttribute('basename')+' - Visionneuse d\'images');
		
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
				'-moz-transform-origin': '0 0',
				'-webkit-transform-origin': '0 0',
				'-o-transform-origin': '0 0',
				'-ms-transform-origin': '0 0',
				'transform-origin': '0 0'
			}).transition({ scale: value });
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
			name: 'Visionneuse d\'images',
			version: '1.3',
			description: 'La visionneuse d\'images de GNOME.',
			author: '$imon',
			icon: new W.Icon('applications/eos')
		}).window('open');
	};
	
	var headers = this.window.window('header');
	
	var menu = $.w.menuWindowHeader().appendTo(headers);
	this._menus = {};
	
	var imageItem = $.w.menuItem('Fichier').appendTo(menu);
	imageItemContent = imageItem.menuItem('content');
	
	$.w.menuItem('Ouvrir...')
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
	
	$.w.menuItem('Fermer')
		.click(function() {
			that.window.window('close');
		})
		.appendTo(imageItemContent);
	
	var viewItem = $.w.menuItem('Fichier').appendTo(menu);
	viewItemContent = viewItem.menuItem('content');
	
	$.w.menuItem('Zoom avant')
		.click(function() {
			that.zoomIn();
		})
		.appendTo(viewItemContent);
	$.w.menuItem('Zoom arri&egrave;re')
		.click(function() {
			that.zoomOut();
		})
		.appendTo(viewItemContent);
	$.w.menuItem('Taille normale', true)
		.click(function() {
			that.realSize();
		})
		.appendTo(viewItemContent);
	$.w.menuItem('Taille id&eacute;ale')
		.click(function() {
			that.windowsSize();
		})
		.appendTo(viewItemContent);
	
	var gotoItem = $.w.menuItem('Aller &agrave;').appendTo(menu);
	gotoItemContent = gotoItem.menuItem('content');
	
	$.w.menuItem('Image pr&eacute;c&eacute;dente')
		.click(function() {
			that.previousImage();
		})
		.appendTo(gotoItemContent);
	$.w.menuItem('Image suivante')
		.click(function() {
			that.nextImage();
		})
		.appendTo(gotoItemContent);
	$.w.menuItem('Premi&egrave;re image', true)
		.click(function() {
			that.firstImage();
		})
		.appendTo(gotoItemContent);
	$.w.menuItem('Derni&egrave;re image')
		.click(function() {
			that.lastImage();
		})
		.appendTo(gotoItemContent);
	$.w.menuItem('Image al&eacute;atoire', true)
		.click(function() {
			that.randomImage();
		})
		.appendTo(gotoItemContent);
	
	var helpItem = $.w.menuItem('Aide').appendTo(menu);
	helpItemContent = helpItem.menuItem('content');
	
	$.w.menuItem('&Agrave; propos')
		.click(function() {
			that.openAboutWindow();
		})
		.appendTo(helpItemContent);
	
	var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
	
	this._buttons = {};
	
	this._buttons.previous = $.w.toolbarWindowHeaderItem('Pr&eacute;c&eacute;dent', new W.Icon('actions/go-previous', 'button'))
		.click(function() {
			that.previousImage();
		})
		.appendTo(toolbar);
	
	this._buttons.next = $.w.toolbarWindowHeaderItem('Suivant', new W.Icon('actions/go-next', 'button'))
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
}

EyeOfSymbiose.supported = ['png', 'jpeg', 'jpg', 'gif'];