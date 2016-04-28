/*eslint-env node*/

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var findRemoveSync = require('find-remove');
var fs = require ('fs');
var Cloudant = require('cloudant');
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var iandc = require('./lib/drone_interpret_and_control/drone_interpret_and_control');
var auth = require('basic-auth');
var readChunk = require('read-chunk');
var imageType = require('image-type');
var fileType = require('file-type');
var dashDB = require('ibm_db');
var session = require('client-sessions');
var mqtt = require('./lib/MqttHandler');
var lame = require ('lame');
var wav = require('wav');
var crypto = require('crypto');
var hash = crypto.createHash('sha256');



var uploadDir = "uploads/";

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, uploadDir );
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname);
	}
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var upload = multer({
	 storage: storage
});
app.upload = upload;


// Get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


/////////////// Load Service Details //////////
var services;
if (process.env.VCAP_SERVICES) {
	console.log("Cloud Detected");
	services = JSON.parse(process.env.VCAP_SERVICES);
} else {
	try{
		console.log("Local Detected");
		services = require('./node_modules/vcap_services/VCAP_SERVICES.json');
	} catch (e){
		console.error(e);
	}
}


/////////////// Load Credentials //////////////
var cloudantCreds, imageRecognitionCreds, speechToTextCreds, toneAnalysisCreds, mqttCreds, dashDBCreds;
for (var svcName in services) {
	if (svcName.match(/^cloudant/)) {
		cloudantCreds = services[svcName][0]['credentials'];
  	}else if (svcName.match(/^visual/)) {
	  	imageRecognitionCreds = services[svcName][0]['credentials'];
  	}else if (svcName.match(/^speech/)) {
	  	speechToTextCreds = services[svcName][0]['credentials'];
  	}else if (svcName.match(/^tone/)) {
	  	toneAnalysisCreds = services[svcName][0]['credentials'];
  	}else if (svcName.match(/^iotf/)) {
	  	mqttCreds = services[svcName][0]['credentials'];
  	}else if (svcName.match(/^dashDB/)) {
		dashDBCreds = services[svcName][0]['credentials'];
	}
}

