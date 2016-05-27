
var DroneHandler = require('./DroneHandler');
var logger = require('winston');
var fs = require('fs');



function DroneCoordinator(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
    this.handlers = {};
}

DroneCoordinator.prototype.checkHandlerExistence = function(droneName){
    if(this.handlers[droneName] === undefined){
        logger.info("[handler.create]: Creating drone handler for " + droneName);
        this.handlers[droneName] = new DroneHandler(this.MQTT, this.cloudant, droneName);
    }
};

DroneCoordinator.prototype.getModeName = function(droneName){
    this.checkHandlerExistence(droneName);
    return this.handlers[droneName].currentMode.name();
};

DroneCoordinator.prototype.setMode = function(droneName, modeType){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].setMode(modeType);
};

DroneCoordinator.prototype.processImageLabels = function(droneName, keywords, time, location){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].processImageLabels(keywords, time, location);
};

DroneCoordinator.prototype.processSpeechTranscript = function (droneName, transcript, time, location){
    this.checkHandlerExistence(droneName);

    var temp = this;
    checkValidSentence(transcript, function(err, isValid) {
        if(err){
            return;
        }
        if(isValid) {
            temp.handlers[droneName].currentMode["audioTranscript"] = {
                'time': time,
                'transcript': transcript
            };
            temp.handlers[droneName].processSpeechTranscript(transcript, time, location);
        }
    });
};

DroneCoordinator.prototype.reset = function(droneName){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].reset();
};

DroneCoordinator.prototype.updateSensorReadings = function(droneName, sensorReadings){
    this.checkHandlerExistence(droneName);
    logger.info("Received sensor reading from: " + droneName);
    this.handlers[droneName].updateSensorReadings(sensorReadings);
};

DroneCoordinator.prototype.sendImageAlert = function(droneName){
    var data = {"text": "New image uploaded."};
    //this.MQTT.sendEvent("node", "server", "image", "json", JSON.stringify(data));
    this.MQTT.sendEvent("server", "image", droneName, "json", JSON.stringify(data));
};

DroneCoordinator.prototype.sendPiCommand = function(droneName, commandName, args){ // No need to propogate down.
    var command = {
        name : commandName,
        args : args
    };
    this.MQTT.sendCommand("pi", droneName, "piCommand", "json", JSON.stringify(command));
};

DroneCoordinator.prototype.sendMavCommand = function(droneName, commandName, args){ // No need to propogate down.
    var command = {
        name : commandName,
        args : args
    };
    this.MQTT.sendCommand("pi", droneName, "mavCommand", "json", JSON.stringify(command));
};

DroneCoordinator.prototype.getStatus = function(droneName){
    if(this.handlers[droneName] === undefined){
        return {'connection': 'offline'}
    } else {
        return {
            'connection': 'online',
            'mode' : this.handlers[droneName].currentMode.name(),
            'droneSettings' : this.handlers[droneName].getStatus()
        }
    }
};

DroneCoordinator.prototype.updateStatus = function(droneName, statusUpdate){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].updateStatus(statusUpdate);
};

function checkValidSentence(sentence, callback){
    var err;
    // Could be kept in permanent memory
    fs.readFile('lib/drone_interpret_and_control/en.txt', function(error, dictionary){

        if(error) {
            err = {message:"File read error"};
            logger.error("Language Read error: " + error.message);
            callback(err, false);
        } else {
            var words = sentence.split(" ");
            var containsAWord = false;
            for (var i = 0; i < words.length; i++) {
                var regex = new RegExp('\n' + words[i] +'\n');
                if(dictionary.toString('utf-8').match(regex)){
                    containsAWord = true;
                    break;
                } else if(words[i].indexOf("'") > -1){
                    containsAWord = true;
                    break;
                }
            }
            callback(err, containsAWord);
        }
    });
}

module.exports = DroneCoordinator;