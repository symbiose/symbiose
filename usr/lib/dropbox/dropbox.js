/*
 *  Dropbox Javascript library v1.0                                           *
 *  Copyright Peter Josling 2010                                              *
 *	                                                                      *
 *  Requires jQuery 1.4.1 or newer (included in source)                       *
 *	                                                                      *
 *  Uses the Javascript OAuth library by John Kristian                        *
 *  http://oauth.googlecode.com/svn/code/javascript/                          *
 *	                                                                      *
 *  Also uses SHA1.js by Paul Johnston	                                      *
 *  http://pajhome.org.uk/crypt/md5/	                                      *
 *	                                                                      *
 *	                                                                      *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *	                                                                      *
 *     http://www.apache.org/licenses/LICENSE-2.0                             *
 *	                                                                      *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            */
/**
 * Reviewed by Simon Ser ($imon) <contact@simonser.fr.nf> on 2012-06-30
 * @author $imon
 */

/**
 * @namespace The Dropbox API.
 */
var dropbox = {};

/**
 * Dropbox API key.
 * @type {String}
 */
dropbox.consumerKey = "sqp3i88ajf7x2g8";
/**
 * Dropbox consumer secret.
 * @type {String}
 */
dropbox.consumerSecret = "0ix4v3nhxv6e7bd";

/**
 * Prefix for data storate - MUST be unique.
 * @type {String}
 */
dropbox.prefix = "webos_dropbox_";

/**
 * Set to false to disable data storage (via cookies or LocalStorage).
 * @type {Boolean}
 */
dropbox.dataStorage = false;

/**
 * Set to "dropbox" if your application has been given full Dropbox folder access or "sandbox" otherwise.
 * @type {String}
 */
dropbox.accessType = "dropbox";

/**
 * If set to true, trying to use HTML5 local storage instead of cookies.
 * @type {Boolean}
 */
dropbox.authHTML5 = true;

/**
 * Set to false to disable file metadata caching.
 * @type {Boolean}
 */
dropbox.cache = true;

/**
 * Authorization callback URL.
 * @type {String}
 */
dropbox.authCallback = window.location.protocol + '//' + window.location.host + window.location.pathname + "usr/lib/dropbox/html/callback.html";

/**
 * Maximum number of files to list from a directory.
 * @type {Number}
 */
dropbox.fileLimit = 10000;

/**
 * Cookie expire time (in days).
 * @type {Number}
 */
dropbox.cookieTime = 3650; //Default 10 years.

/*-------------------No editing required beneath this line-------------------*/

/**
 * Dropbox API cache.
 * @type {Object}
 * @private
 */
dropbox._cache = {};

//Incude required JS libraries
Webos.ScriptFile.load('/usr/lib/oauth/oauth.js');

//If using HTML5 local storage, let's perform a test
if (dropbox.authHTML5 == true) {
	try {
		localStorage.setItem(mod, mod);
		localStorage.removeItem(mod);
	} catch(e) {
		dropbox.authHTML5 = false;
	}
}

/**
 * Try to get tokens from HTML5 local storage or cookies.
 * @private
 */
dropbox.checkAuth = function() {
	//If using HTML5 local storage
	if (dropbox.authHTML5 == true) {
		//Get tokens (only declares variables if the token exists)
		temp = localStorage.getItem(dropbox.prefix + "requestToken")
		if (temp) {
			dropbox.requestToken = temp;
		}
		
		temp = localStorage.getItem(dropbox.prefix + "requestTokenSecret")
		if (temp) {
			dropbox.requestTokenSecret = temp;
		}
		
		temp = localStorage.getItem(dropbox.prefix + "accessToken")
		if (temp) {
			dropbox.accessToken = temp;
		}
		
		temp = localStorage.getItem(dropbox.prefix + "accessTokenSecret")
		if (temp) {
			dropbox.accessTokenSecret = temp;
		}
	} else {
		//Get cookies (for stored OAuth tokens)
		cookies = document.cookie;
		cookies = cookies.split(";");
		
		//Loop through cookies to extract tokens
		for (i in cookies) {
			c = cookies[i];
			while (c.charAt(0) == ' ') c = c.substring(1);
			c = c.split("=");
			switch (c[0]) {
				case dropbox.prefix + "requestToken":
					dropbox.requestToken = c[1];
				break;
				
				case dropbox.prefix + "requestTokenSecret":
					dropbox.requestTokenSecret = c[1];
				break;
				
				case dropbox.prefix + "accessToken":
					dropbox.accessToken = c[1];
				break;
				
				case dropbox.prefix + "accessTokenSecret":
					dropbox.accessTokenSecret = c[1];
				break;
			}
		}
		
		//While we're here, set the cookie expiry date (for later use)
		dropbox.cookieExpire = new Date();
		dropbox.cookieExpire.setDate(dropbox.cookieExpire.getDate()+dropbox.cookieTime);
		dropbox.cookieExpire = dropbox.cookieExpire.toUTCString();
	}
};
dropbox.checkAuth();