/////////////// Test Credential Existance /////
if(typeof cloudantCreds === "undefined"){
	console.error("No Cloudant credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof imageRecognitionCreds === "undefined"){
	console.error("No Image Recognition credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof speechToTextCreds === "undefined"){
	console.error("No Speech to Text credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof toneAnalysisCreds === "undefined"){
	console.error("No Tone Analysis credentials supplied in VCAP_SERVICES.");
	//process.exit(1);
}else if(typeof mqttCreds === "undefined"){
	console.error("No IoT credentials supplied in VCAP_SERVICES.");
	process.exit(1);
}else if(typeof dashDBCreds === "undefined"){
	console.error("No dashDB credentials supplied in VCAP_SERVICES.");
	process.exit(1);
}


/////////////// Initialise services ///////////
var username = cloudantCreds.username;
var password = cloudantCreds.password;
var cloudant = Cloudant({account:username, password:password});
//console.log("Cloudant: " + username + " " + password);

username = imageRecognitionCreds.username;
password = imageRecognitionCreds.password;
var imageRecognition = watson.visual_recognition({
	version:'v2-beta',
  	version_date:'2015-12-02',
	username:username,
	password:password
});
//console.log("Recognition: " + username + " " + password);

username = speechToTextCreds.username;
password = speechToTextCreds.password;
var speechToText = watson.speech_to_text({
	version: "v1",
	username:username,
	password:password
});
//console.log("speechToText: " + username + " " + password);

// username = toneAnalysisCreds.username;
// password = toneAnalysisCreds.password;
// var toneAnalysis = watson.tone_analyzer({
// 	version: "v2-experimental",
// 	username:username,
// 	password:password
// });
//console.log("Tone Analysis: " + username + " " + password);


mqttCreds.id = 'drone-nodes';
//mqttCreds.type = 'application';



var MQTT = new mqttHandler(mqttCreds, deviceStatusCallback);

var IandC = new iandc(MQTT, cloudant);


//TEMP TESTING VARIABLES
var words = [ {name:"Fire" , score:0.7 }, {name:"Whut", score:0.6} , {name:"Person", score:0.8}];
var docID = (new Date()).getTime().toString();

// Testing IandC //var latlon = {lat: 51.485138, lon: -0.187755};
//IandC.imageKeywords(words, docID, {lat: 51.49, lon: -0.19} );
//IandC.imageKeywordsDetermineMode(words);
//IandC.processImageLabels(words, docID, {lat: 51.49, lon: -0.19});

//////////////////////// Router //////////////////////

var router = express.Router();

// Retrieve all sensor data
router.get('/sensors', function(req, res){
	serveSensorDataRouter(req, res);
});
// Retrieve sensor data, docs from time a to now
router.get('/sensors/:timeFrom', function(req, res){
	serveSensorDataRouter(req, res);
});
// Retrieve sensor data, docs from time a to b
router.get('/sensors/:timeFrom/:timeUntil', function(req, res){
	serveSensorDataRouter(req, res);
});
// Retrieve a type of sensor data, docs from time a to b
router.get('/sensors/:type/:timeFrom/:timeUntil', function(req, res){
	serveSensorDataRouter(req, res);
});

// Retrieve gps (position) data from time a to b
router.get('/gps', function(req, res){
	serveGPSData(req, res);
});
// Retrieve gps (position) data from time a to now
router.get('/gps/:timeFrom/', function(req, res){
	serveGPSData(req, res);
});
// Retrieve gps (position) data from time a to b
router.get('/gps/:timeFrom/:timeUntil', function(req, res){
	serveGPSData(req, res);
});

// Retrieve list of image metadata
router.get('/images', function(req, res){
	serveImagesInformation(req, res);
});
// Retrieve image from docID (requires .jpg atm)
router.get('/images/:docID', function(req, res){
	serveImage(req, res);
});

router.all('/users/*', requireLogin);

router.get('/users/:username', function(req, res){
	serveUserInformation(req, res);
});


////////////////////////////////////////////////////


// serve the files out of ./public as our static files
app.use(express.static(__dirname + '/public'));

app.use(session({
	cookieName: 'session',
	secret: 'random_string_goes_here',
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000
}));

app.use('/api/', router);


/*
app.enable('trust proxy');

// Add a handler to inspect the req.secure flag (see
// http://expressjs.com/api#req.secure). This allows us
// to know whether the request was via http or https.
app.use (function (req, res, next) {
	if (req.secure) {
		// request was via https, so do no special handling
		console.log("hi");
		next();
	} else {
		// request was via http, so redirect to https
		console.log("hi2");
		var x = 'https://' + req.headers.host + req.url;
		console.log(x);
		res.redirect('https://' + req.headers.host + req.url);
	}
});
*/


////////// REST FUNCTIONS ////////////////////

// Retrieves the latest image from the database
app.get('/getLatestImage', function (req, res){

	retrieveLatestImage(res);

});

app.get('/getLatestImageSecure', requireLogin, function(req,res){
	retrieveLatestImage(res);
});

app.get('/getLatestGPS', function(req, res){
	var latlon = {lat: 51.485138, lon: -0.187755};
	res.status(200).send(JSON.stringify(latlon));
});

// Retrieves the image recognition label set
app.get('/getLabels', function(req, res){
	var params = {
		'verbose': 1
	};
	imageRecognition.listClassifiers(params, function(err, labels){
		if(err){
			console.error(err);
			res.status(500).send();
		} else {
			res.status(200).send(JSON.stringify(labels));
		}
	});
});

// Upload an image to the server from the drone. Saved to database and classified
app.post('/imageUpload', upload.single('image'), function (req, res){

	// Check security/validity of the file
	var valid = validateJPEG(req.file.path);
	if(!valid){
		res.status(400).send("Invalid file type - not jpeg.\n");
		fs.unlink(req.file.path);
	} else {
		res.status(200).send("File uploaded successfully.\n");
		latestImage = req.file.path;
		IandC.sendImageAlert();
		classifyImage(req.file.originalname, req.file.path, req.body);
		insertImageIntoDatabase(req.file.originalname, req.file.path, req.body);
	}
});

app.post('/imageUploadSecure', upload.single('image'), requireLogin, function (req, res){

	// Check security/validity of the file
	var valid = validateJPEG(req.file.path);
	if(!valid){
		res.status(400).send("Invalid file type - not jpeg.\n");
		fs.unlink(req.file.path);
	} else {
		res.status(200).send("File uploaded successfully.\n");
		latestImage = req.file.path;
		IandC.sendImageAlert();
		classifyImage(req.file.originalname, req.file.path, req.body);
		insertImageIntoDatabase(req.file.originalname, req.file.path, req.body);
	}

});

// Upload a speech file to the server from the drone
app.post('/speechUpload', upload.single('audio'), function (req, res){
	console.log("Received sound: " + req.file.originalname);

	// Check security/validity of the file
	var valid = validateAudioFile(req.file.path);
	if(!valid){
		res.status(400).send("Invalid file type - not wav.\n");
		fs.unlink(req.file.path);
	} else {
		res.status(200).send("File uploaded successfull.\n");
		latestAudio = req.file.path;
		speechRecognition(req.file.originalname, req.file.path);
		insertSpeechIntoDatabase(req.file.originalname, req.file.path, req.body);
	}

});

app.post('/speechUploadSecure', upload.single('audio'), requireLogin, function (req, res){

	// Check security/validity of the file
	var valid = validateAudioFile(req.file.path);
	if(!valid){
		res.status(400).send("Invalid file type - not wav.\n");
		fs.unlink(req.file.path);
	} else {
		res.status(200).send("File uploaded successfully.\n");
		latestAudio = req.file.path;
		speechRecognition(req.file.originalname, req.file.path, req.body);
		insertSpeechIntoDatabase(req.file.originalname, req.file.path, req.body);
	}
});

app.post('/login', function(req, res){
	var creds = auth(res);
	if(!creds){
		res.status(403).send("Please provide username and password.\n");
	} else {
		checkUserCredentials(creds, function(found){
			if(found){
				req.session.user = creds.name;
				res.status(200).send("Logged in successfully.\n");
			}else if (found == null){
				res.status(500).send("Please try again later.");
			} else{
				res.status(403).send("Invalid username or password\n");
			}
		});
	}
});

app.get('/login', function(req, res){
	res.status(200).send("Please login by POSTing username and password.\n");
});

app.get('/test', function(req, res){
	console.log("Testing");
	//IandC.test();


	res.status(200).send();
});

app.get('/testAudio', function(req, res){
	testSpeechRecognition('test/sampleFiles/testAudio.wav', res);
});

app.get('/testImage', function(req, res){
	testImageRecognition('test/sampleFiles/testImage.jpg', res);
});

app.get('/createIndex', function(req, res){
	createIndexes(req.query.name, req.query.field);
	res.sendStatus(200);
});

app.get('/getSensorData', function(req, res){

	// Get data from the database
	serveSensorData(req, res);

});
/////////////////////////////////////////////////////

////////////// Caching/Performance Improvement ///

var latestImage = ""; //TODO - replace with checking latest in uploads folder
var latestAudio = "";


// Clean up uploads
setInterval(function() {
	console.log("Checking "+ __dirname + '/' + uploadDir);
    var removed = findRemoveSync(__dirname + '/' + uploadDir, {age: {seconds: 3600}});
}, 3600000);


// Start server on the specified port and binding host
var port = process.env.VCAP_APP_PORT || 8080;
app.listen(port, function() {
	console.log("server starting on " + appEnv.url + " port " + port);
});




/////////////////// Internal Functions /////////////


//////////////// Cloudant Database ////////////////////
function insertImageIntoDatabase(imageName, imagePath, body){
	console.log("Recieved " + imageName);
	// Read from uploads
	var imageData = fs.readFileSync(imagePath);
	var images = cloudant.use('drone_images');

	var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];
	//var docID = (new Date()).getTime().toString();

	images.multipart.insert({name: imageName, time:body.time, location:body.location}, attach, imageName, function(err, body) {
		if (err) {
			console.error('[images.insert]: ', err.message);
		} else{
			console.log("Saved image to database successfully.");
		}
    });
}

function insertSpeechIntoDatabase(speechfileName, speechfilePath, body){

	// Read from uploads
	var speechData = fs.readFileSync(speechfilePath);
	var speechDB = cloudant.use('drone_speech');

	var attach = [{name: "speech", data: speechData, content_type: 'image/jpeg'}]; //FIX
	//var docID = (new Date()).getTime().toString(); // Append original file name?

	speechDB.multipart.insert({name: speechfileName, time:body.time, location:body.location}, attach, speechfileName, function(err, body) {
		if (err) {
			console.error('[speech.insert]: ', err.message);
		} else{
			console.log("Saved speech to database successfully.");
		}
    });
}

function retrieveLatestImage(res){
	if(latestImage != ""){
		try{
			var imageData = fs.readFileSync(latestImage);
			res.set('Content-Type', 'image/jpeg');
			res.send(imageData);
			return;
		} catch (e){
			console.error("Image Cache Error.");
			console.error(e.message);
			latestImage = "";
		}
	}

	var images = cloudant.use('drone_images');
	images.list({"descending": true, "include_docs": true, "limit": 1}, function(err, body){
		if(err){
			console.error(err);
			res.status(404).send("Internal error");
		}else{
			if(body.rows[0] == undefined){
				res.status(404).send("No images found in database");
				return;
			}
			var filename = body.rows[0].id;
			images.attachment.get(filename, "image", function(err, body){
				if(err){ // Would reflect data input error
					console.error(err);
					res.status(404).send(err.message);
				}else{
					res.set('Content-Type', 'image/jpeg');
					res.send(body);
					// Cache response - need to append original filename?
					fs.writeFile(uploadDir+filename, body, function(err){
						if(err){
							console.error(err);
						}else{
							latestImage = uploadDir+filename;
						}
					});
				}
			});
		}
	});
}

function serveSensorDataRouter(req, res) {

	// Get data from the database

	var timeFrom = parseInt(req.params.timeFrom) || 0;
	var timeUntil = parseInt(req.params.timeUntil) || new Date().getTime();

	var returnAll = true;
	var query = {
		selector: {
			"$and": [
				{time: {"$gt": timeFrom}},
				{time: {"$lt": timeUntil}}]
		}
	};

	var type = req.params.type;
	if (type != undefined) {
		returnAll = false;
		query.fields = ['time', 'location', type];

		var minVal = req.query.minVal;
		if (minVal != undefined) {
			query.selector.$and.push({[type]: {"$gt": parseFloat(minVal)}})
		}

		var maxVal = req.query.maxVal;
		if (maxVal != undefined) {
			query.selector.$and.push({[type]: {"$lt": parseFloat(maxVal)}})
		}
	}


	console.log(JSON.stringify(query));
	cloudant.use("sensorlog").find(query, function(err, result){
		if(err){
			console.error("[sensors.request] " + err);
			console.error(JSON.stringify(query));
			res.status(500).send("Request error. Malformed?");
			return;
		}
		if(result === undefined){
			res.status(204).send("Empty return");
			return;
		}
		if(returnAll) {
			result.docs.forEach(function (doc) {
				delete doc._id;
				delete doc._rev;

			});
		}
		var data = JSON.stringify(result.docs);
		res.status(200).send(data);
	});

}

function serveSensorData(req, res) {

	// Get data from the database

	var timeFrom = req.query.timeFrom || 0;
	var timeUntil = req.query.timeUntil || new Date().getTime().toString();
	var returnAll = true;
	var query = {
		selector: {
			"$and": [
				{_id: {"$gt": timeFrom.toString()}},
				{_id: {"$lt": timeUntil.toString()}}]
		}
	};

	var type = req.query.type;
	if (type != undefined) {
		returnAll = false;
		query.fields = ['time', 'location', type];

		var minVal = req.query.minVal;
		if (minVal != undefined) {
			query.selector.$and.push({[type]: {"$gt": parseFloat(minVal)}})
		}

		var maxVal = req.query.maxVal;
		if (maxVal != undefined) {
			query.selector.$and.push({[type]: {"$lt": parseFloat(maxVal)}})
		}
	}


	console.log(JSON.stringify(query));
	cloudant.use("sensorlog").find(query, function(err, result){
		if(err){
			console.error("[sensors.request] " + err);
			console.error(JSON.stringify(query));
			res.status(500).send();
			return;
		}
		if(result === undefined){
			res.status(204).send("Empty return");
			return;
		}
		if(returnAll) {
			result.docs.forEach(function (doc) {
				delete doc._id;
				delete doc._rev;
			});
		}
		var data = JSON.stringify(result.docs);
		res.status(200).send(data);
	});

}

function serveGPSData(req, res){
	// Get data from the database

	var timeFrom = parseInt(req.params.timeFrom) || 0;
	var timeUntil = parseInt(req.params.timeUntil) || new Date().getTime();

	var query = {
		selector: {
			"$and": [
				{time: {"$gt": timeFrom}},
				{time: {"$lt": timeUntil}}]
		}
	};

	console.log(JSON.stringify(query));
	cloudant.use("positionlog").find(query, function(err, result){
		if(err){
			console.error("[position.request] " + err);
			console.error(JSON.stringify(query));
			res.status(500).send("Request error. Malformed?");
			return;
		}
		if(result === undefined){
			res.status(204).send("Empty return");
			return;
		}
		result.docs.forEach(function (doc) {
				delete doc._id;
				delete doc._rev;

		});

		var data = JSON.stringify(result.docs);
		res.status(200).send(data);
	});

}

function serveImagesInformation(req, res){
	cloudant.use('drone_images').list({}, function(err, response){
		if(err){
			console.error(err);
			res.status(500).send("Internal error.");
		} else {
			response.rows.forEach(function(row){
				delete row.value;
				delete row.key;
			});
			res.status(200).send(response.rows);
		}
	});
}

function serveImage(req, res){
	cloudant.use('drone_images').attachment.get(req.params.docID, "image", function(err, image){
		if(err){
			console.error(err.description);
			res.status(404).send("No image found");
		} else {
			res.set('Content-Type', 'image/jpeg').status(200).send(image);
		}
	});
}


//////////////// IBM Service Functionality //////////////
function classifyImage(imageName, imagePath, body){
	var imageFile = fs.createReadStream(imagePath);

	var params = { images_file: imageFile };
	var start = (new Date()).getTime();

	imageRecognition.classify(params, function(err, results){
		if(err){
			console.error('[image.recognise]: ' + err);
		}else{
			console.log("Recognition Duration: " + ((new Date()).getTime() - start));
			var labels = results.images[0].scores;
			var anyLabel = IandC.processImageLabels(labels,  body.time, body.location);
			//console.log("Image Recognised: " + anyLabel);
		}
	});
}

/*
function speechRecognition(audiofileName, audiofilePath, body){
	console.log("Received " + audiofilePath);

	if(audiofilePath.endsWith(".mp3")){
		convertMP3toWAV(audiofilePath);
		audiofilePath = audiofilePath.replace(".mp3", ".wav");
	}

	console.log(audiofilePath);

	var params = {
		audio: "file",
		content_type:"audio/wav",
		model:"en-US_BroadbandModel"
	};


	var file  = fs.createReadStream(audiofilePath);

	console.log(file);

	speechToText.recognize(params, function(err, results){
		if(err){
			console.error('[speech.recognise]: ' + err);
		}else{
			if(typeof results.results[0] == "undefined"){
				return;
			}
			var transcript = results.results[0].alternatives[0].transcript;
			var speechRecognised = IandC.processSpeechTranscript(transcript, body.time, body.location);
			console.log("Speech Recognised: " + speechRecognised);
			if(speechRecognised){
				analyseTone(transcript);
			}
		}
	});
}
*/

function speechRecognition(audiofileName, audiofilePath, body) {
	console.log("Received " + audiofilePath);

	if(audiofilePath.endsWith(".mp3")) {
		convertMP3toWAV(audiofilePath, body, sendToSpeechRecognition);
	} else {
		sendToSpeechRecognition(audiofilePath, body)
	}
}

function sendToSpeechRecognition(audiofilePath, body) {
	var imageFile = fs.createReadStream(audiofilePath);

	var params = {
		audio: imageFile,
		content_type: "audio/wav",
		model: "en-US_BroadbandModel"
	};

	console.log("Sending.. " + imageFile.path);

	speechToText.recognize(params, function(err, results){
		if(err){
			console.error('[speech.recognise2]: ' + err);
		}else{
			if(typeof results.results[0] == "undefined"){
				return;
			}
			var transcript = results.results[0].alternatives[0].transcript;
			console.log("Speech Recognised: " + transcript);
			var speechRecognised = IandC.processSpeechTranscript(transcript, body.time, body.location);
			if(speechRecognised){
				analyseTone(transcript);
			}
		}
	});
}

function analyseTone(transcript){
	var params = {
		text: transcript
	};

	toneAnalysis.tone(params, function(err, results){
		if(err){
			console.error('[speech.toneAnalysis]: ' + err);
		}else{
			console.log(results.children);
		}
	});
}





function deviceStatusCallback(deviceType, deviceId, eventType, format, payload){
	if(deviceId == "drone"){
		processDroneUpdate(eventType, payload);
	}
}

function processDroneUpdate(eventType, payload){
	// Depends on format of data we get etcccc
	switch(eventType){
		case "sensors":
			IandC.updateSensorReadings(JSON.parse(payload));
			break;
		case "temperature":
			IandC.updateTemp(payload);
			break;
		case "airPurity":
			IandC.updateAirPurity(payload);
			break;
		case "position":
			IandC.updatePosition(payload);
			break;
		case "ping":
			break;
		default:
			console.log("Unknown eventType from drone: " + eventType);
	}
}

/////////////////// DashDB ////////////////////////
function checkUserCredentials(credentials, callback){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		var error;
		if(err){
			console.error("[users.connect] " + err.message);
			error = false;
			callback(error);
			return;
		}
		var query = "SELECT * FROM USERS WHERE \"username\" = ? AND \"password\" = ?";

		connection.query(query, [credentials.name.replace(/\W/g, ''), credentials.pass.replace(/\W/g, '')], function(err, response){
			if(err){
				console.error("[users.select] " + err.message);
				error = false;
			}
			if(response.length == 0){
				//console.log("Invalid username or password");
				error =  false;
			} else {
				//console.log("User " + credentials.name + " found");
				error = true;
			}
			callback(error);
		});
	});
}

