/*eslint-env node*/

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var findRemoveSync = require('find-remove');
var fs = require ('fs');
var Cloudant = require('cloudant');
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var iandc = require('drone_interpret_and_control')
var auth = require('basic-auth')

//var AlchemyAPI = require('./alchemyapi');
//var alchemyapi = new AlchemyAPI();

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, './uploads/');
	},
	filename: function (req, file, cb) {
	  cb(null, Date.now() + '-' + file.originalname);
	}
});

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var upload = multer({
	 storage: storage
	// ,
	// onFileUploadComplete: function(file, req, res ){
	// 	console.log("Received File");
	// 	res.send("Hi");
	// 	res.status(200).send("boo");
	// 	if(file.error){
	// 		res.send(file.error);
	// 	}else{
	// 		res.status(200).send("File uploaded successfully.")
	// 	}
	// }
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
var cloudantCreds, imageRecognitionCreds, speechToTextCreds, toneAnalysisCreds, mqttCreds;
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
  	}
}

/////////////// Test Credential Existance /////
if(typeof cloudantCreds === "undefined"){
	console.log("No Cloudant credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof imageRecognitionCreds === "undefined"){
	console.log("No Image Recognition credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof speechToTextCreds === "undefined"){
	console.log("No Speech to Text credentials supplied in VCAP_SERVICES.");
	process.exit(1);
} else if(typeof toneAnalysisCreds === "undefined"){
	console.log("No Tone Analysis credentials supplied in VCAP_SERVICES.");
	process.exit(1);
}else if(typeof mqttCreds === "undefined"){
	console.log("No IoT credentials supplied in VCAP_SERVICES.");
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
	password:password});
//console.log("Recognition: " + username + " " + password);

username = speechToTextCreds.username;
password = speechToTextCreds.password;
var speechToText = watson.speech_to_text({
	version: "v1",
	username:username,
	password:password
});
//console.log("speechToText: " + username + " " + password);

username = toneAnalysisCreds.username;
password = toneAnalysisCreds.password;
var toneAnaysis = watson.tone_analyzer({
	version: "v2-experimental",
	username:username,
	password:password
});
//console.log("Tone Analysis: " + username + " " + password);

mqttCreds.id = 'drone_nodes';
mqttCreds.type = 'application';
var IandC = new iandc(mqttCreds, cloudant);
//console.log("IandC : " + mqttCreds.org);


// Testing IandC //
var words = [ {name:"Fire" , score:0.7 }, {name:"Whut", score:0.6} ];
var docID = (new Date()).getTime().toString()
IandC.imageKeywords(words, docID, {lat: "0.1", lon:"0.2"} );
////////////////////////////////////////////////////


// serve the files out of ./public as our static files
app.use(express.static(__dirname + '/public'));




////////// REST FUNCTIONS ////////////////////

// Retrieves the latest image from the database - adapt to get from server?
app.get('/getLatestImage', function (req, res){
	retrieveLatestImage(res);
});

// Retrieves the image recognition label set
app.get('/getLabels', function(req, res){
	var params = {
		'verbose': 1
	};
	imageRecognition.listClassifiers(params, function(err, results){
		console.log(err);
		console.log(results);
		fs.writeFile("here.txt", JSON.stringify(results));
	});
})

// Upload an image to the server from the drone. Saved to database and classified
app.post('/imageUpload', upload.single('image'), function (req, res){
	console.log("Received image: " + req.file.originalname);
	res.status(200).send("File uploaded successfully.\n");
	// Check security/validity of the file
	latestImage = req.file.path;
	//classifyUploadedImage(req.file.originalname, req.file.path);
	//insertImageIntoDatabase(req.file.originalname, req.file.path);
});

app.post('/imageUploadSecure', upload.single('image'), function (req, res){
	var credentials = auth(req);
	if (!credentials || credentials.name !== 'Drone' || credentials.pass !== 'Pi') {
    	res.statusCode = 401;
    	res.setHeader('WWW-Authenticate', 'Basic realm="Bluemix"');
    	res.end('Access denied');
		return;
  	}
	console.log("Received image: " + req.file.originalname);
	res.status(200).send("File uploaded successfully.\n");
	// Check security/validity of the file
	latestImage = req.file.path;
	classifyUploadedImage(req.file.originalname, req.file.path);
	insertImageIntoDatabase(req.file.originalname, req.file.path);
});

// To classify a single image. Unused
app.post('/classifyImage', upload.single('toClassify'), function (req, res){
	classifyImage(req, res);
});

// Upload a speech file to the server from the drone
app.post('/speechUpload', upload.single('toRecognise'), function (req, res){
	console.log("Received sound: " + req.file.originalname);
	res.status(200).send("File uploaded successfully.\n");
	// Check security/validity of the file
	speechRecognition(req, res);
	insertSpeechIntoDatabase(req.file.originalname, req.file.path, res);
});


// app.get('/bum', function(req, res){
// 	alchemyapi.image_keywords('url', 'http://drone-nodes.eu-gb.mybluemix.net/latest', {}, function(response){
// 		console.log(response);
// 		console.log(response.imageKeywords);
// 		res.send(response.imageKeywords);
// 	});
// });

/////////////////////////////////////////////////////

////////////// Caching/Performance Improvement ///

var latestImage = ""; //TODO - replace with checking latest in uploads folder



// Clean up uploads
setInterval(function() {
	console.log("Checking "+ __dirname + '/uploads');
    var removed = findRemoveSync(__dirname + '/uploads', {age: {seconds: 3600}});
}, 3600/*000*/);


// Start server on the specified port and binding host
var port = process.env.VCAP_APP_PORT || 8080;
app.listen(port, function() {
	console.log("server starting on " + appEnv.url + " port " + port);
});

/////////////////// Internal Functions ////////

function insertImageIntoDatabase(imageName, imagePath, res){

	// Read from uploads
	imageData = fs.readFileSync(imagePath);
	images = cloudant.use('test'); //images

	var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];
	var docID = (new Date()).getTime().toString();

	images.multipart.insert({name: imageName}, attach, docID, function(err, body) {
		if (err) {
			console.log('[images.insert]: ', err.message);
		} else{
			console.log("Saved image to database successfully.");
		}
    });
}

