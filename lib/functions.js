var fs = require ('fs');
var cfenv = require('cfenv');
var droneCoordinator = require('./drone_interpret_and_control/DroneCoordinator');
var auth = require('basic-auth');
var readChunk = require('read-chunk');
var imageType = require('image-type');
var fileType = require('file-type');
var mqtt = require('./MqttHandler');
var lame = require ('lame');
var wav = require('wav');
var crypto = require('crypto');
var logger = require('winston');


// Caching variables
var latestImage = {};
var latestAudio = {};
var uploadDir = "./uploads/";
var droneMappings = {}; // droneName : owner





var profile2 = {
    imageFile : fs.openSync('public/logs/images.csv', 'w'),
    audioFile : fs.openSync('public/logs/audio.csv', 'w'),
    images : {},
    audio : {},
    imageNo : 0,
    audioNo : 0,
    imageAdd : function(fileName, type, value){
        if(!this.images.hasOwnProperty(fileName)){
            this.images[fileName] = {
                size : [],
                upload : [],
                database : [],
                recognition : []
            };
            this.imageNo += 1;
        }
        this.images[fileName][type].push(value);
    },
    audioAdd : function(fileName, type, value){
        if(!this.audio.hasOwnProperty(fileName)){
            this.audio[fileName] = {
                size : [],
                upload : [],
                database : [],
                recognition : [],
                confidence : [],
                transcript : []
            };
            this.audioNo += 1;
        }
        this.audio[fileName][type].push(value);
    },
    writeImages : function(){
        var data = this.images;
        fs.writeSync(this.imageFile, 'filename,upload,database,recognition\n');
        for (var file in data) {
            if (data.hasOwnProperty(file)) {
                var imageData = data[file];
                for(var j=0; j<imageData.size.length; j++){
                    fs.writeSync(this.imageFile, this.csvify([
                        file,
                        imageData.upload[j],
                        imageData.database[j],
                        imageData.recognition[j]
                    ]));
                }
            }
        }
        fs.writeSync(this.imageFile, '\n\n');
        for (file in data) {
            if (data.hasOwnProperty(file)) {
                fs.writeSync(this.imageFile, file + ','  + JSON.stringify(data[file].labels) + '\n');
            }
        }

    },
    writeAudio : function(){
        var data = this.audio;
        fs.writeSync(this.audioFile, 'filename,upload,database,recognition,confidence,transcript\n');
        for (var file in data) {
            if (data.hasOwnProperty(file)) {
                var audioData = data[file];
                for(var j=0; j<audioData.size.length; j++){
                    fs.writeSync(this.audioFile, this.csvify([
                        file,
                        audioData.upload[j],
                        audioData.database[j],
                        audioData.recognition[j],
                        audioData.confidence[j],
                        audioData.transcript[j]
                    ]));
                }
            }
        }

    },
    csvify : function(array){
        var string = "";
        for(var i=0; i<array.length; i++){
            string += array[i] + ',';
        }
        return string + '\n';
    }
};

/////////////// Load Credentials //////////////
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

var mqttCreds;
for (var svcName in services) {
    if (svcName.match(/^iotf/)) {
        mqttCreds = services[svcName][0]['credentials'];
    }
}
mqttCreds.id = 'server';




/////////////// Load Services ////////////////
var cloudant = require('./ibm_services').cloudant;
var imageRecognition = require('./ibm_services').imageRecognition;
var speechToText = require('./ibm_services').speechToText;
var dashDB = require('./ibm_services').dashDB;

// Create MQTT client and DroneCoordinator
var MQTT = new MqttHandler(mqttCreds, deviceStatusCallback);
var DroneCoordinator = new droneCoordinator(MQTT, cloudant, sendUpdates);


// Websocket server instance
var wsInstance = {};
function setWsInstance(instance){
    wsInstance = instance;
}

//////////////// Misc //////////////////////

