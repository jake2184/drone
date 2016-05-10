var ModeBase = require('./base.js');
var logger = require('winston')
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
            case "Building":
                this.lastSeen[keyword] = time;
                events.push(keyword);
                break;
            default:
        }
    }
    this.logEvent(events, time, location);
};

ModeNormal.prototype.test = function(){
    this.sendMavCommand("something", ['a', 'b', 1]);
    console.log("Sent Command")
};

ModeNormal.prototype.handleSpeechTranscript = function (transcript, time){
    var identified = false;

    // Find keywords? Or analyse sentence somehow?

    if(!transcript.equals("")){
        this.sendMavCommand("movement", "STOP");
        this.sendAndroidCommand(alert, JSON.stringify({d:{text:Person}}));
        this.logEvent("Person:" + transcript, time, location);
        return identified = true;
    }
    return identified;
};



module.exports = ModeNormal;