dropbox._setupCallback = null;
/**
 * Setup function runs after libraries are loaded.
 */
dropbox.setup = function(callback) {
	//Check if access already allowed
	if (!dropbox.accessToken || !dropbox.accessTokenSecret) {
		//Check if already authorized, but not given access yet
		if (!dropbox.requestToken || !dropbox.requestTokenSecret) {
			if (callback) {
				var requestCallback = Webos.Callback.toCallback(callback);
			} else {
				var requestCallback = new Webos.Callback();
			}
			
			//Request request token
			dropbox.oauthRequest({
				url: "https://api.dropbox.com/1/oauth/request_token",
				type: "text",
				token: true,
				tokenSecret: true
			}, [], [function(data) {
				data = data.split("&");
				dataArray = new Array();
				
				//Parse token
				for (i in data) {
					dataTemp =  data[i].split("=");
					dataArray[dataTemp[0]] = dataTemp[1];
				}
				
				//Store token
				dropbox.storeData("requestToken",dataArray['oauth_token']);
				dropbox.storeData("requestTokenSecret",dataArray['oauth_token_secret']);
				
				//Update variables with tokens
				dropbox.requestToken = dataArray['oauth_token'];
				dropbox.requestTokenSecret = dataArray['oauth_token_secret'];
				
				//Redirect to autorisation page
				var url = "https://api.dropbox.com/1/oauth/authorize?oauth_token=" + dataArray["oauth_token"] + "&oauth_callback=" + dropbox.authCallback;
				var dropboxAuthorizeWindow = window.open(url, 'dropboxAuthorize', 'height=700,width=1050,menubar=no,toolbar=no,location=no,resizable=no');
				
				//Callback
				if (callback) {
					dropbox._setupCallback = Webos.Callback.toCallback(callback);
				}
			}, requestCallback.error]);
		} else {
			if (callback) {
				callback = Webos.Callback.toCallback(callback);
			} else {
				callback = dropbox._setupCallback;
				dropbox._setupCallback = null;
			}
			
			//Request access token
			dropbox.oauthRequest({
				url: "https://api.dropbox.com/1/oauth/access_token",
				type: "text",
				token: dropbox.requestToken,
				tokenSecret: dropbox.requestTokenSecret
			}, [], [function(data) {
				data = data.split("&");
				dataArray = new Array();
				
				//Parse token
				for (i in data) {
					dataTemp =  data[i].split("=");
					dataArray[dataTemp[0]] = dataTemp[1];
				}
				
				//Store token
				dropbox.storeData("accessToken",dataArray['oauth_token']);
				dropbox.storeData("accessTokenSecret",dataArray['oauth_token_secret']);
				
				//Update variables with tokens
				dropbox.accessToken = dataArray['oauth_token'];
				dropbox.accessTokenSecret = dataArray['oauth_token_secret'];
				
				//Callback
				callback.success();
			}, callback.error]);
		}
	} else {
		Webos.Callback.toCallback(callback).success();
	}
};

/**
 * Function to send oauth requests.
 * @param {Object} param1 The request's properties.
 * @param {Array} param2 Parameters to send.
 * @param {Function} callback The callback function, which will be called after loading.
 * @private
 */