// Broadcast events/sensor readings/status updates to /api/updates/:username
function sendUpdates(droneName, eventType, payload, time){
    var clients = wsInstance.clients;
    var messageToSend;
    if(time == undefined){
        messageToSend = JSON.stringify({name: droneName, event: eventType, payload: payload});
    } else{
        messageToSend = JSON.stringify({name: droneName, event: eventType, payload: payload, time: parseInt(time)});
    }
    //console.log(messageToSend)
    if(!droneMappings.hasOwnProperty(droneName)){
        var query = "SELECT * FROM DRONES WHERE \"name\" = ?";
        dashDB.query(query, [droneName], function(err, response){
            if(err){
                logger.error("[drones.getOwner] " + err.message);
            } else if(response.length == 0){
                logger.error("[drones.getOwner] No drone in database with name " + droneName);
            } else {
                droneMappings[droneName] = response[0].owner;
                for(var i = 0; i < clients.length; i++){
                    if(clients[i].upgradeReq.originalUrl.indexOf("/updates/" + droneMappings[droneName]) > -1){
                        clients[i].send(messageToSend);
                    }
                }
            }
        });
    } else {
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].upgradeReq.originalUrl.indexOf("/updates/" + droneMappings[droneName]) > -1) {
                clients[i].send(messageToSend);
            }
        }
    }
}




//////////////// Cloudant Database ////////////////////
/** @module Cloudant */

function handleAudioUpload(req, res){
    var valid = validateAudioFile(req.file.path);
    if(!valid){
        res.status(400).send("Invalid file type - not wav or mp3.\n");
        fs.unlink(req.file.path);
    } else {
        //res.status(200).send("File uploaded successfully.\n");
        latestAudio[req.params.dronename] = req.file.path;
        insertAudioIntoDatabase(req, res);
        sendUpdates(req.params.dronename, 'audio');
        speechRecognition(req, res);
    }
}

/**
 * Middleware to hangle image file uploaddatabase
 * @param req {Object} The request from the client
 * @param req.params.dronename {String} The drone from which image originated
 * @param req.params.docID {String} The requested document id
 * @param req.file.path {String} Path of uploaded file 
 * @param req.file.originalname {String} Original name of file
 * @param req.body.time {Number} Timestamp in milliseconds since epoch
 * @param req.body.location {Number[]} Latitude and Longitude of file capture
 * @param res {Object} The response for the client
 */
function handleImageUpload(req, res) {
    var valid = validateJPEG(req.file.path);
    if (!valid) {
        res.status(400).send("Invalid file type - not jpeg.\n");
        fs.unlink(req.file.path);
    } else {
        //res.status(200).send("File uploaded successfully.\n");
        latestImage[req.params.dronename] = req.file.path;
        DroneCoordinator.sendImageAlert(req.params.dronename);
        insertImageIntoDatabase(req, res);
        sendUpdates(req.params.dronename, 'image');
        classifyImage(req, res);
    }
}

/**
 * Create Cloudant databases for given droneName
 * @param name {String} Provided drone name
 */
function createCloudantDatabases(name){
    name = name.toLowerCase();

    var toCreate = [
        "_images", "_audio", "_sensorlog", "_eventlog", "_positionlog"
    ];

    for(var i=0; i<toCreate.length; i++){
        (function(databaseName){
            cloudant.db.create(databaseName, function(err, response){
                if(err){
                    logger.error("Couldn't create database "+ databaseName + " for drone " + name);
                    logger.error(err.message);
                } else { // Check for if ok not true
                    logger.info("Created database " + databaseName);
                    var database = cloudant.use(databaseName);
                    
                    var index = {
                        name : 'time',
                        type : 'json',
                        ddoc : name + '_indexDesignDoc',
                        index : {
                            fields : ['time']
                        }
                    };

                    database.index(index, function(err, response){
                        if(err){
                            logger.error("Error " + err);
                            return;
                        }
                        logger.info(response.result + " " + databaseName + " index.");
                    });


                }
            })
        })(name + toCreate[i]);

    }
}


/**
 * Delete Cloudant databases for given droneName
 * @param name {String} Provided drone name
 */
function deleteCloudantDatabases(name){
    name = name.toLowerCase();

    var toDelete = [
        "_images", "_audio", "_sensorlog", "_eventlog", "_positionlog"
    ];

    for(var i=0; i<toDelete.length; i++){
        (function(databaseName){
            cloudant.db.destroy(databaseName, function(err){
                if(err){
                    logger.error("Couldn't delete database "+ databaseName + " for drone " + name);
                    logger.error(err.message);
                } else {
                    logger.info("Deleted database "+ databaseName + " for drone " + name);
                }
            })
        })(name + toDelete[i]);

    }
}

