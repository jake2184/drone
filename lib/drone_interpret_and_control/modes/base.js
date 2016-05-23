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


function ModeBase (cloudant, MQTT, droneName){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
    this.droneName = droneName;
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

ModeBase.prototype.handleSensorReadings = function(sensorReadings){
    this.logSensorReadings(sensorReadings);
};


// Log data to Cloudant server

ModeBase.prototype.logEvent = function(events, time, location){
    if(events.length == 0 ){
        return;
    }

    var toLog = events[0];
    for(var i=1;i<events.length;i++) {
        toLog += ", " + events[i];
    }
    //this.sendServerEvent("event", JSON.stringify({text: events[i], location: location}));
    this.sendServerEvent(this.droneName, "event", JSON.stringify({text: toLog, location: location}));
    var eventLog = this.cloudant.db.use(this.droneName + '_eventlog');
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

/*
ModeBase.prototype.logSensorReading = function(type, value, time, location){
    var sensorLog = this.cloudant.db.use('sensorlog');
    var docID = time;
    var data = {
        readingType : type,
        readingValue : value,
        readingLocation: location
    };
    sensorLog.insert(data, docID.toString(), function(err){
        if(err){
            console.error("Error inserting sensor reading \"" + type + "\" from time: " + time);
            console.error(err.message);
        }
    });
};*/

ModeBase.prototype.logSensorReadings = function(sensorReadings){
    var databaseName = this.droneName + '_sensorlog';
    var sensorLog = this.cloudant.db.use(databaseName);
    var docID = sensorReadings.time.toString();

    //console.log(JSON.stringify(sensorReadings));
    sensorLog.insert(sensorReadings, docID, function(err){
        if(err){
            console.error("[sensors.insert] Error inserting sensor reading from time: " + sensorReadings.time);
            console.error("[sensors.insert] " + err.message);
        }
    });
    var position = {
        time : sensorReadings.time,
        latitude : sensorReadings.location[0],
        longitude : sensorReadings.location[1],
        altitude : sensorReadings.altitude
    };
    this.cloudant.db.use(this.droneName + '_positionlog').insert(position, sensorReadings.time.toString(), function(err){
        if(err){
            console.error("[position.insert] Error inserting position reading from time: " + sensorReadings.time);
            console.error("[position.insert."+ databaseName + "] " + err.message);
        }
    });


};

ModeBase.prototype.logPosition = function(altitude, time, location){
    var positionLog = this.cloudant.db.use(this.droneName + '_positionlog');
    var docID = time;
    var data = {
        altitude : altitude,
        location : location
    };
    positionLog.insert(data, docID, function(err){
        if(err){
            console.error("Error inserting position reading from time: " + time);
            console.error(this.droneName + ": " + err.message);
        }
    });
};

ModeBase.prototype.sendMavCommand = function(commandName, args){
    // commandName is a string, args is an array. Could enforce here?
    var command = {
        name : commandName,
        args : args
    };
    this.MQTT.sendCommand("pi", this.droneName, "mavCommand", "json", JSON.stringify(command));
};

ModeBase.prototype.sendPiCommand = function(commandName, args){
    var command = {
        name : commandName,
        args : args
    };
  this.MQTT.sendCommand("pi", this.droneName, "piCommand", "json", JSON.stringify(command));
};

ModeBase.prototype.sendAndroidCommand = function(type, data){
    this.MQTT.sendCommand("Android", "phone", type, "json", data);
};

ModeBase.prototype.sendServerEvent = function(droneName, type, data){
    this.MQTT.sendEvent("node", droneName, type, "json", data);
};


module.exports = ModeBase;