dropbox.oauthRequest = function(param1,param2,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//If the token wasn't defined in the function call, then use the access token
	if (!param1.token) {
		param1.token = dropbox.accessToken;
	}
	if (!param1.tokenSecret) {
		param1.tokenSecret = dropbox.accessTokenSecret;
	}
	
	//If type isn't defined, it's JSON
	if (!param1.type) {
		param1.type = "json";
	}
	
	//If method isn't defined, assume it's POST
	if (!param1.method) {
		param1.method = "POST";
	}
	
	//Define the accessor
	accessor = {
		consumerSecret: dropbox.consumerSecret
	};
	
	//Outline the message
	message = {
		action: param1.url,
	    method: param1.method,
	    parameters: [
	      	["oauth_consumer_key", dropbox.consumerKey],
	      	["oauth_signature_method","PLAINTEXT"]
	  	]
	};
	
	//Only add tokens to the request if they're wanted (vars not passed as true)
	if (param1.token != true) {
		message.parameters.push(["oauth_token",param1.token]);
	}
	if (param1.tokenSecret != true) {
		accessor.tokenSecret = param1.tokenSecret;
	}
	
	//If given, append request-specific parameters to the OAuth request
	for (i in param2) {
		message.parameters.push(param2[i]);
	}
	
	//Timestamp and sign the OAuth request
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	
	//Post the OAuth request
	$.ajax({
		url: message.action,
		type: message.method,
		data: OAuth.getParameterMap(message.parameters),
		dataType: param1.type,
		success: function(data) {
			//OAuth request successful - run callback
			callback.success(data);
		},
		error: function(jqXHR, textStatus, errorThrown) {
			//Something went wrong. Feel free to add a better error message if you want
			callback.error(jqXHR.status + ' ' + jqXHR.statusText + '. ' + jqXHR.responseText, jqXHR);
		}
	});
};

/**
 * Get the URL of a oauth GET request.
 * @param {Object} param1 The request's properties.
 * @param {Array} param2 Parameters to send.
 * @returns {String} The URL.
 * @private
 */
dropbox.oauthGetURL = function(param1,param2) {
	//If the token wasn't defined in the function call, then use the access token
	if (!param1.token) {
		param1.token = dropbox.accessToken;
	}
	if (!param1.tokenSecret) {
		param1.tokenSecret = dropbox.accessTokenSecret;
	}
	
	//If type isn't defined, it's JSON
	if (!param1.type) {
		param1.type = "json";
	}
	
	//Define the accessor
	accessor = {
		consumerSecret: dropbox.consumerSecret
	};
	
	//Outline the message
	message = {
		action: param1.url,
	    method: 'GET',
	    parameters: [
	      	["oauth_consumer_key", dropbox.consumerKey],
	      	["oauth_signature_method","PLAINTEXT"]
	  	]
	};
	
	//Only add tokens to the request if they're wanted (vars not passed as true)
	if (param1.token != true) {
		message.parameters.push(["oauth_token",param1.token]);
	}
	if (param1.tokenSecret != true) {
		accessor.tokenSecret = param1.tokenSecret;
	}
	
	//If given, append request-specific parameters to the OAuth request
	for (i in param2) {
		message.parameters.push(param2[i]);
	}
	
	//Timestamp and sign the OAuth request
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	
	var params = OAuth.getParameterMap(message.parameters), i = 0;
	for (var key in params) {
		if (i == 0) {
			message.action += '?';
		} else {
			message.action += '&';
		}
		message.action += escape(key) + '=' + escape(params[key]);
		i++;
	}
	
	return message.action;
};

/**
 * Function to send oauth requests using PUT method.
 * @param {Object} param1 The request's properties.
 * @param {Array} param2 Parameters to send.
 * @param {String} body The request's body.
 * @param {Function} callback The callback function, which will be called after loading.
 * @private
 */
