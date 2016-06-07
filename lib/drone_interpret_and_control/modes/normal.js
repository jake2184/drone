var ModeBase = require('./base.js');
var logger = require('winston');
function ModeNormal(cloudant, MQTT, droneName, sendUpdates) {
    ModeBase.call(this, cloudant, MQTT, droneName, sendUpdates);

    this.lastSeen = {};
    this.reEventDelay = 1000;
}

ModeNormal.prototype = Object.create(ModeBase.prototype);
ModeNormal.prototype.constructor = ModeNormal;

ModeNormal.prototype.name = function() {return "Normal";};

ModeNormal.prototype.handleImageLabels = function (keywords, time, location){
    var events = [];
    logger.info("Handling " + JSON.stringify(keywords));
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            break;
        }

        var keyword = keywords[i].name;
        if(time - (this.lastSeen[keyword] || 0) < this.reEventDelay){
            continue;
        }

        switch (keyword) {
            case "Fire":
            case "Wild_Fire":
            case "Burning":
            case "Smoke":
            case "Explosion":
                this.lastSeen[keyword] = time;
                events.push(keyword);
                break;
            case "Adult":
            case "Female_Adult":
            case "Human":
            case "Child":
                this.lastSeen[keyword] = time;
                events.push(keyword);
                break;
            case "Public_Building":
            case "Rural_Building":
            case "Urban_Building":
            case "Skyscraper":
                this.lastSeen[keyword] = time;
                events.push(keyword);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
};

ModeNormal.prototype.handleSpeechTranscript = function (transcript, time, location){
    var events = [];
    if(transcript != ""){
        events.push("Person");
    }
    if(transcript.indexOf('help') > -1 || transcript.indexOf('danger') > -1){
        this.sendServerEvent(this.droneName, 'urgent', {text: transcript, location: location}, time);
    }
    this.logEvent(events, time, location)
};

ModeNormal.prototype.handleSensorReadings = function(sensorReadings){
    // Check to create an event
    var events = [];
    try {
        if (sensorReadings.temperature > 60) {
            events.push("Hot Temperature: " + sensorReadings.temperature);
        } else if (sensorReadings.airPurity > 700) {
            events.push("Poor Air Quality: " + sensorReadings.airPurity);
        }
    } catch (TypeError) {}
    this.logEvent(events, sensorReadings.time, sensorReadings.location);
    this.logSensorReadings(sensorReadings);
};

module.exports = ModeNormal;