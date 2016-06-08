var express = require('express');
var fs = require('fs');
var logger = require('winston');
var multer = require('multer');

// Create router
var router = express.Router();
router.wsInstance = {};

// Load functions
var functions = require('./functions.js');
functions.wsInstance = {};

router.setWsInstance = function(instance){
    router.wsInstance = instance;
    functions.setWsInstance(instance)
};

var uploadDir = "./uploads/";

// Create upload directory if it doesn't exists
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Define the storage methods for the server
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir );
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

// Create multer variable, which parses uploaded files
var upload = multer({
    storage: storage
});



//
// router.all('/*', function(req, res, next){
//     logger.info("From " + req.originalUrl);
//     next();
// });

///////////// Middleware for all endpoints ////////////////////
// Require all users of the API endpoints to be logged in
router.all('/*', functions.requireLogin);

// All GET requests must come from Role <= GUEST
router.get('/*', function (req, res, next) {
    if(req.session.role <= functions.RoleEnum.GUEST){
        next();
    } else {
        res.status(401).send("Insufficient permission to GET");
    }
});

// All POST requests must come from Role <= USER
router.post('/*', function(req, res, next){
    if(req.session.role <= functions.RoleEnum.USER){
        next();
    } else {
        res.status(401).send("Insufficient permission to POST");
    }
});

// All DELETE requests must come from Role <= USER
router.delete('/*', function(req, res, next){
    if(req.session.role <= functions.RoleEnum.USER){
        next();
    } else {
        res.status(401).send("Insufficient permission to DELETE");
    }
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
            functions.cloudant.retrieveLatestImage(req, res);
        } else if(req.url.indexOf("audio") > -1){
            functions.cloudant.retrieveLatestAudio(req, res);
        }
    } else {
        next();
    }
});
router.param('username', function(req, res, next, username){
    if(req.session.role <= functions.RoleEnum.ADMIN || req.session.username == username){
        next();
    } else {
        logger.info("Bad username");
        res.status(401).send("Unauthorised to edit user information");
    }
});
router.param('dronename', function(req, res, next, dronename){
    if(req.session.drones.indexOf(dronename) > -1){
        next();
    } else if(req.session.role <= functions.RoleEnum.ADMIN){
        next();
    } else {
        res.status(400).send("Dronename not found with you as owner.");
    }
});

////////////// Documentation Pre definitions //////////////////
/**
 * @apiDefine SensorResponse
 * @apiSuccess {Object[]} 	readings 			List of all sensor readings
 * @apiSuccess {Number} 	readings.time 		Timestamp in milliseconds since epoch
 * @apiSuccess {Number[2]} 	readings.location	Array containing latitude and longitude
 */

/**
 * @apiDefine GPSResponse
 * @apiSuccess {Object[]} 	readings 			List of all GPS readings
 * @apiSuccess {Number} 	readings.time 		Timestamp in milliseconds since epoch
 * @apiSuccess {Number} 	readings.latitude	Latitude
 * @apiSuccess {Number}		readings.longitude  Longitude
 * @apiSuccess {altitude}	readings.altitude	Altitude
 */

/**
 * @apiDefine TimeParamError
 * @apiError  {400} 		NotANumber			The provided <code>timeFrom</code> or <code>timeTill</code> is not a number
 */

/**
 * @apiDefine PermissionError
 * @apiError {401}			NotAuthorised 		Not authorised to access
 */

/**
 * @apiDefine UserNotFoundError
 * @apiError {400} UserNotFound     The <code>username</code> was not found
 */

/**
 * @apiDefine DroneNotFoundError
 * @apiError {400} DroneNotFound     The <code>dronename</code> was not found
 */

/**
 * @apiDefine DocumentMissingError
 * @apiError {404} 			DocumentNotFound	Document was not located in database
 */

/**
 * @apiDefine Admin
 */

/**
 * @apiDefine User
 */

/**
 * @apiDefine Guest
 */

