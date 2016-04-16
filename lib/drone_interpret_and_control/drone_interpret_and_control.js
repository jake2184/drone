

//var Client = require('ibmiotf');
var ModeNormal = require('./modes/normal');
var ModeInteract = require('./modes/interact');
var ModeFire = require('./modes/fire');
var ModeAvoidance = require('./modes/avoidance');



// Image Labels
const Fire = "Fire";
const Person = "Person";
const Building = "Building";
const Explosion = "Explosion";
const Normal = "Normal";
const Smoke = "Smoke";

// MQTT device type/id/format
const Android = "Android";
const phone = "phone";
const dronepi = "dronepi";
const movement = "movement";
const alert = "alert";
const log = "log";


function InterpretAndControl(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;

    this.currentMode = new ModeNormal(this.cloudant, this.MQTT);


    this.modeFactors = [];
    this.modeFactors.push({"imageLabels": []  });
}

InterpretAndControl.prototype.getModeName = function(){
    return this.currentMode.name();
};

InterpretAndControl.prototype.setMode = function(modeType){

    switch(modeType){
        case Normal:
            this.currentMode = new ModeNormal(this.cloudant, this.MQTT);
            break;
        case Fire:
            this.currentMode = new ModeFire(this.cloudant, this.MQTT);
            break;
        case Person:
            this.currentMode = new ModeInteract(this.cloudant, this.MQTT);
            break;
        case Explosion:
            this.currentMode = new ModeAvoidance(this.cloudant, this.MQTT);
            break;
        default:
            console.error("No known mode: " + modeType);
    }
};

InterpretAndControl.prototype.determineMode = function(){
    // Use this.modeFactors to evaluate mode regularly. As callback?
    // Image Determination
    // NULL values are handled by comparison - returns false
    var labels = this.modeFactors["imageLabels"];
    if(labels != undefined) {
        if (labels[Fire] >= 0.8) {
            this.setMode(Fire);
        } else if (labels[Person] >= 0.8) {
            this.setMode(Person);
        } else if (labels[Fire] >= 0.6 && labels[Smoke] >= 0.6) {
            this.setMode(Fire);
        }
    }

    var sensors = this.modeFactors["sensorReadings"];
    if(sensors != undefined) {
        if (sensors.temperature > 60) {
            this.setMode(Fire);
        } else if (sensors.airPurity < 0.5) {
            this.setMode(Fire);
        }
    }
    // Combination Determination
};

// This filtering is not strictly needed.
InterpretAndControl.prototype.imageKeywordsDetermineMode = function(keywords){
    this.modeFactors["imageLabels"] = [];

    // Select appropriate keywords
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
          break;
        }
        var keyword = keywords[i].name;
        if ( keyword == Fire ||  keyword == Person ||  keyword == Building ||  keyword == Explosion
                    ||  keyword == Smoke) {
            this.modeFactors["imageLabels"][keyword] = keywords[i].score;
        }
    }

    this.determineMode();
};

InterpretAndControl.prototype.processImageLabels = function(keywords, time, location){
    this.imageKeywordsDetermineMode(keywords, time);
    this.currentMode.handleImageLabels(keywords, time, location);
};

InterpretAndControl.prototype.processSpeechTranscript = function (transcript, time, location){
    //this.speechTranscriptDetermineMode(transcript, time);
    //this.currentMode.handleSpeechTranscript(transcript, time, location);
};

InterpretAndControl.prototype.updateSensorReadings = function(sensorReadings){
   
    this.modeFactors["sensorReadings"] = {
        'time' : sensorReadings["time"],
        'temperature' : sensorReadings["temperature"],
        'airPurity' : sensorReadings["airPurity"],
        'position' :{
            altitude : sensorReadings["altitude"],
            location : sensorReadings["location"]
        }
    };

    // Let current mode handle the recent reading
    this.currentMode.handleTemp(sensorReadings["temperature"], sensorReadings["time"], sensorReadings["location"]);
    this.currentMode.handleAirPurity(sensorReadings["airPurity"], sensorReadings["time"], sensorReadings["location"]);
    this.currentMode.handlePosition(sensorReadings["altitude"], sensorReadings["location"]);
};

InterpretAndControl.prototype.updateTemp = function(tempPayload){
    this.modeFactors["temperature"] = tempPayload;
    this.currentMode.handleTemp(tempPayload["temperature"], tempPayload["time"], tempPayload["location"]);
};

InterpretAndControl.prototype.updateAirPurity = function(airPayload){
    this.modeFactors["airPurity"] = airPayload;
    this.currentMode.handleAirPurity(airPayload["airPurity"], airPayload["time"], airPayload["location"]);
};

InterpretAndControl.prototype.updatePosition = function(positionPayload){
    this.modeFactors["position"] = positionPayload;
    this.currentMode.handlePosition(positionPayload["altitude"], positionPayload["time"], positionPayload["GPS"]);
};


module.exports = InterpretAndControl;
