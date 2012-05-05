new W.ScriptFile('usr/lib/webos/file.js');

function EyeOfSymbiose(image) {
	this.window = $.w.window({
		title: 'Visionneuse d\'images',
		icon: new SIcon('applications/eos'),
		width: 500,
		height: 300,
		stylesheet: 'usr/share/css/eos/main.css'
	});
	
	this.zoom = 1;
	
	var that = this;
	
	this.openImage = function(image, userCallback) {
		this.file = image;
		this.window.window('loading', true);
		this.window.window('option', 'title', image.getAttribute('basename')+' - Visionneuse d\'images');
		
		if (typeof userCallback == 'undefined') {
			userCallback = new W.Callback();
		}
		
		this.loadingImage = new W.LoadImage({
			images: image.getAttribute('realpath'),
			callback: function(data) {
				that.window.window('loading', false);
				delete that.loadingImage;
				if (data.IsEnd) {
					that.image.attr('src', image.getAttribute('realpath'));
					that.windowsSize();
					userCallback.success(that);
				} else {
					userCallback.error(data);
				}
			}
		});
	};
	
	this.previousImage = function() {
		if (typeof this.file == 'undefined') {
			return;
		}
		
		this._getImagesInDir(new W.Callback(function(images) {
			for (var i = 0; i < images.length; i++) {
				if (images[i].getAttribute('path') == that.file.getAttribute('path')) {
					break;
				}
			}
			var imageIndex = i - 1;
			if (imageIndex >= images.length) {
				imageIndex = 0;
			}
			if (imageIndex < 0) {
				imageIndex = images.length - 1;
			}
			that.openImage(images[imageIndex]);
		}));
	};
	
	this.nextImage = function() {
		if (typeof this.file == 'undefined') {
			return;
		}
		
		this._getImagesInDir(new W.Callback(function(images) {
			for (var i = 0; i < images.length; i++) {
				if (images[i].getAttribute('path') == that.file.getAttribute('path')) {
					break;
				}
			}
			var imageIndex = i + 1;
			if (imageIndex >= images.length) {
				imageIndex = 0;
			}
			if (imageIndex < 0) {
				imageIndex = images.length - 1;
			}
			that.openImage(images[imageIndex]);
		}));
	};
	
	this._getImagesInDir = function(userCallback) {
		if (typeof this.file == 'undefined') {
			userCallback.error(response);
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
			
			var dir = this.file.getAttribute('dirname');
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
		if (this.zoom == 1) {
			this.realSize();
		}
		this.zoom = value;
		this.image
			.width(dimentions.width)
			.height(dimentions.height)
			.css({
				'-moz-transform': 'scale('+value+')',
				'-webkit-transform': 'scale('+value+')',
				'-o-transform': 'scale('+value+')',
				'-ms-transform': 'scale('+value+')',
				'transform': 'scale('+value+')',
				'-moz-transform-origin': '0 0',
				'-webkit-transform-origin': '0 0',
				'-o-transform-origin': '0 0',
				'-ms-transform-origin': '0 0',
				'transform-origin': '0 0'
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
		this.zoom = 1;
		this.image.css({
			'-moz-transform': 'none',
			'-webkit-transform': 'none',
			'-o-transform': 'none',
			'-ms-transform': 'none',
			'transform': 'none',
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
		this.zoom = 1;
		this.image.css({
			'-moz-transform': 'none',
			'-webkit-transform': 'none',
			'-o-transform': 'none',
			'-ms-transform': 'none',
			'transform': 'none',
			'width': 'auto',
			'height': 'auto',
			'max-width': '100%',
			'max-height': '100%'
		});
	};
	
	var headers = this.window.window('header');
	
	var toolbar = $.w.toolbarWindowHeader().appendTo(headers);
	
	this._buttons = {};
	
	this._buttons.previous = $.w.toolbarWindowHeaderItem('Pr&eacute;c&eacute;dent', new SIcon('actions/go-previous', 'button'))
		.click(function() {
			that.previousImage();
		})
		.appendTo(toolbar);
	
	this._buttons.next = $.w.toolbarWindowHeaderItem('Suivant', new SIcon('actions/go-next', 'button'))
		.click(function() {
			that.nextImage();
		})
		.appendTo(toolbar);
	
	this._buttons.zoomIn = $.w.toolbarWindowHeaderItem('', new SIcon('actions/zoom-in', 'button'))
		.click(function() {
			that.zoomIn();
		})
		.appendTo(toolbar);
	
	this._buttons.zoomOut = $.w.toolbarWindowHeaderItem('', new SIcon('actions/zoom-out', 'button'))
		.click(function() {
			that.zoomOut();
		})
		.appendTo(toolbar);
	
	this._buttons.realSize = $.w.toolbarWindowHeaderItem('', new SIcon('actions/zoom-1', 'button'))
		.click(function() {
			that.realSize();
		})
		.appendTo(toolbar);
	
	this._buttons.windowsSize = $.w.toolbarWindowHeaderItem('', new SIcon('actions/zoom-page', 'button'))
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
			that.openImage(ui.draggable.data('file')());
			return false;
		}
	});
	
	this.image = $('<img/>', { alt: '' }).appendTo(this.container);
	
	this.window.window('open');
	
	if (typeof image != 'undefined') {
		this.openImage(image);
	}
}

EyeOfSymbiose.supported = ['png', 'jpeg', 'jpg', 'gif'];