function checkUserCredentials2(credentials, callback){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		var error;
		if(err){
			console.error("[users.connect] " + err.message);
			callback(null);
			return;
		}
		var query = "SELECT * FROM USERS WHERE \"username\" = ?";
		credentials.pass.replace(/\W/g, '')

		connection.query(query, [credentials.name.replace(/\W/g, '')], function(err, response){
			if(err){
				console.error("[users.select] " + err.message);
				callback(false);
			}
			if(response.length == 0){
				console.log("Invalid username or password");
				callback(false);
			} else { // only a single row
				console.log("User " + credentials.name + " found");
				// Test password
				var salt = response[0].salt; //.salt
				hash.update(credentials.pass + salt);

				var toCheck = hash.digest('hex');

				if(response[0].password == toCheck){
					callback(true);
				} else {
					callback(false);
				}




				error = true;
			}
			//callback(error);
		});



	});
}

function insertUserCredentials(credentials){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		if(err){
			console.error("Error connecting to SQL database");
			console.error(err.message);
			return false;
		}
		var query = "INSERT INTO USERS VALUES (?, ?, ?, ?)";
		connection.query(query, [credentials.username, credentials.password, credentials.first_name, credentials.last_name], function(err){
			if(err) {
				console.error("Couldn't insert user: " + credentials.username);
				return false;
			} else{
				console.log("User: " + credentials.username + " successfully added to database");
				return true;
			}
		});

	});
}