function insertSpeechIntoDatabase(speechfileName, speechfilePath, res){

	// Read from uploads
	speechData = fs.readFileSync(speechfilePath);
	speechDB = cloudant.use('speech');

	var attach = [{name: "speech", data: speechData, content_type: 'image/jpeg'}];
	var docID = (new Date()).getTime().toString(); // Append original file name?

	speechDB.multipart.insert({name: speechfileName}, attach, docID, function(err, body) {
		if (err) {
			console.log('[speech.insert]: ', err.message);
		} else{
			console.log("Saved speech to database successfully.");
		}
    });
}

function classifyUploadedImage(imageName, imagePath){
	var file = fs.createReadStream(imagePath);

	var params = {
		images_file: file
	};
	var start = (new Date()).getTime();
	imageRecognition.classify(params, function(err, results){
		if(err){
			console.error('[image.recognise]: ' + err);
		}else{
			console.log("Recognition Duration: " + ((new Date()).getTime() - start));
			var labels = results.images[0].scores;
			var anyLabel = IandC.imageKeywords(labels, imageName, {lat: "0.1", lon:"0.2"} );
			console.log("Image Recognised: " + anyLabel);
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
			console.log("Image Cache Miss.");
			latestImage = "";
		}
	}

	var images = cloudant.use('test');
	images.list({"descending": true, "include_docs": true, "limit": 1}, function(err, body){
		if(err){
			console.error(err);
			res.status(404).send(err.message);
		}else{
			var filename = body.rows[0].id;
			images.attachment.get(filename, "image", function(err, body){
				if(err){
					console.error(err);
					res.status(404).send(err.message);
				}else{
					res.set('Content-Type', 'image/jpeg');
					res.send(body);
					// Cache response - need to append original filename?
					fs.writeFile("uploads/"+filename, body);
					latestImage = filename;
				}
			});
		}
	});
}

function classifyImage(req, res){
	var file;
		console.log(req.file.path);
		file = fs.createReadStream(req.file.path);


	var params = {
		images_file: file
	};

	imageRecognition.classify(params, function(err, results){
		console.log(err);
		console.log(results.images[0].scores);
		if(err){
			console.error(err);
			return err;
		}else{
			res.send(results);
		}
	});
}

function speechRecognition(req, res){
	var file  = fs.createReadStream(req.file.path);

	var params = {
		audio: file,
		content_type:"audio/wav",
		model:"en-US_BroadbandModel"
	};

	speechToText.recognize(params, function(err, results){
		if(err){
			console.error('[speech.recognise]: ' + err);
		}else{
			var transcript = results.results[0].alternatives[0].transcript;
			var speechRecognised = IandC.speechTranscript(transcript);
			console.log("Speech Recognised: " + speechRecognised);
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

	toneAnaysis.tone(params, function(err, results){
		if(err){
			console.error('[speech.toneAnalysis]: ' + err);
		}else{
			console.log(results.children);
		}
	});
}
