/*
 *  BOX SDK Javascript library v2.0                                           *
 *  Copyright: Box, Inc 2012                                                  *
 *  Author: Tony Casparro                                                     *
 *                                                                            *
 *  Requires jQuery 1.4.10                                                    *
 *                                                                            */
// From: https://github.com/casparro/Box-SDK-JavaScript

var BOX = {};

//Change to your own BOX.API keys
BOX.base_url = "https://api.box.com/2.0/";
BOX.apiKey = "nczvn8poc1tg474tb4juajsh6pa7259y";
BOX.authToken = "";

//Maximum number of files to list from a directory. Default 10k
BOX.fileLimit = 10000;

//Cookie expire time (in days). Default 10 years
BOX.cookieTime = 3650;


/*-------------------No editing required beneath this line-------------------*/

//Setup function runs after libraries are loaded
BOX.setup = function() {
	//oauth goes here
};

//Function to send oauth requests
BOX.ajaxRequest = function(params, ajax_params, callback) {

	//If the token wasn't defined in the function call, then use the access token
	if (!params.token) {
		params.token = BOX.accessToken;
	}
	if (!params.tokenSecret) {
		params.tokenSecret = BOX.accessTokenSecret;
	}

	//If type isn't defined, it's JSON
	if (!params.type) {
		params.type = "json";
	}

	//If method isn't defined, assume it's GET
	if (!params.method) {
		params.method = "GET";
	}

	//Define the accessor
	var accessor = {
		consumerSecret: BOX.authToken
	};

	//Outline the message
	var message = {
		action: params.url,
	    method: params.method,
	    parameters: {}
	};

	//If given, append request-specific parameters
	$.extend(message.parameters, ajax_params);


	//Post the OAuth request
	$.ajax({
		url: message.action,
		type: message.method,
		data: JSON.stringify(message.parameters),
		dataType: params.type,
		beforeSend : function (xhr){
			xhr.setRequestHeader('Authorization', "BoxAuth api_key=" + BOX.apiKey + "&auth_token=" + BOX.authToken);
		},

		success: function(data) {
			callback(data);
		},

		error: function(a,b,c) {
			console.log("error");
		}
	});
}

//Get the resource name for a given object type
BOX.getResourceName = function(type)
{
	var resource_name = false;
	switch(type)
	{
		case 'file':
			resource_name = 'files';
			break;
		case 'folder':
			resource_name = 'folders';
			break;
	}

	return resource_name;
};



/*    PUBLIC FUNCTIONS    */

//Function to get an item metadata
BOX.getItemMetadata = function(item_type, item_id, callback) {

	if (!BOX.getResourceName(item_type) || !item_id) return false;

	BOX.ajaxRequest({
		url: BOX.base_url + BOX.getResourceName(item_type) + "/" + item_id
	}, [], function(data) {
		callback(data);
	});
};

//Function to update an item metadata
BOX.updateItem = function(item_type, item_id, name, callback) {

	if (!BOX.getResourceName(item_type) || !item_id) return false;

	BOX.ajaxRequest({
		url: BOX.base_url + BOX.getResourceName(item_type) + "/" + item_id,
		type: "text",
		method: "PUT"
	}, {name: name}, function(data) {
		callback(data);
	});
};

//Function to delete an item
BOX.deleteItem = function(item_type, item_id, callback) {

	if (!BOX.getResourceName(item_type) || !item_id) return false;

	BOX.ajaxRequest({
		url: BOX.base_url + BOX.getResourceName(item_type) + "/" + item_id,
		method: "DELETE"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to upload a file
BOX.uploadFile = function(file, folder_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/data",
		type: "text",
		method: "POST"
	}, {"file": file, "folder_id": folder_id}, function(data) {
		callback(data);
	});
};

//Function to get the contents of a file
BOX.downloadFile = function(file_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/data",
		type: "text"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to upload a new version of a file
BOX.uploadNewFileVersion = function(file_id, file) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/data",
		type: "text",
		method: "POST"
	}, {"file": file}, function(data) {
		callback(data);
	});
};

//Function to get file versions
BOX.getFileVersions = function(file_id, callback) {

	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/versions"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to get metadata for a file version
BOX.getFileVersionMetadata = function(file_id, version_id, callback) {

	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "?version=" + version_id
	}, {}, function(data) {
		callback(data);
	});
};

//Function to delete a file version
BOX.deleteFileVersion = function(file_id, version_id, callback) {

	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/versions/" + version_id,
		method: "DELETE"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to get the contents of a file version
BOX.downloadFileVersion = function(file_id, version_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/versions/" + version_id,
		type: "text"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to comment on a file
BOX.getFileComments = function(file_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/comments"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to create a new folder
BOX.createFolder = function(name, parent_folder_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "folders/" + parent_folder_id,
		method: "POST"
	}, {"name": name}, function(data) {
		callback(data);
	});
};


//Function to comment on a file
BOX.addFileComment = function(file_id, message, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "files/" + file_id + "/comments",
		type: "text",
		method: "POST"
	}, {"message": message}, function(data) {
		callback(data);
	});
};

//Function to update comment on a file
BOX.updateFileComment = function(comment_id, message, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "comments/" + comment_id,
		type: "text",
		method: "PUT"
	}, {"message": message}, function(data) {
		callback(data);
	});
};

//Function to get a comment on a file
BOX.getFileComment = function(comment_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "comments/" + comment_id
	}, {}, function(data) {
		callback(data);
	});
};

//Function to delete a comment on a file
BOX.deleteFileComment = function(comment_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "comments/" + comment_id,
		method: "DELETE"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to discussion to a folder
BOX.addDiscussion = function(folder_id, name, description, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "folders/" + folder_id + "/discussions",
		type: "text",
		method: "POST"
	}, {"name": name, "description": description}, function(data) {
		callback(data);
	});
};

//Function to update a discussion
BOX.updateFileComment = function(discussion_id, name, description, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "discussions/" + discussion_id,
		type: "text",
		method: "PUT"
	}, {"name": name, "description": description}, function(data) {
		callback(data);
	});
};

//Function to get a discussion
BOX.getDiscussion = function(discussion_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "discussions/" + discussion_id
	}, {}, function(data) {
		callback(data);
	});
};

//Function to delete a discussion
BOX.deleteDiscussion = function(discussion_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "discussions/" + discussion_id,
		method: "DELETE"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to get discussions in a folder
BOX.getFolderDiscussions = function(folder_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "folders/" + folder_id + "/discussions"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to comment on a discussion
BOX.addDiscussionComment = function(discussion_id, message, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "discussions/" + discussion_id + "/comments",
		type: "text",
		method: "POST"
	}, {"message": message}, function(data) {
		callback(data);
	});
};

//Function to get discussion comments in a folder
BOX.getDiscussionComments = function(discussion_id, callback) {
	BOX.ajaxRequest({
		url: BOX.base_url + "discussions/" + discussion_id + "/comments"
	}, {}, function(data) {
		callback(data);
	});
};

//Function to get events related to the user
BOX.getEvents = function(params, callback) {

	if (!params.stream_position) params.stream_position = 0;
	if (!params.stream_type) params.stream_type = "all";
	if (!params.limit) params.limit = 100;

	BOX.ajaxRequest({
		url: BOX.base_url + "events/"
	}, {"stream_position": params.stream_position, "stream_type":params.stream_type, "limit": params.limit}, function(data) {
		callback(data);
	});
};


//Run setup when everything's loaded
$(function () {
	window.onload = BOX.setup;
});
