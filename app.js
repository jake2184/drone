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

	var logger = require('./lib/logger.js');


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
		logger.info("Cloud Detected");
		services = JSON.parse(process.env.VCAP_SERVICES);
	} else {
		try{
			logger.info("Local Detected");
			services = require('./node_modules/vcap_services/VCAP_SERVICES.json');
		} catch (e){
			logger.error(e);
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
		logger.error("No Cloudant credentials supplied in VCAP_SERVICES.");
		process.exit(1);
	} else if(typeof imageRecognitionCreds === "undefined"){
		logger.error("No Image Recognition credentials supplied in VCAP_SERVICES.");
		process.exit(1);
	} else if(typeof speechToTextCreds === "undefined"){
		logger.error("No Speech to Text credentials supplied in VCAP_SERVICES.");
		process.exit(1);
	} else if(typeof toneAnalysisCreds === "undefined"){
		logger.error("No Tone Analysis credentials supplied in VCAP_SERVICES.");
		//process.exit(1);
	}else if(typeof mqttCreds === "undefined"){
		logger.error("No IoT credentials supplied in VCAP_SERVICES.");
		process.exit(1);
	}else if(typeof dashDBCreds === "undefined"){
		logger.error("No dashDB credentials supplied in VCAP_SERVICES.");
		process.exit(1);
	}


	/////////////// Initialise services ///////////
	var username = cloudantCreds.username;
	var password = cloudantCreds.password;
	var cloudant = Cloudant({account:username, password:password});
	//logger.info("Cloudant: " + username + " " + password);

	username = imageRecognitionCreds.username;
	password = imageRecognitionCreds.password;
	var imageRecognition = watson.visual_recognition({
		version:'v2-beta',
		version_date:'2015-12-02',
		username:username,
		password:password
	});
	//logger.info("Recognition: " + username + " " + password);

	username = speechToTextCreds.username;
	password = speechToTextCreds.password;
	var speechToText = watson.speech_to_text({
		version: "v1",
		username:username,
		password:password
	});
	//logger.info("speechToText: " + username + " " + password);

	// username = toneAnalysisCreds.username;
	// password = toneAnalysisCreds.password;
	// var toneAnalysis = watson.tone_analyzer({
	// 	version: "v2-experimental",
	// 	username:username,
	// 	password:password
	// });
	//logger.info("Tone Analysis: " + username + " " + password);


	mqttCreds.id = 'server';
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
	//TODO fix access issues of routing
	var router = express.Router();

	router.all('/', requireLogin);

	router.delete('/*', function(req, res, next){
		if(req.session.role <= RoleEnum.USER){
			next();
		} else {
			res.status(401).send("Insufficient permission to DELETE");
		}
	});

	router.post('/*', function(req, res, next){
		if(req.session.role <= RoleEnum.USER){
			next();
		} else {
			res.status(401).send("Insufficient permission to POST");
		}
	});
	router.get('/*', function (req, res, next) {
		if(req.session.role <= RoleEnum.GUEST){
			next();
		} else {
			res.status(401).send("Insufficient permission to GET");
		}
	});

	// Retrieve all sensor data
	router.get('/sensors', function(req, res){
		serveSensorData(req, res);
	});
	// Retrieve sensor data, docs from time a to now
	router.get('/sensors/:timeFrom', function(req, res){
		serveSensorData(req, res);
	});
	// Retrieve sensor data, docs from time a to b
	router.get('/sensors/:timeFrom/:timeUntil', function(req, res){
		serveSensorData(req, res);
	});
	// Retrieve a type of sensor data, docs from time a to b
	router.get('/sensors/:timeFrom/:timeUntil/:type', function(req, res){
		logger.info("Serving data");
		serveSensorData(req, res);
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

	// Retrieve list of audio metadata
	router.get('/audio', function(req, res){
		serveAudioInformation(req, res);
	});
	// Retrieve audio from docID
	router.get('/audio/:docID', function(req, res){
		serveAudio(req, res);
	});


	router.post('/images/:docID', upload.single('image'), function(req, res){
		var valid = validateJPEG(req.file.path);
		if(!valid){
			res.status(400).send("Invalid file type - not jpeg.\n");
			fs.unlink(req.file.path);
		} else {
			res.status(200).send("File uploaded successfully.\n");
			latestImage = req.file.path;
			IandC.sendImageAlert();
			//classifyImage(req.file.originalname, req.file.path, req.body);
			insertImageIntoDatabase(req.file.originalname, req.file.path, req);
		}
	});
	router.delete('/images/:docID', function(req, res){
		deleteImageFromDatabase(req, res);
	});

	router.post('/audio/:docID', upload.single('audio'), function(req, res){
		var valid = validateAudioFile(req.file.path);
		if(!valid){
			res.status(400).send("Invalid file type - not wav.\n");
			fs.unlink(req.file.path);
		} else {
			res.status(200).send("File uploaded successfully.\n");
			latestAudio = req.file.path;
			speechRecognition(req.file.originalname, req.file.path, req.body);
			insertSpeechIntoDatabase(req.file.originalname, req.file.path, req);
		}
	});
	router.delete('/audio/:docID', function(req, res){
		res.status(200).send()
		// TODO
	});

	router.post('/users/:username', function(req, res){
		insertUserCredentials(req, res);
	});
	router.get('/users/:username', function(req, res){
		serveUserInformation(req, res);
	});
	router.delete('/users/:username', function(req, res){
		deleteUserCredentials(req, res);
	});


	router.param('timeFrom', function(req, res, next, timeFrom){
		if(/^\d+$/.test(timeFrom)){
			next();
		} else {
			res.status(400).send("timeFrom is not a number.");
		}
	});
	router.param('timeUntil', function(req, res, next, timeUntil){
		if(/^\d+$/.test(timeUntil)){
			next();
		} else {
			res.status(400).send("timeUntil is not a number.");
		}
	});
	router.param('docID', function(req, res, next, docID){
		if(docID == "latest"){
			if(req.url.indexOf("images") > -1) {
				retrieveLatestImage(res);
			} else if(req.url.indexOf("audio") > -1){
				retrieveLatestAudio(res);
			}
		} else {
			next();
		}
	});
	router.param('username', function(req, res, next, username){
		if(req.session.role <= RoleEnum.ADMIN || req.session.username == username){
			next();
		} else {
			res.status(404).send("Unauthorised to edit user information");
		}
	})



	////////////////////////////////////////////////////


	// serve the files out of ./public as our static files
	app.use(express.static(__dirname + '/public'));

	app.use(session({
		cookieName: 'session',
		secret: 'JFuqTUOPdRNtYHc0c4Yx',
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
			logger.info("hi");
			next();
		} else {
			// request was via http, so redirect to https
			logger.info("hi2");
			var x = 'https://' + req.headers.host + req.url;
			logger.info(x);
			res.redirect('https://' + req.headers.host + req.url);
		}
	});
	*/


	////////// REST FUNCTIONS ////////////////////

	// Retrieves the latest image from the database
	// app.get('/getLatestImage', function (req, res){
    //
	// 	retrieveLatestImage(res);
    //
	// });
    //
	// app.get('/getLatestImageSecure', requireLogin, function(req,res){
	// 	retrieveLatestImage(res);
	// });

	app.get('/getLatestGPS', function(req, res){
		var latlon = {lat: 51.485138, lon: -0.187755};
		res.status(200).send(JSON.stringify(latlon));
	});

	// // Retrieves the image recognition label set
	// app.get('/getLabels', function(req, res){
	// 	var params = {
	// 		'verbose': 1
	// 	};
	// 	imageRecognition.listClassifiers(params, function(err, labels){
	// 		if(err){
	// 			logger.error(err);
	// 			res.status(500).send();
	// 		} else {
	// 			res.status(200).send(JSON.stringify(labels));
	// 		}
	// 	});
	// });
    //
	// // Upload an image to the server from the drone. Saved to database and classified
	// app.post('/imageUpload', upload.single('image'), function (req, res){
    //
	// 	// Check security/validity of the file
	// 	var valid = validateJPEG(req.file.path);
	// 	if(!valid){
	// 		res.status(400).send("Invalid file type - not jpeg.\n");
	// 		fs.unlink(req.file.path);
	// 	} else {
	// 		res.status(200).send("File uploaded successfully.\n");
	// 		latestImage = req.file.path;
	// 		IandC.sendImageAlert();
	// 		classifyImage(req.file.originalname, req.file.path, req.body);
	// 		insertImageIntoDatabase(req.file.originalname, req.file.path, req.body);
	// 	}
	// });
    //
	// app.post('/imageUploadSecure', upload.single('image'), requireLogin, function (req, res){
    //
	// 	// Check security/validity of the file
	// 	var valid = validateJPEG(req.file.path);
	// 	if(!valid){
	// 		res.status(400).send("Invalid file type - not jpeg.\n");
	// 		fs.unlink(req.file.path);
	// 	} else {
	// 		res.status(200).send("File uploaded successfully.\n");
	// 		latestImage = req.file.path;
	// 		IandC.sendImageAlert();
	// 		//classifyImage(req.file.originalname, req.file.path, req.body);
	// 		//insertImageIntoDatabase(req.file.originalname, req.file.path, req.body);
	// 	}
    //
	// });
    //
	// // Upload a speech file to the server from the drone
	// app.post('/speechUpload', upload.single('audio'), function (req, res){
	// 	logger.info("Received sound: " + req.file.originalname);
    //
	// 	// Check security/validity of the file
	// 	var valid = validateAudioFile(req.file.path);
	// 	if(!valid){
	// 		res.status(400).send("Invalid file type - not wav.\n");
	// 		fs.unlink(req.file.path);
	// 	} else {
	// 		res.status(200).send("File uploaded successfull.\n");
	// 		latestAudio = req.file.path;
	// 		speechRecognition(req.file.originalname, req.file.path);
	// 		insertSpeechIntoDatabase(req.file.originalname, req.file.path, req.body);
	// 	}
    //
	// });
    //
	// app.post('/speechUploadSecure', upload.single('audio'), requireLogin, function (req, res){
    //
	// 	// Check security/validity of the file
	// 	var valid = validateAudioFile(req.file.path);
	// 	if(!valid){
	// 		res.status(400).send("Invalid file type - not wav.\n");
	// 		fs.unlink(req.file.path);
	// 	} else {
	// 		res.status(200).send("File uploaded successfully.\n");
	// 		latestAudio = req.file.path;
	// 		speechRecognition(req.file.originalname, req.file.path, req.body);
	// 		insertSpeechIntoDatabase(req.file.originalname, req.file.path, req.body);
	// 	}
	// });

	app.post('/login', function(req, res){
		var creds = auth(res);
		if(!creds){
			res.status(400).send("Please provide username and password.\n");
		} else {
			checkUserCredentials(creds, function(response){
				if(response == null){
					res.status(500).send("Please try again later.");

				}else if (response.valid){
					req.session.user = response.username;
					req.session.role = response.role;
					res.status(200).send("Logged in successfully.\n");
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
		logger.info("Testing");
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

	// app.get('/getSensorData', function(req, res){
    //
	// 	// Get data from the database
	// 	serveSensorData(req, res);
    //
	// });
    //
	// app.get('/insertUsers', function (req,res){
	// 	var creds = auth(res);
	// 	insertUserCredentials(creds, function(found){
	// 		if(found){
	// 			req.session.user = creds.name;
	// 			res.status(200).send("Logged in successfully.\n");
	// 		}else if (found == null){
	// 			res.status(500).send("Please try again later.");
	// 		} else{
	// 			res.status(403).send("Invalid username or password\n");
	// 		}
	// 	});
	// });
	/////////////////////////////////////////////////////

	////////////// Caching/Performance Improvement ///

	var latestImage = "";
	var latestAudio = "";


	// Clean up uploads
	setInterval(function() {
		logger.info("Checking "+ __dirname + '/' + uploadDir);
		var removed = findRemoveSync(__dirname + '/' + uploadDir, {age: {seconds: 3600}});
	}, 3600000);


	// Start server on the specified port and binding host
	var port = process.env.VCAP_APP_PORT || 8080;
	app.listen(port, function() {
		logger.info("server starting on " + appEnv.url + " port " + port);
	});


	module.exports = app;

	/////////////////// Internal Functions /////////////


	//////////////// Cloudant Database ////////////////////
	function insertImageIntoDatabase(imageName, imagePath, req){
		//logger.info("Received " + imageName);
		// Read from uploads
		var imageData = fs.readFileSync(imagePath);
		var images = cloudant.use('drone_images');

		var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];

		images.multipart.insert({name: imageName, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
			if (err) {
				logger.error('[images.insert]: ', err.message);
			} else{
				logger.info("Saved image to database successfully.");
			}
		});
	}

	function deleteImageFromDatabase(req, res){
		// TODO fix this. text runs it instantly after insert
		cloudant.use('drone_images').get(req.params.docID, function(err, document){
			console.log(err)
			console.log(document)
			

			res.status(200).send()
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
				logger.error('[speech.insert]: ', err.message);
			} else{
				logger.info("Saved speech to database successfully.");
			}
		});
	}

	function retrieveLatestImage(res){
		if(latestImage != ""){
			try{
				var imageData = fs.readFileSync(latestImage);
				res.set('Content-Type', 'image/jpeg');
				logger.info("Sending 1 ");
				res.send(imageData);
				return;
			} catch (e){
				logger.error("Image Cache Error.");
				logger.error(e.message);
				latestImage = "";
			}
		}

		var images = cloudant.use('drone_images');
		images.list({"descending": true, "include_docs": true, "limit": 1}, function(err, body){
			if(err){
				logger.error(err);
				res.status(404).send("Internal error");
			}else{
				if(body.rows[0] == undefined){
					res.status(404).send("No images found in database");
					return;
				}
				var filename = body.rows[0].id;
				images.attachment.get(filename, "image", function(err, body){
					if(err){ // Would reflect data input error
						logger.error(err);
						res.status(404).send(err.message);
					}else{
						res.set('Content-Type', 'image/jpeg');
						res.send(body);
						logger.info("Sending 2 ");
						// Cache response - need to append original filename?
						fs.writeFile(uploadDir+filename, body, function(err){
							if(err){
								logger.error(err);
							}else{
								latestImage = uploadDir+filename;
							}
						});
					}
				});
			}
		});
	}
	
	function retrieveLatestAudio(res) {

		if (latestAudio != "") {
			try {
				var imageData = fs.readFileSync(latestAudio);
				res.set('Content-Type', 'audio/x-wav');
				logger.info("Sending 1 ");
				res.send(imageData);
				return;
			} catch (e) {
				logger.error("Image Cache Error.");
				logger.error(e.message);
				latestImage = "";
			}
		}

		var audio = cloudant.use('drone_audio');
		audio.list({"descending": true, "include_docs": true, "limit": 1}, function (err, body) {
			if (err) {
				logger.error(err);
				res.status(404).send("Internal error");
			} else {
				if (body.rows[0] == undefined) {
					res.status(404).send("No audio found in database");
					return;
				}
				var filename = body.rows[0].id;
				audio.attachment.get(filename, "audio", function (err, body) {
					if (err) { // Would reflect data input error
						logger.error(err);
						res.status(404).send(err.message);
					} else {
						res.set('Content-Type', 'audio/x-wav');
						res.send(body);
						logger.info("Sending 2 ");
						// Cache response - need to append original filename?
						fs.writeFile(uploadDir + filename, body, function (err) {
							if (err) {
								logger.error(err);
							} else {
								latestAudio = uploadDir + filename;
							}
						});
					}
				});
			}
		});
	}

	function serveSensorData(req, res) {

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

		var maxDocs = req.query.maxDocs;
		if (maxDocs === undefined){
			maxDocs = 100;
		}
		query.limit = maxDocs;

		logger.info(JSON.stringify(query));
		cloudant.use("sensorlog").find(query, function(err, result){
			if(err){
				logger.error("[sensors.request] " + err);
				res.status(500).send("Request error. Malformed?");
				return;
			}
			if(result === undefined){
				logger.info("Zero results found");
				res.status(204).send("Empty return");
				return;
			}
			if(returnAll) {
				result.docs.forEach(function (doc) {
					delete doc._id;
					delete doc._rev;

				});
			}
			logger.info("Discovered "+ result.docs.length + " documents");
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

		logger.info(JSON.stringify(query));
		cloudant.use("positionlog").find(query, function(err, result){
			if(err){
				logger.error("[position.request] " + err);
				logger.error(JSON.stringify(query));
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
				logger.error(err);
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
				logger.error(err.description);
				res.status(404).send("No image found");
			} else {
				res.set('Content-Type', 'image/jpeg').status(200).send(image);
			}
		});
	}

	function serveAudioInformation(req, res){
		cloudant.use('drone_audio').list({}, function(err, response){
			if(err){
				logger.error(err);
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

	function serveAudio(req, res){
		cloudant.use('drone_audio').attachment.get(req.params.docID, "audio", function(err, audio){
			if(err){
				logger.error(err.description);
				res.status(404).send("No audio found");
			} else {
				res.set('Content-Type', 'audio/x-wav').status(200).send(audio);
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
				logger.error('[image.recognise]: ' + err);
			}else{
				logger.info("Recognition Duration: " + ((new Date()).getTime() - start));
				var labels = results.images[0].scores;
				var anyLabel = IandC.processImageLabels(labels,  body.time, {latitude:body.latitude, longitude:body.longitude});
				//logger.info("Image Recognised: " + anyLabel);
			}
		});
	}

	/*
	function speechRecognition(audiofileName, audiofilePath, body){
		logger.info("Received " + audiofilePath);

		if(audiofilePath.endsWith(".mp3")){
			convertMP3toWAV(audiofilePath);
			audiofilePath = audiofilePath.replace(".mp3", ".wav");
		}

		logger.info(audiofilePath);

		var params = {
			audio: "file",
			content_type:"audio/wav",
			model:"en-US_BroadbandModel"
		};


		var file  = fs.createReadStream(audiofilePath);

		logger.info(file);

		speechToText.recognize(params, function(err, results){
			if(err){
				logger.error('[speech.recognise]: ' + err);
			}else{
				if(typeof results.results[0] == "undefined"){
					return;
				}
				var transcript = results.results[0].alternatives[0].transcript;
				var speechRecognised = IandC.processSpeechTranscript(transcript, body.time, body.location);
				logger.info("Speech Recognised: " + speechRecognised);
				if(speechRecognised){
					analyseTone(transcript);
				}
			}
		});
	}
	*/

	function speechRecognition(audiofileName, audiofilePath, body) {
		logger.info("Received " + audiofilePath);

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

		logger.info("Sending.. " + imageFile.path);

		speechToText.recognize(params, function(err, results){
			if(err){
				logger.error('[speech.recognise2]: ' + err);
			}else{
				if(typeof results.results[0] == "undefined"){
					return;
				}
				var transcript = results.results[0].alternatives[0].transcript;
				logger.info("Speech Recognised: " + transcript);
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
				logger.error('[speech.toneAnalysis]: ' + err);
			}else{
				logger.info(results.children);
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
				logger.info("Unknown eventType from drone: " + eventType);
		}
	}

	/////////////////// DashDB ////////////////////////

	var RoleEnum = Object.freeze({
		ADMIN : 1,
		USER : 2,
		GUEST : 3
	});

	function checkUserCredentials(credentials, callback){
		dashDB.open(dashDBCreds.ssldsn, function(err, connection){
			var error;
			if(err){
				logger.error("[users.connect] " + err.message);
				callback(null);
				return;
			}
			var query = "SELECT * FROM USERS WHERE \"username\" = ?";
			credentials.pass.replace(/\W/g, '')
			var toReturn = {};
			toReturn.valid = false;
			connection.query(query, [credentials.name.replace(/\W/g, '')], function(err, response){
				if(err){
					logger.error("[users.select] " + err.message);
					callback(toReturn);
				}
				if(response.length == 0){
					logger.info("Invalid username or password");
					callback(toReturn);
				} else { // only a single row
					logger.info("User " + credentials.name + " found");
					// Test password
					var salt = response[0].salt; //.salt

					var toCheck = crypto.createHash('sha256').update(credentials.pass + salt).digest('hex');

					if(response[0].password == toCheck){
						toReturn.valid = true;
						toReturn.username = response[0].username;
						toReturn.role = response[0].role;
						callback(toReturn);
					} else {
						callback(toReturn);
					}




					error = true;
				}
				//callback(error);
			});



		});
	}

	function insertUserCredentials(req, res){

		var username = req.body.username;
		var password = req.body.password;
		var first_name = req.body.first_name || null;
		var last_name = req.body.last_name || null;
		var role = req.body.role || RoleEnum.GUEST;

		if (username === undefined || password === undefined){
			res.send(400).send("Please POST 'username' and 'password' in JSON format")
			return;
		}

		dashDB.open(dashDBCreds.ssldsn, function(err, connection){
			if(err){
				logger.error("Error connecting to SQL database");
				logger.error(err.message);
				res.status(500).send("Database error");
			}
			var query = "INSERT INTO USERS VALUES (?, ?, ?, ?, ?, ?)";
			var salt = crypto.randomBytes(4).toString('hex'); //string of length 8
			//hash.update(password + salt);
			//var toAdd = hash.digest('hex');

			var toAdd = crypto.createHash('sha256').update(password + salt).digest('hex');
			connection.query(query, [username, first_name, last_name, salt, toAdd, role], function(err){
				if(err) {
					logger.error("Couldn't insert user: " + username);
					logger.error(err.message);
					res.status(400).send("Couldn't add user, username not unique?");
				} else{
					logger.info("User: " + username + " successfully added to database");
					res.status(200).send("User " + username + " was successfully added");
				}
			});

		});
	}

	function deleteUserCredentials(req, res){
		var username = req.params.username;

		dashDB.open(dashDBCreds.ssldsn, function(err, connection){
			if(err){
				logger.error("Error connecting to SQL database");
				logger.error(err.message);
				res.status(500).send("Database error");
			}
			var query = "DELETE FROM USERS WHERE \"username\" = ?";
			connection.query(query, [username], function(err){
				if(err) {
					logger.error("Couldn't delete user: " + username);
					logger.error(err.message);
					res.status(400).send("Couldn't delete user, username not found?");
				} else{
					logger.info("User: " + username + " successfully deleted from database");
					res.status(200).send("User " + username + " was successfully deleted");
				}
			});

		});

	}

	function insertDroneCredentials(credentials){
		dashDB.open(dashDBCreds.ssldsn, function(err, connection){
			if(err){
				logger.error("Error connecting to SQL database");
				logger.error(err.message);
				return false;
			}
			var query = "INSERT INTO DRONE VALUES (?, ?, ?)";
			connection.query(query, [credentials.number, credentials.name, credentials.owner], function(err){
				if(err) {
					logger.error("Couldn't insert drone: " + credentials.name);
					return false;
				} else{
					logger.info("Drone: " + credentials.number + ":" + credentials.name + " successfully added to database");
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
				logger.error("[users.connect] " + err.message);
				res.status(500).send("Server connection error");
				return;
			}
			var query = "SELECT \"first_name\", \"last_name\", \"username\" FROM USERS WHERE \"username\" = ?";
			connection.query(query, [req.params.username.replace(/\W/g, '')], function(err, response){
				if(err){
					logger.error("[users.select] " + err.message);
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
			logger.info("Not an image type: " + filePath);
			return false;
		}
		if( (type.ext == 'jpg'||type.ext == 'jpeg') && type.mime == 'image/jpeg' ){
			return true;
		} else {
			logger.info("Invalid image type: " + filePath);
			return false;
		}

	}

	function validateAudioFile(filePath){
		var buffer = readChunk.sync(filePath, 0, 262);
		var type = fileType(buffer);
		if(type == null){
			logger.info("Not a known file type: " + filePath);
			return false;
		}
		if( type.ext == 'wav' && (type.mime == 'audio/wav' || type.mime == 'audio/x-wav')) {
			return true;
		} else if (type.ext == 'mp3' && type.mime == 'audio/mpeg') {
			return true;
		} else {
			logger.info("Invalid audio type: " + filePath + " " + type.mime);
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
			logger.info("Converted file");
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
				logger.error('[speech.recognise]: ' + err);
			}else{
				if(! results.results){
					return;
				}
				logger.info("Speech Recognition Duration: " + ((new Date()).getTime() - start));
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
				logger.error('[image.recognise]: ' + err);
			}else{
				logger.info("Image Recognition Duration: " + ((new Date()).getTime() - start));
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
				logger.error("Error " + err);
				return;
			}
			logger.info(response.result)
		});
	}