dropbox.oauthPutRequest = function(param1,param2,body,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//If the token wasn't defined in the function call, then use the access token
	if (!param1.token) {
		param1.token = dropbox.accessToken;
	}
	if (!param1.tokenSecret) {
		param1.tokenSecret = dropbox.accessTokenSecret;
	}
	
	//If type isn't defined, it's JSON
	if (!param1.type) {
		param1.type = "json";
	}
	
	//Define the accessor
	accessor = {
		consumerSecret: dropbox.consumerSecret
	};
	
	//Outline the message
	message = {
		action: param1.url,
	    method: 'PUT',
	    parameters: [
	      	["oauth_consumer_key", dropbox.consumerKey],
	      	["oauth_signature_method","PLAINTEXT"]
	  	]
	};
	
	//Only add tokens to the request if they're wanted (vars not passed as true)
	if (param1.token != true) {
		message.parameters.push(["oauth_token",param1.token]);
	}
	if (param1.tokenSecret != true) {
		accessor.tokenSecret = param1.tokenSecret;
	}
	
	//If given, append request-specific parameters to the OAuth request
	for (i in param2) {
		message.parameters.push(param2[i]);
	}
	
	//Timestamp and sign the OAuth request
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	
	//Add parameters to URL
	var params = OAuth.getParameterMap(message.parameters), i = 0;
	for (var key in params) {
		if (i == 0) {
			message.action += '?';
		} else {
			message.action += '&';
		}
		message.action += escape(key) + '=' + escape(params[key]);
		i++;
	}
	

	//Post the OAuth request
	var xhr = null;

	if (window.XMLHttpRequest || window.ActiveXObject) {
		if (window.ActiveXObject) {
			try {
				xhr = new ActiveXObject("Msxml2.XMLHTTP");
			} catch(e) {
				xhr = new ActiveXObject("Microsoft.XMLHTTP");
			}
		} else {
			xhr = new XMLHttpRequest();
		}
	} else {
		console.log("XMLHTTPRequest not supported, please update your web browser.");
		return;
	}

	var boundary = '------multipartformboundary' + (new Date).getTime();
	
	xhr.open('PUT', message.action, true);
	xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + boundary);
	
	xhr.sendAsBinary(body);
	
	xhr.onreadystatechange = function() {
		if (xhr.readyState == 4 && (xhr.status == 200 || xhr.status == 0)) {
			callback.success(jQuery.parseJSON(xhr.responseText));
		} else if (xhr.readyState == 4) {
			callback.error(xhr.status + ' ' + xhr.statusText + '. ' + xhr.responseText, xhr);
		}
	};
};

/**
 * Dropbox API data.
 * @type {Object}
 * @private
 */
dropbox._data = {};

/**
 * Function to store data (tokens/cache) using either cookies or HTML5, depending on choice.
 * @param {String} name The key.
 * @param {String} data The data.
 * @private
 */
dropbox.storeData = function(name,data) {
	if (dropbox.dataStorage) {
		//Escape data to be saved
		data = escape(data);
		
		//If using HTML5 local storage mode
		if (dropbox.authHTML5 == true) {
			localStorage.setItem(dropbox.prefix + name,data);
		} else {
			//Store data in cookie
			document.cookie = dropbox.prefix + name + "=" + data + "; expires=" + dropbox.cookieExpire + "; path=/";
		}
	}
	
	dropbox._data[name] = data;
};

/**
 * Function to get data (tokens/cache) using either cookies or HTML5, depending on choice.
 * @param {String} key The key.
 * @returns {String} The data.
 * @private
 */
dropbox.getData = function(name) {
	if (dropbox.dataStorage) {
		//If using HTML5 local storage mode
		if (dropbox.authHTML5 == true) {
			return unescape(localStorage.getItem(dropbox.prefix + name));
		} else {
			//Get cookies
			cookies = document.cookie;
			cookies = cookies.split(";");
			
			//Loop through cookies to find the right one
			for (i in cookies) {
				c = cookies[i];
				while (c.charAt(0) == ' ') c = c.substring(1);
				c = c.split("=");
				if (c[0] == dropbox.prefix + name) {
					return unescape(c[1]);
				}
			}
		}
	}
	
	return dropbox._data[name];
};

/*    PUBLIC FUNCTIONS    */

