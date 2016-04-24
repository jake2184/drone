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
const piCommand = "piCommand";
const mavCommand = "mavCommand";


function ModeBase (cloudant, MQTT){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
}

ModeBase.prototype.name = function () {return "Base"};

// Handle incoming data from drone

ModeBase.prototype.handleImageLabels = function (keywords, time, location){
    var events = [];
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            return;
        }
        switch (keywords[i].name) {
            case Fire:
                events.push(Fire);
                break;
            case Person:
                events.push(Person);
                break;
            case Building:
                events.push(Building);
                break;
            case Explosion:
                events.push(Explosion);
                break;
            case Smoke:
                events.push(Smoke);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
};

ModeBase.prototype.handleSpeechTranscript = function (transcript, time){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?
    if(!transcript.equals("")){
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};

ModeBase.prototype.handleTemp = function (temp, time, location){
    this.logSensorReading("temperature", temp, time, location);
};

ModeBase.prototype.handleAirPurity = function (purity, time, location){
    this.logSensorReading("airPurity", purity, time, location);
};

ModeBase.prototype.handlePosition = function (altitude, time, location){
    this.logPosition(altitude, time, location);
};

ModeBase.prototype.handleSensorReadings = function(sensorReadings){
    this.logSensorReadings(sensorReadings);
};


// Log data to Cloudant server

ModeBase.prototype.logEvent = function(events, time, location){
    for(var i=0;i<events.length;i++) {
        this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d: {text: events[i], location: location}}));
    }
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : events,
        eventLocation: location
    };
    eventLog.insert(data, docID, function(err){
        if(err){
            console.error("Error inserting events \"" + events + "\" from time: " + time);
            console.error(err.message);
        }
    });
};

ModeBase.prototype.logSensorReading = function(type, value, time, location){
    var sensorLog = this.cloudant.db.use('sensorlog');
    var docID = time;
    var data = {
        readingType : type,
        readingValue : value,
        readingLocation: location
    };
    console.log(docID.toString)
    console.log(typeof docID.toString())
    sensorLog.insert(data, docID.toString(), function(err){
        if(err){
            console.error("Error inserting sensor reading \"" + type + "\" from time: " + time);
            console.error(err.message);
        }
    });
};

ModeBase.prototype.logSensorReadings = function(sensorReadings){
    var sensorLog = this.cloudant.db.use('sensorlog');
    var docID = sensorReadings.time.toString();

    console.log(docID)
    console.log(typeof docID)
    sensorLog.insert(sensorReadings, docID, function(err){
        if(err){
            console.error("[sensors.insert] Error inserting sensor reading \"" + type + "\" from time: " + time);
            console.error("[sensors.insert] " + err.message);
        }
    });
};

ModeBase.prototype.logPosition = function(altitude, time, location){
    var positionLog = this.cloudant.db.use('positionlog');
    var docID = time;
    var data = {
        altitude : altitude,
        location : location
    };
    positionLog.insert(data, docID, function(err){
        if(err){
            console.error("Error inserting position reading from time: " + time);
            console.error(err.message);
        }
    });
};

ModeBase.prototype.sendMavCommand = function(commandName, args){
    // commandName is a string, args is an array. Could enforce here?
    var command = {
        name : commandName,
        args : args
    };
    this.MQTT.sendCommand("pi", "drone", "mavCommand", "json", JSON.stringify(command));
};

ModeBase.prototype.sendPiCommand = function(commandName, args){
    var command = {
        name : commandName,
        args : args
    };
  this.MQTT.sendCommand("pi", "drone", "piCommand", "json", JSON.stringify(command));
};

ModeBase.prototype.sendAndroidCommand = function(type, data){
    this.MQTT.sendCommand("Android", "phone", type, "json", data);
};

module.exports = ModeBase;