//////////////////// Endpoints /////////////////////////////
// Sensors
/**
 * @api {get} /sensors Request all sensor information
 * @apiName GetSensors
 * @apiGroup Sensors
 * @apiUse SensorResponse
 * @apiPermission Guest
 */
router.get('/:dronename/sensors', functions.cloudant.serveSensorData);

/**
 * @api {get} /sensors/:timeFrom Request sensor data from a given time
 * @apiName GetSensorsFrom
 * @apiGroup Sensors
 * @apiParam {Number} timeFrom Timestamp in milliseconds since epoch
 * @apiUse SensorResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/:dronename/sensors/:timeFrom', functions.cloudant.serveSensorData);

/**
 * @api {get} /sensors/:timeFrom/:timeUntil Request sensor data from a time range
 * @apiName GetSensorsFromTill
 * @apiGroup Sensors
 * @apiParam {Number} timeFrom 	Timestamp in milliseconds since epoch
 * @apiParam {Number} timeUntil Timestamp in milliseconds since epoch
 * @apiUse SensorResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/:dronename/sensors/:timeFrom/:timeUntil', functions.cloudant.serveSensorData);

/**
 * @api {get} /sensors/:timeFrom/:timeUntil/:type Request sensor date from a time range of a given type
 * @apiName GetSensorsFromTillType
 * @apiGroup Sensors
 * @apiParam {Number} timeFrom 	Timestamp in milliseconds since epoch
 * @apiParam {Number} timeUntil Timestamp in milliseconds since epoch
 * @apiParam {String} type 		The type of sensor data to be retrieved
 * @apiUse SensorResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/:dronename/sensors/:timeFrom/:timeUntil/:type', functions.cloudant.serveSensorData);

// GPS
/**
 * @api {get} /gps Request all GPS information
 * @apiName GetGPS
 * @apiGroup GPS
 * @apiUse GPSResponse
 * @apiPermission Guest
 */
router.get('/:dronename/gps', functions.cloudant.serveGPSData);

/**
 * @api {get} /gps/:timeFrom Request GPS information from a given time
 * @apiName GetGPSFrom
 * @apiGroup GPS
 * @apiParam {Number} timeFrom 	Timestamp in milliseconds since epoch
 * @apiUse GPSResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/:dronename/gps/:timeFrom', functions.cloudant.serveGPSData);

/**
 * @api {get} /gps/:timeFrom/:timeTill Request GPS data from time range
 * @apiName GetGPSFromTill
 * @apiGroup GPS
 * @apiParam {Number} timeFrom 	Timestamp in milliseconds since epoch
 * @apiParam {Number} timeTill	Timestamp in milliseconds since epoch
 * @apiUse GPSResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/:dronename/gps/:timeFrom/:timeUntil', functions.cloudant.serveGPSData);

// Images
/**
 * @api {get} /images Get list of images
 * @apiName GetImageMeta
 * @apiGroup Images
 * @apiSuccess {Object[]} 	List of all documents within the image database
 *
 * @apiPermission Guest
 */
router.get('/:dronename/images', functions.cloudant.serveImagesInformation);

/**
 * @api {get} /images/:docID Request single image
 * @apiName GetImage
 * @apiGroup Images
 * @apiParam {Number} docID 	The docID of the requested image
 * @apiParam {String} docID		<code>"latest"<\code> will retrieve the latest image
 * @apiSuccess {JPEG} File 		Image file requested
 * @apiUse DocumentMissingError
 * @apiPermission Guest
 */
router.get('/:dronename/images/:docID', functions.cloudant.serveImage);

/**
 * @api {post} /images/:docID Upload image to server
 * @apiName PostImage
 * @apiGroup Images
 * @apiParam {Number} docID 	The docID of the image to be uploaded
 * @apiUse PermissionError
 * @apiPermission User
 */
router.post('/:dronename/images/:docID', upload.single('image'), functions.cloudant.handleImageUpload);

/**
 * @api {delete} /images/:docID Delete image from database
 * @apiName DeleteImages
 * @apiGroup Images
 * @apiParam {Number} docID 	The docID of the image to be deleted
 */
