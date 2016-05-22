
var DroneHandler = require('./DroneHandler');
var logger = require('winston');


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
    this.handlers[droneName].currentMode["audioTranscript"] = {
        'time' : time,
        'transcript' : transcript
    };
    //this.currentMode.handleSpeechTranscript(transcript, time, location);
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



module.exports = DroneCoordinator;