function insertUserCredentials2(credentials, callback){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		if(err){
			console.error("Error connecting to SQL database");
			console.error(err.message);
			callback(null);
		}
		var query = "INSERT INTO USERS VALUES (?, ?, ?, ?, ?)";
		var salt = crypto.randomBytes(4).toString('hex'); //string of length 8
		connection.query(query, [credentials.username, credentials.password, salt, credentials.first_name, credentials.last_name], function(err){
			if(err) {
				console.error("Couldn't insert user: " + credentials.username);
				callback(false);
			} else{
				console.log("User: " + credentials.username + " successfully added to database");
				callback(true);
			}
		});

	});
}

function insertDroneCredentials(credentials){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		if(err){
			console.error("Error connecting to SQL database");
			console.error(err.message);
			return false;
		}
		var query = "INSERT INTO DRONE VALUES (?, ?, ?)";
		connection.query(query, [credentials.number, credentials.name, credentials.owner], function(err){
			if(err) {
				console.error("Couldn't insert drone: " + credentials.name);
				return false;
			} else{
				console.log("Drone: " + credentials.number + ":" + credentials.name + " successfully added to database");
				return true;
			}
		});

	});
}

function requireLogin (req, res, next) {
	if (!req.session.user) {
		res.redirect('/login');
	} else {
		next();
	}
}

