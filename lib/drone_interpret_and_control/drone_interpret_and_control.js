

var Client = require('ibmiotf');
var modeNormal = require('./modes/normal');
var modeInteract = require('./modes/interact');


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


function interpret_and_control(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;

    this.currentMode = new modeNormal(this.cloudant, this.MQTT);

    this.currentMode.logEvent("ij", "ij", "ij");

    this.modeFactors = [];
    this.modeFactors.push({"imageLabels": []  });
};

interpret_and_control.prototype.connectionStatus = function(){
    return this.client.getOrganizationDetails();
};

interpret_and_control.prototype.getMode = function(){
    return this.currentMode;
}

interpret_and_control.prototype.setMode = function(modeType){
    switch(modeType){
        case Normal:
            this.currentMode = new modeNormal(this.cloudant, this.MQTT);
            break;
        case Fire:
            this.currentMode = new modeFire(this.cloudant, this.MQTT);
            break;
        case Person:
            this.currentMode = new modeInteract(this.cloudant, this.MQTT);
            break;
        case Explosion:
            this.currentMode = new modeAvoidance(this.cloudant, this.MQTT);
        default:
            console.error("No known mode: " + modeType);
    }
}

interpret_and_control.prototype.determineMode = function(){
    // Use this.modeFactors to evaluate mode regularly. As callback?

    // Image Determination
    // NULL values are handled by comparison - returns false
    var labels = this.modeFactors["imageLabels"];
    if(labels[Fire] >= 0.8){
        this.setMode(Fire);
    } else if (labels[Person] >= 0.8){
        this.setMode(Person);
    } else if (labels[Fire] >= 0.6 && labels[Smoke] >= 0.6){
        this.setMode(Fire);
    }

    // Combination Determination
}

// This filtering is not strictly needed.
interpret_and_control.prototype.imageKeywordsDetermineMode = function(keywords){
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
}


interpret_and_control.prototype.imageKeywords = function(keywords, time, location){
    var identified = false;

    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
          return identified;
        }
        var keyword = keywords[i].name;
        switch (keyword) {
            case Fire:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "UP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Fire}}));
                this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:Fire, location:location}}));
                //this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Person:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
                this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:Person, location:location}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Building:
                this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:Building, location:location}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Explosion:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Explosion}}));
                this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:Explosion, location:location}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Smoke:
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d: {text:Smoke}}));
                this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d: {text:Smoke, location:location}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            default:
                identified = false;
        }
    }
    return identified;
}

interpret_and_control.prototype.speechTranscript = function(transcript){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?
    if(transcript.find()){
        this.MQTT.sendCommand(Android, phone, "speech", "json", JSON.stringify());
    }
    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
        this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:"Person"}}));
        this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:"Person"}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
}


// Log event with database
interpret_and_control.prototype.logEvent = function(type, time, location){
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : type,
        eventLocation: location,
    }
    eventLog.insert(data, docID, function(err, body){
        if(err){
            console.log("Error inserting event \"" + type + "\" from time: " + time);
        }
    });
}


interpret_and_control.prototype.processImageLabels = function(keywords, time, location){
    this.imageKeywordsDetermineMode(keywords);
    this.currentMode.processImageLabels(keywords, time, location);
}

interpret_and_control.prototype.processSpeechTranscript = function (transcript, time, location){
    this.speechTranscriptDetermineMode(transcript);
    this.currentMode.processSpeechTranscript(transcript, time, location);
}


module.exports = interpret_and_control;
