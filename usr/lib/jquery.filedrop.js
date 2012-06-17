/*
 * A jQuery plugin for html5 dragging files from desktop to browser
 *
 * Author: Weixi Yen
 *
 * Copyright (c) 2010 Resopollution
 *
 * Licensed under the MIT license:
 *	 http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *	 http://www.github.com/weixiyen/jquery-filedrop
 *
 * Version:	0.1.0
 *
 * Features:
 *			Allows sending of extra parameters with file.
 *			Works with Firefox 3.6+
 *			Future-compliant with HTML5 spec (will work with Webkit browsers and IE9)
 * Usage:
 * 	See README at project homepage
 * 
 * Reviewed by $imon <contact@simonser.fr.nf>
 * 
 * Changelog:
 * 			Use of the jQuery widget factory -> possible to have multiple file uploaders in the document
 * 			Use of events
 * 			New method "destroy"
 * 
 */
(function($) {

	jQuery.event.props.push("dataTransfer");
	
	var errors = ['BrowserNotSupported', 'TooManyFiles', 'FileTooLarge'];
	
	$.widget('weboswidgets.filedrop', {
		options: {
			fallback: false, //Selecteur de fichiers (<input type="file" />) qui permet de gerer l'envoi de fichiers si le navigateur n'est pas supporte
			url: '', //URL vers laquelle le fichier sera envoye
			refresh: 1000, //Intervalle d'actualisation
			paramname: 'file', //Nom du parametre du fichier
			maxfiles: 25, //Nombre maximal de fichiers. Ignore si queuefiles > 0
			maxfilesize: 1, //Taille max. en Mio
			queuefiles: 0, //Nombre max. de fichiers en attente
			queuewait: 200,	//Intervalle d'attente si la file d'attente est pleine
			data: {}, //Parametres additionnels a envoyer
			headers: {} //En-tetes additionnels a envoyer
		},
		_create: function() {
			var that = this;
			
			this.element
				.bind('drop', function(e) {
					if (typeof e.dataTransfer == 'undefined' || e.dataTransfer === null) {
						return;
					}
					
					that.options._files = e.dataTransfer.files;
					
					if (typeof that.options._files == 'undefined' || that.options._files === null) {
						that._trigger('error', e, { error: errors[0] });
						return false;
					}
					that.options._files_count = that.options._files.length;
					
					if (that.options._files_count == 0) {
						return;
					}
					
					that._trigger('drop', e);
					
					that._upload();
					
					e.preventDefault();
					e.stopPropagation();
				})
				.bind('dragenter', function(e) {
					e.preventDefault();
					that._trigger('dragenter', e);
				})
				.bind('dragover', function(e) {
					e.preventDefault();
					that._trigger('drag', e);
				})
				.bind('dragleave', function(e) {
					that._trigger('dragleave', e);
					e.stopPropagation();
				});
			
			if (this.options.fallback != false) {
				$(this.options.fallback).change(function(e) {
					this._trigger('drop', e);
					this.options._files = e.target.files;
					this.options._files_count = this.options._files.length;
					this.upload();
				});
			}
		},
		_getBuilder: function(filename, filedata, mime, boundary) {
			var dashdash = '--',
					crlf = '\r\n',
					builder = '';

			if (this.options.data) {
				var params = $.param(this.options.data).split(/&/);

				$.each(params, function() {
					var pair = this.split(/=/, 2);
					var name = decodeURI(pair[0]);
					var val = decodeURI(pair[1]);

					builder += dashdash;
					builder += boundary;
					builder += crlf;
					builder += 'Content-Disposition: form-data; name="' + name + '"';
					builder += crlf;
					builder += crlf;
					builder += val;
					builder += crlf;
				});
			}

			builder += dashdash;
			builder += boundary;
			builder += crlf;
			builder += 'Content-Disposition: form-data; name="' + this.options.paramname + '"';
			builder += '; filename="' + filename + '"';
			builder += crlf;

			builder += 'Content-Type: ' + mime;
			builder += crlf;
			builder += crlf;

			builder += filedata;
			builder += crlf;

			builder += dashdash;
			builder += boundary;
			builder += dashdash;
			builder += crlf;
			
			return builder;
		},
		_upload: function() { // Respond to an upload
			var stop_loop = false, that = this;

			if (!this.options._files) {
				this._trigger('error', { type: 'error' }, { error: errors[0] });
				return false;
			}

			var filesDone = 0, filesRejected = 0;

			if (this.options._files_count > this.options.maxfiles && this.options.queuefiles === 0) {
				this._trigger('error', { type: 'error' }, { error: errors[1] });
				return false;
			}

			// Define queues to manage upload process
			var workQueue = [];
			var processingQueue = [];
			var doneQueue = [];

			// Add everything to the workQueue
			for (var i = 0; i < this.options._files_count; i++) {
				workQueue.push(i);
			}

			// Helper function to enable pause of processing to wait
			// for in process queue to complete
			var pause = function(timeout) {
				setTimeout(process, timeout);
				return;
			};

			// Process an upload, recursive
			var process = function() {
				var fileIndex;

				if (stop_loop) return false;

				// Check to see if are in queue mode
				if (that.options.queuefiles > 0 && processingQueue.length >= that.options.queuefiles) {
					return pause(that.options.queuewait);
				} else {
					// Take first thing off work queue
					fileIndex = workQueue[0];
					workQueue.splice(0, 1);

					// Add to processing queue
					processingQueue.push(fileIndex);
				}

				try {
					if (that._trigger('uploadrequested', { type: 'uploadrequested' }, { file: that.options._files[fileIndex] }) != false) {
						if (fileIndex === that.options._files_count) return;
						var reader = new FileReader(),
								max_file_size = 1048576 * that.options.maxfilesize;

						reader.index = fileIndex;
						if (that.options._files[fileIndex].size > max_file_size) {
							that._trigger('error', { type: 'error' }, { error: errors[2], file: that.options._files[fileIndex], index: fileIndex });
							// Remove from queue
							processingQueue.forEach(function(value, key) {
								if (value === fileIndex) processingQueue.splice(key, 1);
							});
							filesRejected++;
							return true;
						}
						reader.onloadend = send;
						reader.readAsBinaryString(that.options._files[fileIndex]);
					} else {
						filesRejected++;
					}
				} catch (err) {
					// Remove from queue
					processingQueue.forEach(function(value, key) {
						if (value === fileIndex) processingQueue.splice(key, 1);
					});
					that._trigger('error', { type: 'error' }, { error: errors[0] });
					return false;
				}

				// If we still have work to do,
				if (workQueue.length > 0) {
					process();
				}
			};

			var send = function(e) {
				var fileIndex = ((typeof(e.srcElement) === 'undefined') ? e.target : e.srcElement).index;

				// Sometimes the index is not attached to the
				// event object. Find it by size. Hack for sure.
				if (typeof e.target.index == 'undefined') {
					e.target.index = that._getIndexBySize(e.total);
				}

				var xhr = new XMLHttpRequest(),
						upload = xhr.upload,
						file = that.options._files[e.target.index],
						index = e.target.index,
						start_time = new Date().getTime(),
						boundary = '------multipartformboundary' + (new Date).getTime(),
						builder;

				mime = file.type;
				builder = that._getBuilder(file.name, e.target.result, mime, boundary);

				upload.index = index;
				upload.file = file;
				upload.downloadStartTime = start_time;
				upload.currentStart = start_time;
				upload.currentProgress = 0;
				upload.startData = 0;
				upload.addEventListener("progress", function(e) {
					if (e.lengthComputable) {
						var percentage = Math.round((e.loaded * 100) / e.total);
						if (upload.currentProgress != percentage) {
							upload.currentProgress = percentage;
							
							that._trigger('progressupdated', e, { index: upload.index, file: upload.file, progress: upload.currentProgress });

							var elapsed = new Date().getTime();
							var diffTime = elapsed - upload.currentStart;
							if (diffTime >= that.options.refresh) {
								var diffData = e.loaded - upload.startData;
								var speed = diffData / diffTime; // KB per second
								that._trigger('speedupdated', e, { index: upload.index, file: upload.file, speed: speed });
								upload.startData = e.loaded;
								upload.currentStart = elapsed;
							}
						}
					}
				}, false);

				xhr.open('POST', that.options.url, true);
				xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);

				// Add headers
				$.each(that.options.headers, function(k, v) {
					xhr.setRequestHeader(k, v);
				});

				xhr.sendAsBinary(builder);

				that._trigger('uploadstarted', e, { index: index, file: file, nbrFiles: that.options._files_count });

				xhr.onload = function() {
					if (xhr.responseText) {
						var response;
						try {
							var json = JSON.parse(xhr.responseText); //On essaie de recuperer les donnees JSON
							response = new W.ServerCall.Response(json);
						} catch (error) { //Si une erreur survient
							response = new W.ServerCall.Response({ //On cree une reponse d'erreur, et on execute le callback d'erreur
								'success': false,
								'channels': {
									1: null,
									2: xhr.responseText //On ajoute le message d'erreur
								},
								'js': null,
								'out': xhr.responseText
							});
						}
						
						var now = new Date().getTime(),
								timeDiff = now - start_time,
								result = that._trigger('uploadfinished', { type: 'uploadfinished' }, { index: index, file: file, response: response, time: timeDiff});
						filesDone++;

						// Remove from processing queue
						processingQueue.forEach(function(value, key) {
							if (value === fileIndex) processingQueue.splice(key, 1);
						});

						// Add to donequeue
						doneQueue.push(fileIndex);

						if (filesDone == that.options._files_count - filesRejected) {
							that._trigger('alluploadsfinished', { type: 'alluploadsfinished' });
						}
						if (result === false) stop_loop = true;
					}
				};
			};

			// Initiate the processing loop
			process();
		},
		_getIndexBySize: function(size) {
			for (var i = 0; i < this.options._files_count; i++) {
				if (this.options._files[i].size == size) {
					return i;
				}
			}
			
			return;
		},
		_setOption: function(key, value) {
			switch(key) {}
			$.Widget.prototype._setOption.apply(this,arguments);
		},
		destroy: function() {
			this.element
				.unbind('drop', this.options.drop)
				.unbind('dragenter', this.options.dragEnter)
				.unbind('dragover', this.options.dragOver)
				.unbind('dragleave', this.options.dragLeave);
			$(document)
				.unbind('drop', this.options.docDrop)
				.unbind('dragenter', this.options.docEnter)
				.unbind('dragover', this.options.docOver)
				.unbind('dragleave', this.options.docLeave);
			
			if (this.options.fallback_id != '') {
				$('#' + this.options.fallback_id).unbind('change');
			}
			
			$.Widget.prototype.destroy.call(this);
		}
	});

	try {
		if (XMLHttpRequest.prototype.sendAsBinary) return;
		XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
			function byteValue(x) {
				return x.charCodeAt(0) & 0xff;
			}
			var ords = Array.prototype.map.call(datastr, byteValue);
			var ui8a = new Uint8Array(ords);
			this.send(ui8a.buffer);
		};
	} catch (e) {}

})(jQuery);