function serveUserInformation(req, res){
	dashDB.open(dashDBCreds.ssldsn, function(err, connection){
		var error;
		if(err){
			console.error("[users.connect] " + err.message);
			res.status(500).send("Server connection error");
			return;
		}
		var query = "SELECT \"first_name\", \"last_name\", \"username\" FROM USERS WHERE \"username\" = ?";
		connection.query(query, [req.params.username.replace(/\W/g, '')], function(err, response){
			if(err){
				console.error("[users.select] " + err.message);
				res.status(500).send("Server connection error");
			} else if(response.length == 0){
				res.status(404).send("User not found");
			} else {
				res.status(200).send(response[0]);
			}
		});
	});
}

///////////   File Functions //////////////////
function validateJPEG(filePath){
	var buffer = readChunk.sync(filePath, 0, 12);
	var type = imageType(buffer);
	if(type == null){
		console.log("Not an image type: " + filePath);
		return false;
	}
	if( (type.ext == 'jpg'||type.ext == 'jpeg') && type.mime == 'image/jpeg' ){
		return true;
	} else {
		console.log("Invalid image type: " + filePath);
		return false;
	}

}

function validateAudioFile(filePath){
	var buffer = readChunk.sync(filePath, 0, 262);
	var type = fileType(buffer);
	if(type == null){
		console.log("Not a known file type: " + filePath);
		return false;
	}
	if( type.ext == 'wav' && (type.mime == 'audio/wav' || type.mime == 'audio/x-wav')) {
		return true;
	} else if (type.ext == 'mp3' && type.mime == 'audio/mpeg') {
		return true;
	} else {
		console.log("Invalid audio type: " + filePath + " " + type.mime);
		return false;
	}
}

