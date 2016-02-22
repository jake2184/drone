/*eslint-env node*/

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var findRemoveSync = require('find-remove');
//var AlchemyAPI = require('./alchemyapi');
var iandc = require('drone_interpret_and_control')

//var alchemyapi = new AlchemyAPI();

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
	  cb(null, './uploads/');
	},
	filename: function (req, file, cb) {
	  cb(null, Date.now() + '-' + file.originalname);
	}
});

var fs = require ('fs');
var Cloudant = require('cloudant');
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var upload = multer({ storage: storage });
app.upload = upload;

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


var services;
if (process.env.VCAP_SERVICES) {
	services = JSON.parse(process.env.VCAP_SERVICES);
} else {
	try{
		services = require('./node_modules/vcap_services/VCAP_SERVICES.json');
	} catch (e){
		console.error(e);
	}
}

var cloudantCreds, imageRecognitionCreds, speechToTextCreds, toneAnalysisCreds;
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

/////////////// Initialise services ///////////
var username = cloudantCreds.username;
var password = cloudantCreds.password;
var cloudant = Cloudant({account:username, password:password});
console.log("Cloudant: " + username + " " + password);

username = imageRecognitionCreds.username;
password = imageRecognitionCreds.password;
var imageRecognition = watson.visual_recognition({
	version:'v2-beta',
  	version_date:'2015-12-02',
	username:username,
	password:password});
console.log("Recognition: " + username + " " + password);

username = speechToTextCreds.username;
password = speechToTextCreds.password;
var speechToText = watson.speech_to_text({
	version: "v1",
	username:username,
	password:password
});
console.log("speechToText: " + username + " " + password);

username = toneAnalysisCreds.username;
password = toneAnalysisCreds.password;
var toneAnaysis = watson.tone_analyzer({
	version: "v2-experimental",
	username:username,
	password:password
});
console.log("Tone Analysis: " + username + " " + password);

mqttCreds.id = 'drone_nodes';
mqttCreds.type = 'application';
var IandC = new iandc(mqttCreds, cloudant);
console.log("IandC : " + mqttCreds.org);

var words = {name:"Fire" , score:0.7};
var docID = (new Date()).getTime().toString()
IandC.imageKeywords(words, docID, {lat: "0.1", lon:"0.2"} );
////////////////////////////////////////////////////


// serve the files out of ./public as our main files?
app.use(express.static(__dirname + '/public'));



////////// REST FUNCTIONS ////////////////////

app.get('/latest', function (req, res){
	retrieveLatestImage(res);
});

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

app.post('/image', upload.single('image'), function (req, res){
    console.log("Received file " + req.file.originalname);
	insertImageIntoDatabase(req.file.originalname, req.file.path, res);
	classifyUploadedImage(req.file.originalname, req.file.path);
});

app.post('/classifyImage', upload.single('toClassify'), function (req, res){
	classifyImage(req, res);
});

app.post('/recogniseSpeech', upload.single('toRecognise'), function (req, res){
	speechRecognition(req, res);
});

app.get('/toneAnalysis', function(req, res){
	analyseTone(req, res);
});

// app.get('/bum', function(req, res){
// 	alchemyapi.image_keywords('url', 'http://drone-nodes.eu-gb.mybluemix.net/latest', {}, function(response){
// 		console.log(response);
// 		console.log(response.imageKeywords);
// 		res.send(response.imageKeywords);
// 	});
// });

/////////////////////////////////////////////////////

// start server on the specified port and binding host

var port = process.env.VCAP_APP_PORT || 8080;
app.listen(port, function() {
    console.log("server starting on " + appEnv.url + " port " + port);
});

// Clean up uploads
setInterval(function() {
	console.log("Checking "+ __dirname + '/uploads');
    var removed = findRemoveSync(__dirname + '/uploads', {age: {seconds: 3600}});
}, 3600000);


// Internal Functions //

