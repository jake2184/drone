var fs = require ('fs');
var cfenv = require('cfenv');
var iandc = require('./drone_interpret_and_control/drone_interpret_and_control');
var auth = require('basic-auth');
var readChunk = require('read-chunk');
var imageType = require('image-type');
var fileType = require('file-type');
var session = require('client-sessions');
var mqtt = require('./MqttHandler');
var lame = require ('lame');
var wav = require('wav');
var crypto = require('crypto');



var logger = require('winston');

var latestImage = "";
var latestAudio = "";

var uploadDir = "uploads/";

var services;
if (process.env.VCAP_SERVICES) {
    logger.info("Cloud Detected");
    services = JSON.parse(process.env.VCAP_SERVICES);
} else {
    try{
        logger.info("Local Detected");
        services = require('../node_modules/vcap_services/VCAP_SERVICES.json');
    } catch (e){
        logger.error(e);
    }
}


/////////////// Load Credentials //////////////
var mqttCreds;
for (var svcName in services) {
    if (svcName.match(/^iotf/)) {
        mqttCreds = services[svcName][0]['credentials'];
    }
}


mqttCreds.id = 'server';


var MQTT = new MqttHandler(mqttCreds, deviceStatusCallback);





var cloudant = require('./ibm_services').cloudant;
var imageRecognition = require('./ibm_services').imageRecognition;
var speechToText = require('./ibm_services').speechToText;
var dashDB = require('./ibm_services').dashDB;

var IandC = new iandc(MQTT, cloudant);


function handleAudioUpload(req, res){
    var valid = validateAudioFile(req.file.path);
    if(!valid){
        res.status(400).send("Invalid file type - not wav or mp3.\n");
        fs.unlink(req.file.path);
    } else {
        //res.status(200).send("File uploaded successfully.\n");
        latestAudio = req.file.path;
        insertAudioIntoDatabase(req, res);
        speechRecognition(req.file.originalname, req.file.path, req.body);
    }
}

function handleImageUpload(req, res) {
    var valid = validateJPEG(req.file.path);
    if (!valid) {
        res.status(400).send("Invalid file type - not jpeg.\n");
        fs.unlink(req.file.path);
    } else {
        //res.status(200).send("File uploaded successfully.\n");
        latestImage = req.file.path;
        IandC.sendImageAlert();
        insertImageIntoDatabase(req, res);
        classifyImage(req.file.originalname, req.file.path, req.body);
    }
}

function requireLogin (req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

function checkUserCredentials(credentials, callback){

    var query = "SELECT * FROM USERS WHERE \"username\" = ?";
    credentials.pass.replace(/\W/g, '');
    var toReturn = {};
    toReturn.valid = false;
    dashDB.query(query, [credentials.name.replace(/\W/g, '')], function(err, response){
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
        }
    });




}
//////////////// Cloudant Database ////////////////////

/** @module Cloudant */

/**
 * Insert image file into Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param req.file.path {String} Path of file to insert
 * @param req.file.originalname {String} Original name of file
 * @param req.body.time {Number} Timestamp in milliseconds since epoch
 * @param req.body.location {Number[]} Latitude and Longitude of file capture
 * @param res {Object} The response for the client
 */
function insertImageIntoDatabase(req, res){
    // Read from uploads
    var imageData = fs.readFileSync(req.file.path);
    var images = cloudant.use('drone_images');

    var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];

    images.multipart.insert({name: req.file.originalname, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
        if (err) {
            logger.error('[images.insert]: ', err.message);
            res.status(400).send("File upload failed.\n");
        } else{
            logger.info('[images.insert]: Saved image to database successfully.');
            res.status(200).send("File uploaded successfully.\n");
        }
    });
}

/**
 * Delete image file from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
function deleteImageFromDatabase(req, res){
    cloudant.use('drone_images').get(req.params.docID, function(err, document){
        if(err){
            logger.error('[images.delete]: ' + "Couldn't delete image");
            res.status(err.statusCode).send("Couldn't delete image\n");
        } else {
            cloudant.use('drone_images').destroy(req.params.docID, document._rev, function(){
                logger.info('[images.delete]: Successfully deleted image ' + req.params.docID);
                res.status(200).send("Successfully deleted image\n");
            });
        }
    });
}

/**
 * Insert audio file into Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param req.file.path {String} Path of file to insert
 * @param req.file.originalname {String} Original name of file
 * @param req.body.time {Number} Timestamp in milliseconds since epoch
 * @param req.body.location {Number[]} Latitude and Longitude of file capture
 * @param res {Object} The response for the client
 */
function insertAudioIntoDatabase(req, res){
    // Read from uploads
    var speechData = fs.readFileSync(req.file.path);
    var speechDB = cloudant.use('drone_audio');

    var attach = [{name: "audio", data: speechData, content_type: 'audio/x-wav'}]; //FIX

    speechDB.multipart.insert({name: req.file.originalname, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
        if (err) {
            logger.error('[audio.insert]: ', err.message);
            res.status(400).send("File upload failed.\n");
        } else{
            logger.info("Saved speech to database successfully.");
            res.status(200).send("Successfully uploaded image\n");
        }
    });
}

/**
 * Delete audio file from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
function deleteAudioFromDatabase(req, res){
    cloudant.use('drone_audio').get(req.params.docID, function(err, document){
        if(err){
            logger.error('[audio.delete]: ' + "Couldn't delete audio");
            res.status(err.statusCode).send("Couldn't delete audio\n");
        } else {
            cloudant.use('drone_audio').destroy(req.params.docID, document._rev, function(){
                logger.info('[audio.delete]: Successfully deleted audio ' + req.params.docID);
                res.status(200).send("Successfully deleted audio\n");
            });
        }
    });
}

/**
 * Retrieve latest image, from cache or Cloudant database
 * @param res {Object} The response for the client
 */
