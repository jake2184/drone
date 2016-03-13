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


function BaseMode (cloudant, MQTT){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
}

BaseMode.prototype.name = function () {return "Base"};

BaseMode.prototype.processImageLabels = function (keywords, time, location){
    var identified = false;

    var events = [];
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            return;
        }
        var keyword = keywords[i].name;
        // What happens with more than one event? Currently clashes in eventLog.

        switch (keyword) {
            case Fire:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "UP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Fire}}));
                events.push(Fire);
                //this.logEvent(keyword, time, location);
                break;
            case Person:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
                events.push(Person);
                //this.logEvent(keyword, time, location);
                break;
            case Building:
                events.push(Building);
                //this.logEvent(keyword, time, location);
                break;
            case Explosion:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Explosion}}));
                events.push(Explosion);
                //this.logEvent(keyword, time, location);
                break;
            case Smoke:
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d: {text:Smoke}}));
                events.push(Smoke);
                //this.logEvent(keyword, time, location);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
    // return identified;
};

BaseMode.prototype.processSpeechTranscript = function (transcript, time){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?
    if(transcript.find()){
        this.MQTT.sendCommand(Android, phone, "speech", "json", JSON.stringify());
    }
    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
        this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};


BaseMode.prototype.logEvent = function(events, time, location){
    for(var i=0;i<events.size;i++) {
        this.MQTT.sendCommand(Android, phone, log, "json", JSON.stringify({d: {text: event[i], location: location}}));
    }
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : events,
        eventLocation: location
    };
    console.log("Logging.. " + data.eventType);
    eventLog.insert(data, docID, function(err, body){
        if(err){
            console.error("Error inserting events \"" + events + "\" from time: " + time);
            console.error(err.message);
        }
    });
};


module.exports = BaseMode;