router.delete('/:dronename/images/:docID', functions.cloudant.deleteImageFromDatabase);

// Audio
/**
 * @api {get} /audio Request list of audio files in database
 * @apiName GetAudioMeta
 * @apiGroup Audio
 * @apiSuccess {Object[]} 	List of all documents within the audio database
 * @apiPermission Guest
 * // TODO the return type
 */
router.get('/:dronename/audio', functions.cloudant.serveAudioInformation);

/**
 * @api {get} /audio/:docID Request single audio file
 * @apiName GetAudio
 * @apiGroup Audio
 * @apiParam {Number} docID 	The docID of the requested audio file
 * @apiParam {String} docID		<code>"latest"<\code> will retrieve the latest audio
 * @apiSuccess {WAV/MP3} File Audio file requested
 * @apiUse DocumentMissingError
 * @apiPermission Guest
 */
router.get('/:dronename/audio/:docID', functions.cloudant.serveAudio);

/**
 * @api {post} /audio/:docID Upload audio file
 * @apiName PostAudio
 * @apiGroup Audio
 * @apiParam {Number} docID 	The docID of the audio file to be uploaded
 * @apiPermission User
 * @apiUse PermissionError
 */
router.post('/:dronename/audio/:docID', upload.single('audio'), functions.cloudant.handleAudioUpload);

/**
 * @api {delete} /audio/:docID Delete audio from database
 * @apiName DeleteAudio
 * @apiGroup Audio
 * @apiParam {Number} docID 	The docID of the audio file to be deleted
 */
router.delete('/:dronename/audio/:docID', functions.cloudant.deleteAudioFromDatabase);

// Users
/**
 * @api {get} /users Get details of requesting user
 * @apiName GetUserSelf
 * @apiGroup Users
 * @apiSuccess {Object} user			Details of the user requested
 * @apiSuccess {String} user.username	Username
 * @apiSuccess {String} user.first_name	First Name
 * @apiSuccess {String} user.last_name	Last Name
 * @apiSuccess {Number}	user.role		Role of the user, used to restrict API access
 * @apiUse UserNotFoundError
 * @apiUse PermissionError
 */
router.get('/users', function(req, res){
    req.params.username = req.session.user;
    functions.sql.serveUserInformation(req, res);
});

/**
 * @api {get} /users/:username Get details of user
 * @apiName GetUser
 * @apiGroup Users
 * @apiSuccess {Object} user			Details of the user requested
 * @apiSuccess {String} user.username	Username
 * @apiSuccess {String} user.first_name	First Name
 * @apiSuccess {String} user.last_name	Last Name
 * @apiSuccess {Number}	user.role		Role of the user, used to restrict API access
 * @apiUse UserNotFoundError
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.get('/users/:username', functions.sql.serveUserInformation);

/**
 * @api {post} /users/:username Add new user to the database
 * @apiName PostUser
 * @apiGroup Users
 * @apiSuccess {String}	Success 		Success message
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.post('/users/:username', functions.sql.insertUserCredentials);

/**
 * @api {delete} /users/:username Delete user from the database
 * @apiName DeleteUser
 * @apiGroup Users
 * @apiSuccess {String}	Success Success message
 * @apiUse UserNotFoundError
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.delete('/users/:username', functions.sql.deleteUserCredentials);

// Drones
/**
 * @api {post} /drones  Add new drone to the database
 * @apiName PostDrone
 * @apiGroup Drones
 * @apiParam {Object} droneToAdd Drone details to add
 * @apiParam {String} droneToAdd.name  Drone name
 * @apiParam {String} droneToAdd.model Drone model
 * @apiParam {String} droneToAdd.owner Drone owner's username *
 * @apiSuccess {Object} success Success Message
 * @apiSuccess {String} success.MQTT MQTT Details Required for Drone to connect
 * @apiSuccess {String} success.MQTT.type
 * @apiSuccess {String} success.MQTT.deviceId
 * @apiSuccess {String} success.MQTT.auth-token
 * @apiSuccess {String} success.MQTT.auth-method
 * @apiSuccess {String} success.MQTT.org  *
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.post('/drones', functions.sql.insertDroneCredentials);

/**
 * @api {get} /drones Get details of user's drones
 * @apiName GetDrones
 * @apiGroup Drones
 * @apiSuccess {Object[]} drones			Details of the user's drones
 * @apiSuccess {String} drones.name	    Drone Name
 * @apiSuccess {String} drones.model	    Drone Model
 * @apiSuccess {String}	drones.owner		Owner of the drone (username)
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.get('/drones', functions.sql.serveDronesInformation);

/**
 * @api {delete} /drones/:dronename Delete drone from the database
 * @apiName DeleteDrone
 * @apiGroup Drones
 * @apiSuccess {String}	Success Success message
 * @apiUse DroneNotFoundError
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.delete('/drones/:dronename', functions.sql.deleteDroneCredentials);

// Websockets
/**
 * @api {websocket} /:dronename/audio/stream/upload For drone to upload audio stream
 * @apiName WebsocketUpload
 * @apiGroup Websockets
 * @apiUse PermissionError
 * @apiPermission User
 */