function retrieveLatestImage(req, res){
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

/**
 * Retrieve latest audio, from cache or Cloudant database
 * @param res {Object} The response for the client
 */
function retrieveLatestAudio(req, res) {

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

/**
 * Serve sensor data from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.timeFrom {String} Timestamp in milliseconds since epoch
 * @param req.params.timeTill {String} Timestamp in milliseconds since epoch
 * @param req.params.type {String} The type of sensor data to be retrieved
 * @param res {Object} The response for the client
 */
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
           // query.selector.$and.push({[type]: {"$gt": parseFloat(minVal)}})
        }

        var maxVal = req.query.maxVal;
        if (maxVal != undefined) {
           // query.selector.$and.push({[type]: {"$lt": parseFloat(maxVal)}})
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

/**
 * Serve GPS data from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.timeFrom {String} Timestamp in milliseconds since epoch
 * @param req.params.timeTill {String} Timestamp in milliseconds since epoch
 * @param res {Object} The response for the client
 */
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

/**
 * Serve Images list from Cloudant database
 * @param req {Object} The request from the client
 * @param res {Object} The response for the client
 */
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

/**
 * Serve image from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
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

/**
 * Serve audio information from Cloudant database
 * @param req {Object} The request from the client
 * @param res {Object} The response for the client
 */
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

/**
 * Serve audio file from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
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


/////////////////// MQTT //////////////////////////////
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


/** @module SQL */

/**
 * Insert user credentials into SQL database
 * @param req {Object} The request from the client
 * @param req.body.username {String} Username of the client
 * @param req.body.password {String} Password of the client
 * @param [req.body.first_name] {String} First Name
 * @param [req.body.last_name] {String} Last Name
 * @param [req.body.role=<RoleEnum.GUEST>] {String} Role
 * @param res {Object} The response for the client
 */
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

    var query = "INSERT INTO USERS VALUES (?, ?, ?, ?, ?, ?)";
    var salt = crypto.randomBytes(4).toString('hex'); //string of length 8
    var toAdd = crypto.createHash('sha256').update(password + salt).digest('hex');
    dashDB.query(query, [username, first_name, last_name, salt, toAdd, role], function(err){
        if(err) {
            logger.error("Couldn't insert user: " + username);
            logger.error(err.message);
            res.status(400).send("Couldn't add user, username not unique?");
        } else{
            logger.info("User: " + username + " successfully added to database");
            res.status(200).send("User " + username + " was successfully added");
        }
    });

}

/**
 * Delete user credentials from SQL database
 * @param req {Object} The request from the client
 * @param req.params.username {String} Username of the client
 * @param res {Object} The response for the client
 */
function deleteUserCredentials(req, res){
    var username = req.params.username;

    // Receive [] for success + failure..?

    var query = "DELETE FROM USERS WHERE \"username\" = ?";
    dashDB.query(query, [username], function(err, response){
        if(err) {
            logger.error("Couldn't delete user: " + username);
            logger.error(err.message);
            res.status(400).send("Couldn't delete user");
        } else{
            logger.info("User: " + username + " successfully deleted from database. Maybe.");
            res.status(200).send("User " + username + " was successfully deleted");
        }
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

/**
 * Serve user credentials from SQL database
 * @param req {Object} The request from the client
 * @param req.params.username {String} Username of the client
 * @param res {Object} The response for the client
 */
function serveUserInformation(req, res){
        var error;

        var query = "SELECT \"first_name\", \"last_name\", \"username\" FROM USERS WHERE \"username\" = ?";
        dashDB.query(query, [req.params.username.replace(/\W/g, '')], function(err, response){
            if(err){
                logger.error("[users.select] " + err.message);
                res.status(500).send("Server connection error");
            } else if(response.length == 0){
                res.status(404).send("User not found");
            } else {
                res.status(200).send(response[0]);
            }
        });
  
}


///////////   File Functions //////////////////
/** @module File operations */

/**
 * Validate image file
 * @param filePath {String} Path of the file to validate
 * @returns IsValid {boolean} If the file is a valid JPEG
 */
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

/**
 * Validate audio file
 * @param filePath {String} Path of the file to validate
 * @returns IsValid {boolean} If the file is a valid audio file
 */
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

/**
 * Convert mp3 file to wav before callback
 * @param mp3File {String} Path to mp3file to convert
 * @param body {Object} Body of original req
 * @param sendToSpeechRecognition {Function} dat function
 */
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

module.exports = {
    requireLogin : requireLogin,
    RoleEnum : RoleEnum,
    cloudant : {
        insertImageIntoDatebase : insertImageIntoDatabase,
        deleteImageFromDatabase : deleteImageFromDatabase,
        insertSpeechIntoDatabase : insertAudioIntoDatabase,
        deleteAudioFromDatabase : deleteAudioFromDatabase,
        retrieveLatestImage : retrieveLatestImage,
        serveSensorData : serveSensorData,
        serveGPSData : serveGPSData,
        serveImagesInformation : serveImagesInformation,
        serveImage : serveImage,
        serveAudioInformation : serveAudioInformation,
        serveAudio : serveAudio,
        retrieveLatestAudio : retrieveLatestAudio,
        handleAudioUpload : handleAudioUpload,
        handleImageUpload : handleImageUpload
    },
    sql : {
        checkUserCredentials: checkUserCredentials,
        insertUserCredentials : insertUserCredentials,
        deleteUserCredentials : deleteUserCredentials,
        serveUserInformation : serveUserInformation
    }
};