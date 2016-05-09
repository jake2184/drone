var express = require('express');
var router = express.Router();
var fs = require('fs')

var functions = require('./functions.js');

var uploadDir = "uploads/";

var multer = require('multer');

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir );
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});


var upload = multer({
    storage: storage
});

var logger = require('winston');














router.all('/', functions.requireLogin);

router.delete('/*', function(req, res, next){
    if(req.session.role <= functions.RoleEnum.USER){
        next();
    } else {
        res.status(401).send("Insufficient permission to DELETE");
    }
});

router.post('/*', function(req, res, next){
    if(req.session.role <= functions.RoleEnum.USER){
        next();
    } else {
        res.status(401).send("Insufficient permission to POST");
    }
});
router.get('/*', function (req, res, next) {
    if(req.session.role <= functions.RoleEnum.GUEST){
        next();
    } else {
        res.status(401).send("Insufficient permission to GET");
    }
});

////////////// Pre definitions //////////////////
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

//////////////////////////////////////////////
/**
 * @api {get} /sensors Request all sensor information
 * @apiName GetSensors
 * @apiGroup Sensors
 * @apiUse SensorResponse
 * @apiPermission Guest
 */
router.get('/sensors', function(req, res){
    functions.cloudant.serveSensorData(req, res);
});

/**
 * @api {get} /sensors/:timeFrom Request sensor data from a given time
 * @apiName GetSensorsFrom
 * @apiGroup Sensors
 * @apiParam {Number} timeFrom Timestamp in milliseconds since epoch
 * @apiUse SensorResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/sensors/:timeFrom', function(req, res){
    functions.cloudant.serveSensorData(req, res);
});

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
router.get('/sensors/:timeFrom/:timeUntil', function(req, res){
    functions.cloudant.serveSensorData(req, res);
});


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
router.get('/sensors/:timeFrom/:timeUntil/:type', function(req, res){
    logger.info("Serving data");
    functions.cloudant.serveSensorData(req, res);
});

/**
 * @api {get} /gps Request all GPS information
 * @apiName GetGPS
 * @apiGroup GPS
 * @apiUse GPSResponse
 * @apiPermission Guest
 */
router.get('/gps', function(req, res){
    functions.cloudant.serveGPSData(req, res);
});

/**
 * @api {get} /gps/:timeFrom Request GPS information from a given time
 * @apiName GetGPSFrom
 * @apiGroup GPS
 * @apiParam {Number} timeFrom 	Timestamp in milliseconds since epoch
 * @apiUse GPSResponse
 * @apiUse TimeParamError
 * @apiPermission Guest
 */
router.get('/gps/:timeFrom/', function(req, res){
    functions.cloudant.serveGPSData(req, res);
});

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
router.get('/gps/:timeFrom/:timeUntil', function(req, res){
    functions.cloudant.serveGPSData(req, res);
});

/**
 * @api {get} /images Get list of images
 * @apiName GetImageMeta
 * @apiGroup Images
 * @apiSuccess {Object[]} 	List of all documents within the image database
 *
 * @apiPermission Guest
 * // TODO the return type
 */
router.get('/images', function(req, res){
    functions.cloudant.serveImagesInformation(req, res);
});

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
router.get('/images/:docID', function(req, res){
    functions.cloudant.serveImage(req, res);
});

/**
 * @api {post} /images/:docID Upload image to functions.cloudant.server
 * @apiName PostImage
 * @apiGroup Images
 * @apiParam {Number} docID 	The docID of the image to be uploaded
 * @apiUse PermissionError
 * @apiPermission User
 */
router.post('/images/:docID', upload.single('image'), function(req, res){
    functions.cloudant.handleImageUpload(req, res);
});

/**
 * @api {delete} /images/:docID Delete image from database
 * @apiName DeleteImages
 * @apiGroup Images
 * @apiParam {Number} docID 	The docID of the image to be deleted
 */
router.delete('/images/:docID', function(req, res){
    functions.cloudant.deleteImageFromDatabase(req, res);
});

/**
 * @api {get} /audio Request list of audio files in database
 * @apiName GetAudioMeta
 * @apiGroup Audio
 * @apiSuccess {Object[]} 	List of all documents within the audio database
 * @apiPermission Guest
 * // TODO the return type
 */
router.get('/audio', function(req, res){
    functions.cloudant.serveAudioInformation(req, res);
});

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
router.get('/audio/:docID', function(req, res){
    functions.cloudant.serveAudio(req, res);
});

/**
 * @api {post} /audio/:docID Upload audio file
 * @apiName PostAudio
 * @apiGroup Audio
 * @apiParam {Number} docID 	The docID of the audio file to be uploaded
 * @apiPermission User
 * @apiUse PermissionError
 */
router.post('/audio/:docID', upload.single('audio'), functions.cloudant.handleAudioUpload);

/**
 * @api {delete} /audio/:docID Delete audio from database
 * @apiName DeleteAudio
 * @apiGroup Audio
 * @apiParam {Number} docID 	The docID of the audio file to be deleted
 */
router.delete('/audio/:docID', function(req, res){
    functions.cloudant.deleteAudioFromDatabase(req, res);
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
router.get('/users/:username', function(req, res){
    functions.sql.serveUserInformation(req, res);
});


/**
 * @api {post} /users/:username Add new user to the database
 * @apiName PostUser
 * @apiGroup Users
 * @apiSuccess {String}	Success 		Success message
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.post('/users/:username', function(req, res){
    functions.sql.insertUserCredentials(req, res);
});

/**
 * @api {delete} /users/:username Delete user from the database
 * @apiName DeleteUser
 * @apiGroup Users
 * @apiSuccess {String}	Success Success message
 * @apiUse UserNotFoundError
 * @apiUse PermissionError
 * @apiPermission Admin
 */
router.delete('/users/:username', function(req, res){
    functions.sql.deleteUserCredentials(req, res);
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
            functions.cloudant.retrieveLatestImage(res);
        } else if(req.url.indexOf("audio") > -1){
            functions.cloudant.retrieveLatestAudio(res);
            //res.set('Content-Type', 'audio/x-wav').status(200).send()//TODo
        }
    } else {
        next();
    }
});
router.param('username', function(req, res, next, username){
    if(req.session.role <= functions.RoleEnum.ADMIN || req.session.username == username){
        next();
    } else {
        res.status(401).send("Unauthorised to edit user information");
    }
});

module.exports = router;