/**
 * Insert image file into Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.dronename {String} The drone database to use
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
    var images = cloudant.use(req.params.dronename + '_images');

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
 * @param req.params.dronename {String} The drone database to use
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
function deleteImageFromDatabase(req, res){
    cloudant.use(req.params.dronename + '_images').get(req.params.docID, function(err, document){
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
 * @param req.params.dronename {String} The drone database to use
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
    var speechDB = cloudant.use(req.params.dronename + '_audio');

    var attach = [{name: "audio", data: speechData, content_type: 'audio/x-wav'}]; //FIX

    speechDB.multipart.insert({name: req.file.originalname, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
        if (err) {
            logger.error('[audio.insert]: ', err.message);
            res.status(400).send("File upload failed.\n");
        } else{
            logger.info("Saved speech to database successfully.");
            res.status(200).send("Successfully uploaded audio\n");
        }
    });
}

/**
 * Delete audio file from Cloudant database
 * @param req {Object} The request from the client
 * @param req.params.dronename {String} The drone database to use
 * @param req.params.docID {String} The requested document id
 * @param res {Object} The response for the client
 */
function deleteAudioFromDatabase(req, res){
    cloudant.use(req.params.dronename + '_audio').get(req.params.docID, function(err, document){
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
 * @param req {Object} The request from the client
 * @param res {Object} The response for the client
 * @param req.params.dronename {String} The drone database to use
 */
function retrieveLatestImage(req, res){
    if(latestImage[req.params.dronename] != undefined){
        try{
            var imageData = fs.readFileSync(latestImage[req.params.dronename]);
            res.set('Content-Type', 'image/jpeg');
            logger.info("Sending 1 ");
            res.send(imageData);
            return;
        } catch (e){
            logger.error("Image Cache Error.");
            logger.error(e.message);
            delete latestImage[req.params.dronename];
        }
    }

    var images = cloudant.use(req.params.dronename + '_images');
    images.list({"descending": true, "include_docs": true, "limit": 2}, function(err, body){
        if(err){
            logger.error(err);
            res.status(404).send("Internal error");
        }else{
            if(body.rows.length == 0){
                res.status(404).send("No images found");
                return;
            }
            
            if(body.rows[0].id.indexOf('_design') > -1){
                body.rows.splice(0, 1);
            }

            if(body.rows.length == 0){
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
                    logger.info("Sending latest image from database ");
                    // Cache response - need to append original filename?
                    fs.writeFile(uploadDir+filename, body, function(err){
                        if(err){
                            logger.error(err);
                        }else{
                            latestImage[req.params.dronename] = uploadDir+filename;
                        }
                    });
                }
            });
        }
    });
}

/**
 * Retrieve latest audio, from cache or Cloudant database
 * @param req {Object} The request from the client
 * @param res {Object} The response for the client
 * @param req.params.dronename {String} The drone from which image originated
 */
function retrieveLatestAudio(req, res) {

    if (latestAudio[req.params.dronename] != undefined) {
        try {
            var imageData = fs.readFileSync(latestAudio[req.params.dronename]);
            res.set('Content-Type', 'audio/x-wav');
            logger.info("Sending 1 ");
            res.send(imageData);
            return;
        } catch (e) {
            logger.error("Image Cache Error.");
            logger.error(e.message);
            delete latestAudio[req.params.dronename];
        }
    }

    var audio = cloudant.use(req.params.dronename + '_audio');
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
                            latestAudio[req.params.dronename] = uploadDir + filename;
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
    cloudant.use(req.params.dronename + '_sensorlog').find(query, function(err, result){
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
    cloudant.use(req.params.dronename + '_positionlog').find(query, function(err, result){
        if(err){
            logger.error("[position.request."+ req.params.dronename +"] " + err);
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
    cloudant.use(req.params.dronename + '_images').list({startkey:'1'}, function(err, response){
        if(err){
            logger.error(err);
            res.status(500).send("Internal error.");
        } else {
            
            for(var i=0; i< response.rows.length; i++) {
                delete response.rows[i].key;
                delete response.rows[i].value;
                if (response.rows[i].id.indexOf('_design') > -1) {
                    response.rows.splice(i, 1);
                }
            }
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
    cloudant.use(req.params.dronename + '_images').attachment.get(req.params.docID, "image", function(err, image){
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
    cloudant.use(req.params.dronename + '_audio').list({}, function(err, response){
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
    cloudant.use(req.params.dronename + '_audio').attachment.get(req.params.docID, "audio", function(err, audio){
        if(err){
            logger.error(err.description);
            res.status(404).send("No audio found");
        } else {
            res.set('Content-Type', 'audio/x-wav').status(200).send(audio);
        }
    });
}

//////////////// IBM Service Functionality //////////////
function classifyImage(req, res){
    var imageName = req.file.originalname;
    var imagePath =req.file.path;
    var body = req.body;
    var imageFile = fs.createReadStream(imagePath);

    var params = { images_file: imageFile };
    var start = (new Date()).getTime();

    imageRecognition.classify(params, function(err, results){
        if(err){
            logger.error('[image.recognise]: ' + err);
        }else{
            logger.info("Recognition Duration: " + ((new Date()).getTime() - start));
            var labels = results.images[0].scores;
            sendUpdates(req.params.dronename, 'imageLabels', labels, imageName.substring(0, imageName.indexOf('.')));
            var anyLabel = DroneCoordinator.processImageLabels(req.params.dronename, labels,  body.time, {latitude:body.latitude, longitude:body.longitude});
            //logger.info("Image Recognised: " + anyLabel);
        }
    });
}

function speechRecognition(req, res) {
    var droneName = req.params.dronename;
    var audiofilePath = req.file.path;
    logger.info("Received " + audiofilePath);

    if(typeof req.body.location == "string"){
        req.body.location = JSON.parse(req.body.location)
    }

    if (typeof String.prototype.endsWith !== 'function') {
        String.prototype.endsWith = function(suffix) {
            return this.indexOf(suffix, this.length - suffix.length) !== -1;
        };
    }


    if(audiofilePath.endsWith(".mp3")) {
        convertMP3toWAV(req, sendToSpeechRecognition);
    } else {
        sendToSpeechRecognition(req)
    }
}

function sendToSpeechRecognition(req, extension) {

    var droneName = req.params.dronename;
    var audiofilePath = req.file.path;
    var body = req.body;

    if(extension) {
        audiofilePath = audiofilePath.replace(".mp3", ".wav")
    }

    var audioFile = fs.createReadStream(audiofilePath);

    var params = {
        audio: audioFile,
        content_type: "audio/wav",
        model: "en-US_BroadbandModel"
    };

    logger.info("Sending.. " + audioFile.path);

    speechToText.recognize(params, function(err, results){
        if(err){
            logger.error('[speech.recognise]: ' + JSON.stringify(err));
        }else{
            if(typeof results.results[0] == "undefined"){
                logger.info("No speech recognised");
                return;
            }
            var transcript = results.results[0].alternatives[0].transcript;
            logger.info(JSON.stringify(results));
            logger.info("Speech Recognised: " + transcript);
            sendUpdates(droneName, 'audioTranscript', results.results[0].alternatives[0], req.file.originalname.substring(0, req.file.originalname.indexOf('.')));
            DroneCoordinator.processSpeechTranscript(droneName, transcript, body.time, body.location);
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
function deviceStatusCallback(deviceType, deviceID, eventType, format, payload){
    if(deviceType == "pi"){
        processDroneUpdate(deviceID, eventType, payload);
    }
}

function processDroneUpdate(deviceID, eventType, payload){
    switch(eventType){
        case "sensors":
            DroneCoordinator.updateSensorReadings(deviceID, JSON.parse(payload));
            sendUpdates(deviceID, 'sensors', JSON.parse(payload));
            break;
        case "status":
            DroneCoordinator.updateStatus(deviceID, JSON.parse(payload));
            sendUpdates(deviceID, 'status', DroneCoordinator.getStatus(deviceID));
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
        res.send(400).send("Please POST 'username' and 'password' in JSON format");
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

/**
 * Insert drone credentials into SQL database
 * @param req {Object} The request from the client
 * @param req.body.name {String} Name of the drone (unique)
 * @param req.body.owner {String} Username of the owner (must exist)
 * @param [req.body.model] {String} Model of drone
 * @param res {Object} The response for the client
 */
function insertDroneCredentials(req, res){

    if(!req.body.name){
        res.status(400).send("Please provide drone name as JSON {name:<name>}}");
        return;
    }

    var name = req.body.name;
    var model = req.body.model || null;
    var owner = req.body.owner || req.session.user;


    var query = "INSERT INTO DRONES VALUES (?, ?, ?)";
    dashDB.query(query, [name, model, owner], function(err, response){
        if(err) {
            logger.error("[drones.insert]: Couldn't insert drone: " + name);
            logger.error(err.message);
            if(err.state == "23505"){
                res.status(400).send("Couldn't add drone, drone name not unique.\n");
            } else {
                res.status(500).send("Couldn't add drone.");
            }
        } else{

            logger.info("[drones.insert]: Drone: " + name + " successfully added to SQL database");

            var type = "pi";
            var authToken = "password"; //TODO make random
            var location = {};
            var metadata = {};
            var deviceInfo = {};

            MQTT.client.registerDevice(type, name, authToken, deviceInfo, location, metadata).then (function onSuccess (response) {
                logger.info("[drones.insert]: Device " + type + ":" + name + " successfully added to MQTT broker");
                req.session.drones.push(name);
                var detailsToSend = {
                    MQTT : {
                        type : type,
                        deviceId : name,
                        "auth-token" : authToken,
                        "auth-method" : "token",
                        org : MQTT.org
                    }
                };
                res.status(200).send(detailsToSend);
            }, function onError (error) {
                logger.error("[drones.insert]: Device " + type + ":" + name + " NOT added to MQTT broker");
                logger.error(JSON.stringify(error));
                res.status(500).send("Failed to add");
            });

            createCloudantDatabases(name);
        }
    });
}

/**
 * Delete user credentials from SQL database
 * @param req {Object} The request from the client
 * @param req.params.username {String} Username of the client
 * @param res {Object} The response for the client
 */
function deleteDroneCredentials(req, res){
    var name = req.params.dronename;

    var query = "DELETE FROM DRONES WHERE \"name\" = ?";
    dashDB.query(query, [name], function(err, response){
        if(err) {
            logger.error("[drones.delete]: Couldn't delete drone: " + name);
            logger.error(err.message);
            res.status(400).send("Couldn't delete drone");
        } else{
            logger.info("Drone " + name + " successfully deleted from SQL database. Maybe.");

            MQTT.client.unregisterDevice('pi', name).then (function onSuccess (response) {
                logger.info("[drones.delete]: Device " + name + " successfully deleted from MQTT broker");
                req.session.drones.splice( req.session.drones.indexOf(name), 1);
                res.status(200).send("Drone " + name + " was successfully deleted");

            }, function onError (error) {
                logger.error("[drones.insert]: Device " + name + " was NOT deleted from MQTT broker");
                if(error.headers.status == 404) {
                    logger.error("[drones.delete]: 404, Device was not found.");
                } else {
                    logger.error("[drones.delete]: " + error.headers.status);
                }
                res.status(400).send("Drone " + name + " was NOT deleted");
            });

            deleteCloudantDatabases(name);
        }
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

/**
 * Serve drone information for a user from SQL database
 * @param req {Object} The request from the client
 * @param res {Object} The response for the client
 */
function serveDronesInformation(req, res){
    var username = req.session.user;

    var query = "SELECT * FROM DRONES WHERE \"owner\" = ?";
    dashDB.query(query, [username], function(err, response){
        if(err){
            logger.error("[drones.information] " + err.message);
            res.status(500).send("Server connection error");
        } else if(response.length == 0){
            res.status(404).send("User not found");
        } else {
            // Should add drone status
            for(var i = 0; i < response.length; i++){
                response[i].status = DroneCoordinator.getStatus(response[i].name);
            }
            res.status(200).send(response);
        }
    });


}

function requireLogin (req, res, next) {
    if (!req.session.user) {
        logger.info("Denying access to " + req.originalUrl + "   " + req.session.user);
        res.redirect('/login');
    } else {
        logger.info("Allowing access to " + req.originalUrl);
        next();
    }
}

function login(req, res){

    var credentials = auth(res);
    if (!credentials) {
        res.status(400).send("Please provide username and password.\n");
    } else if (credentials.name == req.session.user){
        res.status(200).send("Already logged in");
    } else {
        var query = "SELECT * FROM USERS WHERE \"username\" = ?";
        credentials.pass.replace(/\W/g, '');
        dashDB.query(query, [credentials.name.replace(/\W/g, '')], function (err, response) {
            if (err) {
                logger.error("[login] " + err.message);
                res.status(500).send("Database error\n");
                return;
            }
            if (response.length == 0) {
                logger.info("[login]: Invalid username " + credentials.name);
                res.status(403).send("Invalid username or password\n");
            } else { // only a single row
                // Test password
                var salt = response[0].salt; //.salt

                var toCheck = crypto.createHash('sha256').update(credentials.pass + salt).digest('hex');

                if (response[0].password == toCheck) {
                    req.session.user = response[0].username;
                    req.session.role = response[0].role;

                    query = "SELECT \"name\" FROM DRONES WHERE \"owner\" = ?";
                    dashDB.query(query, [credentials.name], function (err, response) {
                        if (err) {
                            logger.error("[login] " + err.message);
                            res.status(500).send("Database error\n");
                        }

                        req.session.drones = [];
                        for (var i = 0; i < response.length; i++) {
                            req.session.drones.push(response[i].name);
                        }
                        res.status(200).send("Logged in successfully.\n");
                    });
                } else {
                    logger.info("[login]: Invalid password for user " + credentials.name);
                    res.status(403).send("Invalid username or password\n");
                }
            }
        });
    }
}

function dash_login(req, res){

    var credentials = auth(res);
    if (!credentials) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        res.status(400).send("Please provide username and password.\n");
        // } else if (credentials.name == req.session.user){
        //     res.status(200).send("Already logged in");

    } else {
        var query = "SELECT * FROM USERS WHERE \"username\" = ?";
        credentials.pass.replace(/\W/g, '');
        dashDB.query(query, [credentials.name.replace(/\W/g, '')], function (err, response) {
            if (err) {
                logger.error("[login] " + err.message);
                res.status(500).send("Database error\n");
            }
            if (response.length == 0) {
                logger.info("[login]: Invalid username " + credentials.name);
                res.status(403).send("Invalid username or password\n");
            } else { // only a single row
                // Test password
                var salt = response[0].salt; //.salt

                var toCheck = crypto.createHash('sha256').update(credentials.pass + salt).digest('hex');

                if (response[0].password == toCheck) {
                    req.session.user = response[0].username;
                    req.session.role = response[0].role;

                    query = "SELECT \"name\" FROM DRONES WHERE \"owner\" = ?";
                    dashDB.query(query, [credentials.name], function (err, response) {
                        if (err) {
                            logger.error("[login] " + err.message);
                            res.status(500).send("Database error\n");
                        }

                        req.session.drones = [];
                        for (var i = 0; i < response.length; i++) {
                            req.session.drones.push(response[i].name);
                        }
                        res.redirect('/dashboard/app');
                    });
                } else {
                    logger.info("[login]: Invalid password for user " + credentials.name);
                    res.status(403).send("Invalid username or password\n");
                }
            }
        });
    }
}

/////////////// Websockets ///////////////
/** @module Websockets */

 /**
  * Broadcast provided audio data to listeners
 * @param ws {Object} The websocket object, specific for client
 * @param req {Object} The response for the client
 */
function broadcastDataToListeners(ws, req){
    ws.send("Successfully connected");

    ws.on('message', function(msg){
        var clients = wsInstance.clients;
        for(var i = 0; i < clients.length; i++){

            if(clients[i].upgradeReq.originalUrl.indexOf("listen") > -1){
                clients[i].send(msg);
            }
        }
    });
}

/**
 * Send audio data to the drone
 * @param ws {Object} The websocket object, specific for client
 * @param req {Object} The response for the client
 */
function sendDataToDrone(ws, req){
    ws.send("Successfully connected");

    ws.on('message', function(msg){
        var clients = wsInstance.clients;
        for(var i = 0; i < clients.length; i++){

            if(clients[i].upgradeReq.originalUrl.indexOf("download") > -1){
                clients[i].send(msg);
            }
        }
    });
}

/////////////// Commands /////////////////
/** @module Commands */

/**
 * Send a Pi command to the drone
 * @param req {Object} The request from the client
 * @param req.params.dronename {String} The dronename to send the command to
 * @param req.body.command {String} The command to send
 * @param req.body.args[] {Number} Args for the command
 * @param res {Object} The response for the client
 */
function sendPiCommand(req, res){
    if(!req.body.command){
        res.status(400).send("Please supply a command");
        return;
    }

    DroneCoordinator.sendPiCommand(req.params.dronename, req.body.command, req.body.args);

    res.status(200).send("Sending message");
}

/**
 * Serve drone information for a user from SQL database
 * @param req {Object} The request from the client
 * @param req.params.dronename {String} The dronename to send the command to
 * @param req.body.command {String} The command to send
 * @param req.body.args[] {Number} Args for the command
 * @param res {Object} The response for the client
 */
function sendMavCommand(req, res){
    if(!req.body.command){
        res.status(400).send("Please supply a command");
        return;
    }

    DroneCoordinator.sendMavCommand(req.params.dronename, req.body.command, req.body.args);

    res.status(200).send("Sending message");
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
 * @returns {boolean} isValid If the file is a valid audio file
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
function convertMP3toWAV(req, sendToSpeechRecognition){
    var droneName = req.params.dronename;
    var mp3File = req.file.path;
    var body= req.body;
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
        sendToSpeechRecognition(req, '.mp3');
});

    function onFormat(format){
        var writer = new wav.Writer(format);
        decoder.pipe(writer).pipe(wavFileStream);
    }

}

function testImageLatency(req, res){
    var valid = true;//validateJPEG(req.file.path);
    if (!valid) {
        res.status(400).send("Invalid file type - not jpeg.\n");
        fs.unlink(req.file.path);
    } else {
        profile2.imageAdd(req.params.docID, 'upload', (new Date().getTime() - parseInt(req.body.time)));
        profile2.imageAdd(req.params.docID, 'size', req.file.size);
        //profile.log('images,upload,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + (new Date().getTime() - parseInt(req.body.time))+ ',' + req.file.size);

        var imageData = fs.readFileSync(req.file.path);
        var images = cloudant.use('emptydatabase');
        var attach = [{name: "image", data: imageData, content_type: 'image/jpeg'}];
        images.multipart.insert({name: req.file.originalname, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
            if (err) {
                res.status(400).send("File upload failed.\n");
            } else{
                res.status(200).send("File uploaded successfully.\n");
                var duration = new Date().getTime() - parseInt(req.body.time);
               //profile.log('images,database,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + duration + ',' + req.file.size);
                profile2.imageAdd(req.params.docID, 'database', duration);
                // Cleanup
                images.get(req.params.docID, function(err, document){
                    if(err){} else {
                        images.destroy(req.params.docID, document._rev, function(){
                        });
                    }
                });
            }
        });
        var imageFile = fs.createReadStream(req.file.path);

        var params = { images_file: imageFile };
        imageRecognition.classify(params, function(err, results){
            if(err){
                logger.error('[image.profile]: ' + err);
            }else{
                var labels = results.images[0].scores;
                var duration = new Date().getTime() - parseInt(req.body.time);
                //profile.log('images,recognition,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + duration + ',' + JSON.stringify(labels));
                profile2.imageAdd(req.params.docID, 'recognition', duration);
                profile2.images[req.params.docID].labels = labels;
                DroneCoordinator.sendPiCommand('pixhack', req.body.time, []);
            }
        });
    }
}

function testAudioLatency(req, res){
    var valid = true;//validateAudioFile(req.file.path);
    if(!valid){
        res.status(400).send("Invalid file type - not wav or mp3.\n");
        fs.unlink(req.file.path);
    } else {
        //profile.log('audio,upload,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + (new Date().getTime() - parseInt(req.body.time))+ ',' + req.file.size);
        profile2.audioAdd(req.params.docID, 'upload',(new Date().getTime() - parseInt(req.body.time)));
        profile2.audioAdd(req.params.docID, 'size', req.file.size);

        var speechData = fs.readFileSync(req.file.path);
        var speechDB = cloudant.use('emptydatabase');

        var attach = [{name: "audio", data: speechData, content_type: 'audio/x-wav'}];

        speechDB.multipart.insert({name: req.file.originalname, time:req.body.time, location:req.body.location}, attach, req.params.docID, function(err, body) {
            if (err) {
                res.status(400).send("File upload failed.\n");
            } else{
                res.status(200).send("Successfully uploaded audio\n");
                var duration = new Date().getTime() - parseInt(req.body.time);
                //profile.log('audio,database,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + duration + ',' + req.file.size);
                profile2.audioAdd(req.params.docID, 'database', duration);
                speechDB.get(req.params.docID, function(err, document){
                    if(err){} else {
                        speechDB.destroy(req.params.docID, document._rev, function(){
                        });
                    }
                });
            }
        });

        var audiofilePath = req.file.path;

        if (typeof String.prototype.endsWith !== 'function') {
            String.prototype.endsWith = function(suffix) {
                return this.indexOf(suffix, this.length - suffix.length) !== -1;
            };
        }

        function testSendToSpeechRecognition(req, extension) {
            var audiofilePath = req.file.path;

            if(extension) {
                audiofilePath = audiofilePath.replace(".mp3", ".wav")
            }

            var audioFile = fs.createReadStream(audiofilePath);
            var params = {
                audio: audioFile,
                content_type: "audio/wav",
                model: "en-US_BroadbandModel"
            };

            speechToText.recognize(params, function(err, results){
                if(err){
                    logger.error('[audio.profile]: ' + err);
                }else{
                    if(typeof results.results[0] == "undefined"){
                        return;
                    }
                    var response = results.results[0].alternatives[0];
                    var duration = new Date().getTime() - parseInt(req.body.time);
                    //profile.log('audio,recognition,' + req.params.docID + ',' + parseInt(req.body.time) + ',' + duration + ',' + response.confidence + ',' + response.transcript);
                    profile2.audioAdd(req.params.docID, 'recognition', duration);
                    profile2.audioAdd(req.params.docID, 'confidence', response.confidence);
                    profile2.audioAdd(req.params.docID, 'transcript', response.transcript);
                    DroneCoordinator.sendPiCommand('pixhack', req.body.time, []);
                }
            });
        }
        if(audiofilePath.endsWith(".mp3")) {
            convertMP3toWAV(req, testSendToSpeechRecognition);
        } else {
            testSendToSpeechRecognition(req)
        }

    }
}

function writeImageLatencyFile(req, res){
    profile2.writeImages();
    res.status(200).send();
}
function writeAudioLatencyFile(req, res){
    profile2.writeAudio();
    res.status(200).send();
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
    setWsInstance : setWsInstance,
    requireLogin : requireLogin,
    login : login,
    dash_login : dash_login,    
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
        insertUserCredentials : insertUserCredentials,
        deleteUserCredentials : deleteUserCredentials,
        serveUserInformation : serveUserInformation,
        insertDroneCredentials: insertDroneCredentials,
        deleteDroneCredentials: deleteDroneCredentials,
        serveDronesInformation : serveDronesInformation
    },
    commands : {
        sendPiCommand : sendPiCommand,
        sendMavCommand : sendMavCommand
    },
    websockets : {
        broadcastDataToListeners : broadcastDataToListeners,
        sendDataToDrone : sendDataToDrone
    },
    test : {
        imageLatency : testImageLatency,
        audioLatency : testAudioLatency,
        writeImageLatencyFile : writeImageLatencyFile,
        writeAudioLatencyFile : writeAudioLatencyFile
    }
};