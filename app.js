	/*eslint-env node*/

	var express = require('express');
	var bodyParser = require('body-parser');
	var multer = require('multer');
	var findRemoveSync = require('find-remove');
	var fs = require ('fs');
	var cfenv = require('cfenv');
	var auth = require('basic-auth');
	var session = require('client-sessions');
	var lame = require ('lame');
	var wav = require('wav');

	var logger = require('./lib/logger.js');

	var checkUserCredentials = require('./lib/functions.js').sql.checkUserCredentials;
	
	var uploadDir = "uploads/";

	var app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));


	// Get the app environment from Cloud Foundry
	var appEnv = cfenv.getAppEnv();

	////////////////////////////////////////////////////


	// serve the files out of ./public as our static files
	app.use(express.static(__dirname + '/public'));

	app.use(session({
		cookieName: 'session',
		secret: 'JFuqTUOPdRNtYHc0c4Yx',
		duration: 30 * 60 * 1000,
		activeDuration: 5 * 60 * 1000
	}));

	//app.use('/api/', router);

	var router2 = require('./lib/router.js');
	app.use('/api/', router2);


	app.enable('trust proxy');
/*
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

	app.post('/login', function(req, res) {
		var creds = auth(res);
		if (!creds) {
			res.status(400).send("Please provide username and password.\n");
		} else if (creds.name == req.session.user){
			res.status(200).send("Already logged in");
		} else {
			checkUserCredentials(creds, function(response){
				if (response.valid){
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
		res.status(200).send(req.secure);
		//res.status(200).send("Please login by POSTing username and password.\n");
	});


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