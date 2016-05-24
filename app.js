	var express = require('express');
	var bodyParser = require('body-parser');
	var multer = require('multer');
	var findRemoveSync = require('find-remove');
	var cfenv = require('cfenv');
	var auth = require('basic-auth');
	var session = require('client-sessions');
	var https=require('https');

	// Require logging module
	var logger = require('./lib/logger.js');

	// Load select login functions
	var checkUserCredentials = require('./lib/functions.js').sql.checkUserCredentials;
	var login = require('./lib/functions.js').login;
	var dash_login = require('./lib/functions.js').dash_login;

	// Where all uploaded files will be stored
	var uploadDir = "./uploads/";

	// Create express server object, add parsing middleware
	var app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	// Add websocket server to the application
	var expressWs = require('express-ws')(app);

	// Get the app environment from Cloud Foundry
	var appEnv = cfenv.getAppEnv();

	////////////////////////////////////////////////////

	// Use client-side session middleware. Secret is an encryption key
	app.use(session({
		cookieName: 'session',
		secret: 'JFuqTUOPdRNtYHc0c4YxXQNZ9CHGoP',
		duration: 30 * 60 * 1000,
		activeDuration: 5 * 60 * 1000
	}));

	// Load the router, pass it the websocket server instance, apply to app /api
	var router = require('./lib/router.js');
	router.setWsInstance(expressWs.getWss());
	app.use('/api/', router);


	// Enforce HTTPS when running in the cloud
	app.enable('trust proxy');
	// Disable cos testing doesn't like it..?
	// if (process.env.VCAP_SERVICES) {
	// 	logger.info("Forcing HTTPS");
	// 	app.use (function (req, res, next) {
	// 		if (req.secure) {
	// 			// request was via https, so do no special handling
	// 			//logger.info("Request for " + req.url);
	// 			next();
	// 		} else {
	// 			// request was via http, so redirect to https
	// 			var x = 'https://' + req.headers.host + req.url;
	// 			logger.info("Redirecting to " + x);
	// 			res.redirect('https://' + req.headers.host + req.url);
	// 		}
	// 	});
	// }

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

	// Legacy login function. Should be deleted soon
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

	// Login details should be posted, not a get
	app.get('/login', function(req, res){
		res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
		res.status(400).send("Please login by POSTing username and password.\n");
	});

	// Post command for command-line interface (pi) 	
	app.post('/login', login);

	// Dashboard login for browser
	app.get('/loginPage', function(req, res) {
		if(auth(res)) {
			dash_login(req, res)
		} else {
			res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
			res.status(401).send("Please provide username and password.\n");
		}
	});

	// Ensure that the dashboard restricts access
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

	// Logout functionality
	app.get('/logout', function(req, res){
		req.session.reset();
	});

	// Serve the files out of ./public as static files
	app.use(express.static(__dirname + '/public'));

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

