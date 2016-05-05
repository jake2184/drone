	/*eslint-env node*/

	var express = require('express');
	var bodyParser = require('body-parser');
	var multer = require('multer');
	var findRemoveSync = require('find-remove');
	var fs = require ('fs');
	var cfenv = require('cfenv');
	var auth = require('basic-auth');
	var readChunk = require('read-chunk');
	var imageType = require('image-type');
	var fileType = require('file-type');
	var session = require('client-sessions');
	var mqtt = require('./lib/MqttHandler');
	var lame = require ('lame');
	var wav = require('wav');

	var logger = require('./lib/logger.js');

	var uploadDir = "uploads/";

	var app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));


	// Get the app environment from Cloud Foundry
	var appEnv = cfenv.getAppEnv();

	////////////////////////////////////////////////////


	// serve the files out of ./public as our static files
	app.use(express.static(__dirname + '/documentation'));

	app.use(session({
		cookieName: 'session',
		secret: 'JFuqTUOPdRNtYHc0c4Yx',
		duration: 30 * 60 * 1000,
		activeDuration: 5 * 60 * 1000
	}));

	//app.use('/api/', router);

	var router2 = require('./lib/router.js');
	app.use('/api/', router2);

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


	app.get('/getLatestGPS', function(req, res){
		var latlon = {lat: 51.485138, lon: -0.187755};
		res.status(200).send(JSON.stringify(latlon));
	});

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

	/////////////////// DashDB ////////////////////////

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