router.ws('/:dronename/audio/stream/upload', functions.websockets.broadcastDataToListeners);
/**
 * @api {websocket} /:dronename/audio/stream/listen Listen to drone's audio stream
 * @apiName WebsocketListen
 * @apiGroup Websockets
 * @apiUse PermissionError
 * @apiPermission User
 */
router.ws('/:dronename/audio/stream/listen', function(){
    logger.info("New connection to audio stream from drone");
});

/**
 * @api {websocket} /:dronename/audio/stream/talk Send audio stream TO the drone
 * @apiName WebsocketTalk
 * @apiGroup Websockets
 * @apiUse PermissionError
 * @apiPermission User
 */
router.ws('/:dronename/audio/stream/talk', functions.websockets.sendDataToDrone);

/**
 * @api {websocket} /:dronename/audio/stream/download For drone to download client's audio stream
 * @apiName WebsocketDownload
 * @apiGroup Websockets
 * @apiUse PermissionError
 * @apiPermission User
 */
router.ws('/:dronename/audio/stream/download', function(){
    logger.info("New connection to audio stream from client");
});

/**
 * @api {websocket} /:dronename/audio/stream/listen Listen to drone's audio stream
 * @apiName WebsocketList
 * @apiGroup Websockets
 * @apiUse PermissionError
 * @apiPermission User
 */
router.ws('/updates/:username', function(ws){
    logger.info("New connection for drone updates");
});

// Commands
/**
 * @api {post} /:dronename/command/pi Send command to a drone for the Pi
 * @apiName PostPiCommand
 * @apiParam {Object} Command Command to execute
 * @apiParam {String} Command.command Name of the command
 * @apiParam {String[]} Command.args Arguments for the command
 * @apiGroup Commands
 * @apiUse PermissionError
 * @apiPermission User
 */
router.post('/:dronename/command/pi', functions.commands.sendPiCommand);

/**
 * @api {post} /:dronename/command/mav Send command to a drone for mavlink
 * @apiName PostMavCommand
 * @apiParam {Object} Command Command to execute
 * @apiParam {String} Command.command Name of the command
 * @apiParam {String[]} Command.args Arguments for the command
 * @apiGroup Commands
 * @apiUse PermissionError
 * @apiPermission User
 */
router.post('/:dronename/command/mav', functions.commands.sendMavCommand);

// TEST LATENCIES
router.post('/test/imageLatency/:docID', upload.single('image'),  functions.test.imageLatency);
router.post('/test/audioLatency/:docID', upload.single('audio'), functions.test.audioLatency);
router.get('/test/writeImageFile', functions.test.writeImageLatencyFile);
router.get('/test/writeAudioFile', functions.test.writeAudioLatencyFile);




module.exports = router;