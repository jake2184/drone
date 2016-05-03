

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



function InterpretAndControl(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;

    this.currentMode = new ModeNormal(this.cloudant, this.MQTT);


    this.modeFactors = {};
    this.modeFactors.sensorReadings = {};
    this.modeFactors.imageLabels = {};
    //this.modeFactors.push({"imageLabels": []  });

    setInterval(this.determineModeGlobal, 1000, this)

}

InterpretAndControl.prototype.getModeName = function(){
    return this.currentMode.name();
};

InterpretAndControl.prototype.setMode = function(modeType){

    if (modeType == this.currentMode.name()){
        console.log("mode: " + this.currentMode.name());
        return;
    }
    console.log("Setting mode " + modeType);
    var timeNow = new Date().getTime();

    if (timeNow - this.lastModeChange < 3000) {
        console.log("Mode thrashing?")
    }

    this.lastModeChange = timeNow;
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

InterpretAndControl.prototype.determineModeGlobal = function(IandC){


    if(IandC.modeFactors.imageLabels.time < new Date().getTime() - 10000){
        delete IandC.modeFactors.imageLabels.time;
        delete IandC.modeFactors.imageLabels.keywords;
    }
    var labels = IandC.modeFactors.imageLabels.keywords;

    if(labels != undefined) {
        if (labels[Fire] >= 0.8 || labels["Wild_Fire"] >= 0.8) {
            IandC.setMode(Fire);
        } else if (labels[Person] >= 0.8) {
            IandC.setMode(Person);
        } else if (labels[Fire] >= 0.6 && labels[Smoke] >= 0.6) {
            IandC.setMode(Fire);
        }
    }


    var sensors = IandC.modeFactors.sensorReadings;

    for(var attribute in sensors){
        if(sensors[attribute].time < new Date().getTime() - 10000){
            delete sensors[attribute];
        }
    }

    if (sensors.temperature > 60) {
        IandC.setMode(Fire);
    } else if (sensors.airPurity > 500) {
        IandC.setMode(Fire);
    }
};

InterpretAndControl.prototype.determineMode = function(){
    // Use this.modeFactors to evaluate mode regularly. As callback?
    // Image Determination
    // NULL values are handled by comparison - returns false
    console.log("Determining mode..");

    var labels = this.modeFactors["imageLabels"].keywords;
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

InterpretAndControl.prototype.processImageLabels = function(keywords, time, location){
    var neatenedKeywords = {};

    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            break;
        }
        neatenedKeywords[keywords[i].name] = keywords[i].score;
    }
    
    
    this.modeFactors.imageLabels = {
        'time' : time,
        'keywords' : neatenedKeywords
    };

    this.currentMode.handleImageLabels(keywords, parseInt(time), location);
};

InterpretAndControl.prototype.processSpeechTranscript = function (transcript, time, location){
    this.currentMode["audioTranscript"] = {
        'time' : time,
        'transcript' : transcript
    };
    this.currentMode.handleSpeechTranscript(transcript, time, location);
};



InterpretAndControl.prototype.updateSensorReadings = function(sensorReadings){
    //console.log("Received sensors");
    /*
    this.modeFactors["sensorReadings"] = {
        'time' : sensorReadings["time"],
        'temperature' : sensorReadings["temperature"],
        'airPurity' : sensorReadings["airPurity"],
        'position' :{
            altitude : sensorReadings["altitude"],
            location : sensorReadings["location"]
        }
    };
    */

    var time = sensorReadings.time;
    if(sensorReadings.temperature){
        this.modeFactors.sensorReadings.temperature = {time:time, value:sensorReadings.temperature}
    }
    if(sensorReadings.airPurity){
        this.modeFactors.sensorReadings.airPurity = {time:time, value:sensorReadings.airPurity}
    }
    if(sensorReadings.altitude){
        this.modeFactors.sensorReadings.altitude = {time:time, value:sensorReadings.altitude}
    }



    // Let current mode handle the recent reading
    //this.currentMode.handleTemp(sensorReadings["temperature"], sensorReadings["time"], sensorReadings["location"]);
    //this.currentMode.handleAirPurity(sensorReadings["airPurity"], sensorReadings["time"], sensorReadings["location"]);
    //this.currentMode.handlePosition(sensorReadings["altitude"], sensorReadings["time"], sensorReadings["location"]);
    this.currentMode.handleSensorReadings(sensorReadings);
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

InterpretAndControl.prototype.test = function(){
    this.currentMode.test()    
};

InterpretAndControl.prototype.sendImageAlert = function(){
    var data = {"text": "New image uploaded."};
    this.MQTT.sendEvent("node", "server", "image", "json", JSON.stringify(data));
};

module.exports = InterpretAndControl;
