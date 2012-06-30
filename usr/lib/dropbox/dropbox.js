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

var dropbox = {};
	
//Change to your own Dropbox API keys
dropbox.consumerKey = "";
dropbox.consumerSecret = "";

//Prefix for data storate - MUST be unique
dropbox.prefix = "app_";

//Set to "dropbox" if your application has been given full Dropbox folder access
dropbox.accessType = "sandbox";

//Change the below line to true to use HTML5 local storage instead of cookies
dropbox.authHTML5 = true;

//Set to false to disable file metadata caching
dropbox.cache = true;

//Set this to your authorization callback URL
dropbox.authCallback = "";

//Maximum number of files to list from a directory. Default 10k
dropbox.fileLimit = 10000;

//Cookie expire time (in days). Default 10 years
dropbox.cookieTime = 3650;

/*-------------------No editing required beneath this line-------------------*/

//Incude required JS libraries
document.write("<script type='text/javascript' src='oauth.js'></script>");
document.write("<script type='text/javascript' src='sha1.js'></script>");
document.write("<script type='text/javascript' src='jquery.js'></script>");

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

//Setup function runs after libraries are loaded
dropbox.setup = function() {
	//Check if access already allowed
	if (!dropbox.accessToken || !dropbox.accessTokenSecret) {
		//Check if already authorized, but not given access yet
		if (!dropbox.requestToken || !dropbox.requestTokenSecret) {
			//Request request token
			dropbox.oauthReqeust({
				url: "http://api.getdropbox.com/0/oauth/request_token",
				type: "text",
				token: true,
				tokenSecret: true
			}, [], function(data) {
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
				
				//Redirect to autorisation page
				document.location = "http://api.getdropbox.com/0/oauth/authorize?oauth_token=" + dataArray["oauth_token"] + "&oauth_callback=" + dropbox.authCallback;
			});
		} else {
			//Request access token
			dropbox.oauthReqeust({
				url: "http://api.getdropbox.com/0/oauth/access_token",
				type: "text",
				token: dropbox.requestToken,
				tokenSecret: dropbox.requestTokenSecret
			}, [], function(data) {
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
			});
		}
	}
};


//Run setup when everything's loaded
window.onload = dropbox.setup;

//Function to send oauth requests
dropbox.oauthReqeust = function(param1,param2,callback) {
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
	
	//If method isn't defined, assume it's GET
	if (!param1.method) {
		param1.method = "GET";
	}
	
	//Define the accessor
	accessor = {
		consumerSecret: dropbox.consumerSecret,
	};
	
	//Outline the message
	message = {
		action: param1.url,
	    method: param1.method,
	    parameters: [
	      	["oauth_consumer_key", dropbox.consumerKey],
	      	["oauth_signature_method","HMAC-SHA1"]
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
			callback(data);
		},
		
		error: function(a,b,c) {
			//Something went wrong. Feel free to add a better error message if you want
			alert("Error");
		}
	});
}

//Function to store data (tokens/cache) using either cookies or HTML5, depending on choice
dropbox.storeData = function(name,data) {
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

//Function to get data (tokens/cache) using either cookies or HTML5, depending on choice
dropbox.getData = function(name) {
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

/*    PUBLIC FUNCTIONS    */

//Function to get account info of user
dropbox.getAccount = function(callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/account/info"
	}, [], function(data) {
		callback(data);
	});
}

//Function to get file/folder metadata
dropbox.getMetadata = function(path,callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/metadata/" + dropbox.accessType + "/" + path
	}, [["list","false"]], function(data) {
		callback(data);
	});
}

//Function to get a list of the contents of a directory
dropbox.getFolderContents = function(path,callback) {
	//If caching is enabled, get the hash of the requested folder
	if (dropbox.cache == true) {
		//Get cached data
		hash = dropbox.getData("cache." + path);
		
		//If cached data exists
		if (hash != "null") {
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
	
	//Send the OAuth request
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/metadata/" + dropbox.accessType + "/" + path,
		type: "text"
	}, [
		["list","true"],
		["status_in_response","true"],
		["hash",hash]
	], function(data) {
		//If caching is enabled, check if the folder contents have changed
		if (dropbox.cache == true) {
			if (jQuery.parseJSON(data).status == 304) {
				//Contents haven't changed - return cached data instead
				data = dropbox.getData("cache." + path);
			} else {
				//Strip out parent JSON object
				data = data.substr(1);
				while (data.charAt(0) != "{") data = data.substr(1);
				data = data.substr(0,data.length-1);
				while (data.charAt(data.length-1) != "}") data = data.substr(0,data.length-1);
				
				//Contents have changed - cache them for later
				dropbox.storeData("cache." + path,data);
			}
		}
		
		//Parse the data as JSON
		data = jQuery.parseJSON(data);
		
		//Run the callback
		callback(data);
	});
}

//Function to get the contents of a file
dropbox.getFile = function(path,callback) {
	dropbox.oauthReqeust({
		url: escape("http://api-content.dropbox.com/0/files/" + dropbox.accessType + "/" + path),
		type: "text"
	}, [], function(data) {
		callback(data);
	});
}

//Function to move a file/folder to a new location
dropbox.getFile = function(from,to,callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/fileops/move"
	}, [
		["from_path",from],
		["to_path",to],
		["root",dropbox.accessType]
	], function(data) {
		callback(data);
	});
}

//Function to copy a file/folder to a new location
dropbox.copyItem = function(from,to,callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/fileops/copy"
	}, [
		["from_path",from],
		["to_path",to],
		["root",dropbox.accessType]
	], function(data) {
		callback(data);
	});
}

//Function to delete a file/folder
dropbox.deleteItem = function(path,callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/fileops/delete",
		type: "text"
	}, [
		["path",path],
		["root",dropbox.accessType]
	], function(data) {
		callback(data);
	});
}

//Function to delete a file/folder
dropbox.deleteItem = function(path,callback) {
	dropbox.oauthReqeust({
		url: "http://api.dropbox.com/0/fileops/create_folder"
	}, [
		["path",path],
		["root",dropbox.accessType]
	], function(data) {
		callback(data);
	});
}

//Function to get a thumbnail for an image
dropbox.getThumbnail = function(path,size) {
	//Check 'size' parameter is valid
	if (size != "small" && size != "medium" && size != "large") size = "small";
	
	//Send OAuth request
	dropbox.oauthReqeust({
		url: escape("http://api-content.dropbox.com/0/thumbnails/" + dropbox.accessType + "/" + path),
		type: "text"
	}, [["size",size]], function(data) {
		callback(data);
	});
}

//Function to upload a file
dropbox.uploadFile = function(path,file) {
	dropbox.oauthReqeust({
		url: escape("http://api-content.dropbox.com/0/files/" + dropbox.accessType + "/" + path),
		type: "text",
		method: "POST"
	}, [["file",file]], function(data) {
		callback(data);
	});
}
