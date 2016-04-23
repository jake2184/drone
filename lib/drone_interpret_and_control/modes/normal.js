ModeBase = require('./base.js');

function ModeNormal(cloudant, MQTT) {
    ModeBase.call(this, cloudant, MQTT);

    this.lastSeen = {};
    this.reEventDelay = 10000;
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
        var keyword = keywords[i].name;
        switch (keyword) {
            case "Fire":
                if(time - this.lastSeen[keyword] > this.reEventDelay) {
                    this.lastSeen[keyword] = time;
                    var command = {'name': "something", 'args': ['a', 'b', 1]};
                    this.MQTT.sendCommand("pi", "drone", "mavCommand", "json", JSON.stringify(command));
                    this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d: {text: "Fire"}}));
                    events.push(keyword);
                }
                break;
            case "Person":
                this.MQTT.sendCommand("pi", "drone", "mavCommand", "json", "STOP");
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Person"}}));
                events.push(keyword);
                break;
            case "Building":
                events.push(keyword);
                break;
            case "Explosion":
                this.MQTT.sendCommand("pi", "drone", "mavCommand", "json", "STOP");
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d:{text:"Explosion"}}));
                events.push(keyword);
                break;
            case "Smoke":
                this.MQTT.sendCommand("Android", "phone", "alert", "json", JSON.stringify({d: {text:"Smoke"}}));
                events.push(keyword);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
};

ModeNormal.prototype.test = function(){
    var command = {'name' : "something", 'args' : ['a', 'b', 1]};
    this.MQTT.sendCommand("pi", "drone", "mavCommand", "json", JSON.stringify(command));
    console.log("Sent Command")
};

ModeNormal.prototype.handleSpeechTranscript = function (transcript, time){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?

    if(!transcript.equals("")){
        this.MQTT.sendCommand("pi", "drone", movement, "json", "STOP");
        this.MQTT.sendCommand("Android", "phone", alert, "json", JSON.stringify({d:{text:Person}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};



module.exports = ModeNormal;