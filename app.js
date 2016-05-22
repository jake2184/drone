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
	var https=require('https');


	var logger = require('./lib/logger.js');

	var checkUserCredentials = require('./lib/functions.js').sql.checkUserCredentials;
	var login = require('./lib/functions.js').login;
	var dash_login = require('./lib/functions.js').dash_login;
	
	var uploadDir = "./uploads/";

	var app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	var expressWs = require('express-ws')(app);

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

	var router = require('./lib/router.js');
	router.setWsInstance(expressWs.getWss());
	

	router.ws('/:dronename/audio/stream/upload', function(ws, req){
		ws.send("Successfully connected");

		ws.on('message', function(msg){
			var clients = expressWs.getWss().clients;
			for(var i = 0; i < clients.length; i++){

				if(clients[i].upgradeReq.originalUrl.indexOf("listen") > -1){
					clients[i].send(msg);
				}
			}
		});
	});

	router.ws('/:dronename/audio/stream/talk', function(ws, req){
		ws.send("Successfully connected");

		ws.on('message', function(msg){
			var clients = expressWs.getWss().clients;
			for(var i = 0; i < clients.length; i++){

				if(clients[i].upgradeReq.originalUrl.indexOf("download") > -1){
					clients[i].send(msg);
				}
			}
		});
	});



	app.use('/api/', router);



	app.enable('trust proxy');
	if (process.env.VCAP_SERVICES) {
		logger.info("Forcing HTTPS");
		app.use (function (req, res, next) {
			if (req.secure) {
				// request was via https, so do no special handling
				//logger.info("Request for " + req.url);
				next();
			} else {
				// request was via http, so redirect to https
				var x = 'https://' + req.headers.host + req.url;
				logger.info("Redirecting to " + x);
				res.redirect('https://' + req.headers.host + req.url);
			}
		});
	}

    //
	// // Add a handler to inspect the req.secure flag (see
	// // http://expressjs.com/api#req.secure). This allows us
	// // to know whether the request was via http or https.
	// */
	// app.use (function (req, res, next) {
	// 	if (req.secure) {
	// 		// request was via https, so do no special handling
	// 		logger.info("Request for " + req.url);
	// 		next();
	// 	} else {
	// 		// request was via http, so redirect to https
	// 		var x = 'https://' + req.headers.host + req.url;
	// 		logger.info("Redirecting to " + x);
	// 		res.redirect('https://' + req.headers.host + req.url);
	// 	}
	// });



	////////// REST FUNCTIONS ////////////////////

	app.post('/loginLegacy', function(req, res) {
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
					req.session.drones = response.drones;
					res.status(200).send("Logged in successfully.\n");
				} else{
					res.status(403).send("Invalid username or password\n");
				}
			});
		}
	});

	
	app.post('/login', login);

	app.get('/loginPage', function(req, res) {
		if(auth(res)) {
			dash_login(req, res)
		} else {
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			res.status(401).send("Please provide username and password.\n");
		}
	});


	app.use('/dashboard/app', function(req, res, next){
		if(req.session.user){
			next();
		} else if (auth(res)){
			dash_login(req, res)
		} else{
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			res.status(401).send("Please provide username and password.\n");
		}
	});

	app.get('/login', function(req, res){
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		res.status(400).send("Please login by POSTing username and password.\n");
	});

	app.get('/logout', function(req, res){
		req.session.reset();
	});

	// Clean up uploads
	setInterval(function() {
		logger.info("Checking "+ __dirname + '/' + uploadDir);
		var removed = findRemoveSync(__dirname + '/' + uploadDir, {age: {seconds: 3600}});
	}, 3600000);


	module.exports = app;
	
	// Start server on the specified port and binding host
	var port = process.env.VCAP_APP_PORT || 8080;
	app.listen(port, function() {
		logger.info("server starting on " + appEnv.url + " port " + port);
	});

