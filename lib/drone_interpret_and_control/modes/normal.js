ModeBase = require('./base.js');

function ModeNormal(cloudant, MQTT) {
    ModeBase.call(this, cloudant, MQTT);
}

ModeNormal.prototype = Object.create(ModeBase.prototype);
ModeNormal.prototype.constructor = ModeNormal;

ModeNormal.prototype.name = function() {return "Normal";};

ModeNormal.prototype.handleImageLabels = function (keywords, time, location){
    var events = [];
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            return;
        }
        switch (keywords[i].name) {
            case Fire:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "UP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Fire}}));
                events.push(Fire);
                break;
            case Person:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
                events.push(Person);
                break;
            case Building:
                events.push(Building);
                break;
            case Explosion:
                this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Explosion}}));
                events.push(Explosion);
                break;
            case Smoke:
                this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d: {text:Smoke}}));
                events.push(Smoke);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
};

ModeNormal.prototype.handleSpeechTranscript = function (transcript, time){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?

    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", dronepi, movement, "json", "STOP");
        this.MQTT.sendCommand(Android, phone, alert, "json", JSON.stringify({d:{text:Person}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};



module.exports = ModeNormal;