function convertMP3toWAV(mp3File, body, sendToSpeechRecognition){

	var decoder = new lame.Decoder();

	var mp3FileStream = fs.createReadStream(mp3File);
	var wavFileStream = fs.createWriteStream(mp3File.replace(".mp3",".wav"));

	decoder.on('format', function(format){
		var writer = new wav.Writer(format);
		decoder.pipe(writer).pipe(wavFileStream);
	});

	mp3FileStream.pipe(decoder);

	decoder.on('finish', function(){
		console.log("Converted file");
		sendToSpeechRecognition(mp3File.replace(".mp3",".wav"), body);
	});

	function onFormat(format){
		var writer = new wav.Writer(format);
		decoder.pipe(writer).pipe(wavFileStream);
	}

}



// Test service directly
function testSpeechRecognition(fileName, res){

	var file  = fs.createReadStream(fileName);

	var params = {
		audio: file,
		content_type:"audio/wav",
		model:"en-US_BroadbandModel"
	};
	var start = (new Date()).getTime();

	speechToText.recognize(params, function(err, results){
		if(err){
			console.error('[speech.recognise]: ' + err);
		}else{
			if(! results.results){
				return;
			}
			console.log("Speech Recognition Duration: " + ((new Date()).getTime() - start));
			var transcript = results.results[0].alternatives[0].transcript;
			res.status(200).send(transcript);
		}
	});
}

function testImageRecognition(imagePath, res, body){
	var file = fs.createReadStream(imagePath);

	var params = { images_file: file };
	var start = (new Date()).getTime();

	imageRecognition.classify(params, function(err, results){
		if(err){
			console.error('[image.recognise]: ' + err);
		}else{
			console.log("Image Recognition Duration: " + ((new Date()).getTime() - start));
			var labels = results.images[0].scores;
			res.status(200).send(labels[0]);
		}
	});
}

function createIndexes(databaseName, field) {
	var database = cloudant.use(databaseName);

	var index = {
		name : field,
		type : 'json',
		ddoc : 'indexDesignDoc',
		index : {
			fields : [field]
		}
	};

	database.index(index, function(err, response){
		if(err){
			console.error("Error " + err);
			return;
		}
		console.log(response.result)
	});
};