/**
 * Function to get account info of user.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getAccount = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/account/info"
	}, [], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to get file/folder metadata.
 * @param {String} path The file's path.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getMetadata = function(path,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/metadata/" + dropbox.accessType + "/" + escape(path)
	}, [["list","false"]], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to get a list of the contents of a directory.
 * @param {String} path The folder's path.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getFolderContents = function(path,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//If caching is enabled, get the hash of the requested folder
	if (dropbox.cache == true) {
		//Get cached data
		hash = dropbox._cache[path];
		
		//If cached data exists
		if (hash != "null" && hash != "undefined" && hash) {
			//Parse the cached data and extract the hash
			hash = jQuery.parseJSON(hash).hash;
		} else {
			//Set to a blank hash
			hash = "00000000000000000000000000000000";
		}
	} else {
		//Set to a blank hash
		hash = "00000000000000000000000000000000";
	}
	hash = "00000000000000000000000000000000";
	
	//Send the OAuth request
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/metadata/" + dropbox.accessType + "/" + escape(path)
	}, [
		["list","true"],
		["hash",hash]
	], [function(data) {
		//If caching is enabled, check if the folder contents have changed
		if (dropbox.cache == true) {
			if (data.status == 304) {
				//Contents haven't changed - return cached data instead
				data = jQuery.parseJSON(dropbox._cache[path]);
			} else {
				data = data.contents;
				
				//Contents have changed - cache them for later
				dropbox._cache[path] = JSON.stringify(data);
			}
		}
		
		//Run the callback
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to get the contents of a file.
 * @param {String} path The file's path.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getFile = function(path,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api-content.dropbox.com/1/files/" + dropbox.accessType + "/" + escape(path),
		type: "text",
		method: "GET"
	}, [], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to get the URL of a file.
 * @param {String} path The file's path.
 * @returns {String} The file's URL.
 */
dropbox.getFileURL = function(path) {
	return dropbox.oauthGetURL({
		url: "https://api-content.dropbox.com/1/files/" + dropbox.accessType + "/" + escape(path),
		type: "text",
		method: "GET"
	}, []);
};

/**
 * Function to move a file/folder to a new location.
 * @param {String} from Specifies the file or folder to be moved.
 * @param {String} to Specifies the destination path, including the new name for the file or folder.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.moveItem = function(from,to,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/fileops/move"
	}, [
		["from_path",from],
		["to_path",to],
		["root",dropbox.accessType]
	], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to copy a file/folder to a new location.
 * @param {String} from Specifies the file or folder to be copied.
 * @param {String} to Specifies the destination path, including the new name for the file or folder.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.copyItem = function(from,to,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/fileops/copy"
	}, [
		["from_path",from],
		["to_path",to],
		["root",dropbox.accessType]
	], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to delete a file/folder.
 * @param {String} path The path to the file or folder to be deleted.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.deleteItem = function(path,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/fileops/delete",
		type: "text"
	}, [
		["path",path],
		["root",dropbox.accessType]
	], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to create a folder.
 * @param {String} path The path to the new folder to create.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.createFolder = function(path,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/fileops/create_folder"
	}, [
		["path",path],
		["root",dropbox.accessType]
	], [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * Function to get a thumbnail for an image.
 * @param {String} path The path to the image file you want to thumbnail.
 * @param {Object} size One of the following values (default small): small (32x32), medium (64x64), large (128x128), s (64x64), m (128x128), l (640x640), xl (1024x768).
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getThumbnail = function(path,size,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	//Check 'size' parameter is valid
	if (size != "small" 
	&& size != "medium" 
	&& size != "large" 
	&& size != "s" 
	&& size != "m" 
	&& size != "l" 
	&& size != "xl") {
		size = "small";
	}
	
	//Send OAuth request
	dropbox.oauthRequest({
		url: "https://api-content.dropbox.com/1/thumbnails/" + dropbox.accessType + "/" + escape(path),
		type: "text"
	}, [["size",size]], [function(data) {
		callback.success(data);
	}, callback.error]);
};

//
/**
 * Function to upload a file.
 * @param {String} path The path to the folder the file should be uploaded to.
 * @param {String} contents The file contents to be uploaded.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.uploadFile = function(path,contents,callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthPutRequest({
		url: "https://api-content.dropbox.com/1/files_put/" + dropbox.accessType + "/" + escape(path)
	}, [], contents, [function(data) {
		callback.success(data);
	}, callback.error]);
};

/**
 * A string that is used to keep track of your current state. On the next call pass in this value to return delta entries that have been recorded since the cursor was returned.
 * @private
 */
dropbox._cursor = 0;
/**
 * A way of letting you keep up with changes to files and folders in a user's Dropbox. You can periodically call /delta to get a list of "delta entries", which are instructions on how to update your local state to match the server's state.
 * @param {Function} callback The callback function, which will be called after loading.
 */
dropbox.getDelta = function(callback) {
	callback = Webos.Callback.toCallback(callback);
	
	dropbox.oauthRequest({
		url: "https://api.dropbox.com/1/delta"
	}, [cursor], [function(data) {
		dropbox._cursor++;
		callback.success(data);
	}, callback.error]);
};