function insertImageIntoDatabase(imageName, imagePath, res){

	// Read from uploads
	imageData = fs.readFileSync(imagePath);
	images = cloudant.use('test');

	var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];
	var docID = (new Date()).getTime().toString();

	images.multipart.insert({name: imageName}, attach, docID, function(err, body) {
		if (err) {
			console.log('[images.insert] ', err.message);
			res.status(400).send("Could not insert image"); //change value?
		}else{
			res.status(200).send("Successfully uploaded image\n");
		}
    });

}

function classifyUploadedImage(imageName, imagePath){
	var file = fs.createReadStream(imagePath);

	var params = {
		images_file: file
	};

	imageRecognition.classify(params, function(err, results){
		if(err){
			return err;
		}else{
			var labels = results.images[0].scores;
			var anyLabel = IandC.imageKeywords(labels, imageName, {lat: "0.1", lon:"0.2"} );
			console.log("Recognised: " + anyLabel);
		}
	});
}

function retrieveLatestImage(res){
	var images = cloudant.use('test');
	images.list({"descending": true, "include_docs": true, "limit": 1}, function(err, body){
		if(err){
			console.log(err);
			res.status(404).send(err.message);
		}else{
			images.attachment.get(body.rows[0].id, "image", function(err, body){
				if(err){
					console.log(err);
					res.status(404).send(err.message);
				}else{
					console.log(body);
					res.set('Content-Type', 'image/jpeg');
					res.send(body);
				}
			});
		}
	});
}

function classifyImage(req, res){
	var file;
	if (req.file) {
		// file image
		console.log(req.file.path);
		file = fs.createReadStream(req.file.path);
	} else if (req.body.url && validator.isURL(req.body.url)) {
		// web image
		file = request(req.body.url.split('?')[0]);
	} else if (req.body.url && req.body.url.indexOf('images') === 0) {
		// local image
		file = fs.createReadStream(path.join('public', req.body.url));
	} else {
		// malformed url
		return { error: 'Malformed URL', code: 400 };
	}

	var params = {
		images_file: file
	};

	imageRecognition.classify(params, function(err, results){
		console.log(err);
		console.log(results.images[0].scores);
		if(err){
			return err;
		}else{
			res.send(results);
		}
	});
}

function speechRecognition(req, res){
	var file;
	console.log("Try");
	if (req.file) {
		// file image
		console.log(req.file.path);
		file = fs.createReadStream(req.file.path);
	} else if (req.body.url && validator.isURL(req.body.url)) {
		// web image
		file = request(req.body.url.split('?')[0]);
	} else if (req.body.url && req.body.url.indexOf('audio') === 0) {
		// local image
		file = fs.createReadStream(path.join('public', req.body.url));
	} else {
		// malformed url
		//return { error: 'Malformed URL', code: 400 };
	}

	var params = {
		audio: file,
		content_type:"audio/wav",
		model:"en-US_BroadbandModel"

	};

	speechToText.recognize(params, function(err, results){
		console.log(err);
		console.log(results.results);
		if(err){
			return err;
		}else{
			res.send(results.results[0].alternatives[0].transcript);
		}
	});
}

function analyseTone(req, res){
	var file;
	if (req.file) {
		// file image
		console.log(req.file.path);
		file = fs.createReadStream(req.file.path);
	} else if (req.body.url && validator.isURL(req.body.url)) {
		// web image
		file = request(req.body.url.split('?')[0]);
	} else if (req.body.url && req.body.url.indexOf('text') === 0) {
		// local image
		file = fs.createReadStream(path.join('public', req.body.url));
	} else {
		// malformed url
		//return { error: 'Malformed URL', code: 400 };
	}

	var params = {
		text: "I need a lot of help. I am in need."
	};

	toneAnaysis.tone(params, function(err, results){
		console.log(err);
		console.log(results.children);
		if(err){
			return err;
		}else{
			res.send(results.children);
		}
	});
}
