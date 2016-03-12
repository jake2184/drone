

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

InterpretAndControl.prototype.getMode = function(){
    return this.currentMode;
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
    if(labels[Fire] >= 0.8){
        this.setMode(Fire);
    } else if (labels[Person] >= 0.8){
        this.setMode(Person);
    } else if (labels[Fire] >= 0.6 && labels[Smoke] >= 0.6){
        this.setMode(Fire);
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


InterpretAndControl.prototype.imageKeywords = function(keywords, time, location){
    var identified = false;

    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
          return identified;
        }
        var keyword = keywords[i].name;
        // What happens with more than one event? Currently clashes in eventLog.

        switch (keyword) {
            case Fire:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "UP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Fire}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Person:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Building:
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Explosion:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Explosion}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            case Smoke:
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d: {text:Smoke}}));
                this.logEvent(keyword, time, location);
                identified = true;
                break;
            default:
                identified = false;
        }
    }
    return identified;
};

InterpretAndControl.prototype.speechTranscript = function(transcript, time, location){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?
    if(transcript.find()){
        this.MQTT.sendCommand(Android, phone, "speech", "json", JSON.stringify());
    }
    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
        this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
        this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:Person}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};


// Log event with database
InterpretAndControl.prototype.logEvent = function(type, time, location){
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : type,
        eventLocation: location
    };
    eventLog.insert(data, docID, function(err, body){
        if(err){
            console.error("Error inserting event \"" + type + "\" from time: " + time);
            console.error("[eventLog]: " + err.message);
        }
    });
    this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d:{text:type, location:location}}));
};


InterpretAndControl.prototype.processImageLabels = function(keywords, time, location){
    this.imageKeywordsDetermineMode(keywords);
    this.currentMode.processImageLabels(keywords, time, location);
};

InterpretAndControl.prototype.processSpeechTranscript = function (transcript, time, location){
    this.speechTranscriptDetermineMode(transcript);
    this.currentMode.processSpeechTranscript(transcript, time, location);
};


module.exports = InterpretAndControl;
