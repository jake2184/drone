var ModeBase = require('./base.js');

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
    console.log("Handling " + JSON.stringify(keywords));
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
                this.lastSeen[keyword] = time;
                //this.sendMavCommand("mavCommand", JSON.stringify(command));
                //this.sendAndroidCommand("alert", JSON.stringify({text: "Fire"}));
                events.push(keyword);
                break;
            case "Person":
                // this.sendMavCommand("mavCommand", "STOP");
                //this.sendAndroidCommand("alert", JSON.stringify({text:"Person"}));
                events.push(keyword);
                break;
            case "Building":
                events.push(keyword);
                break;
            case "Explosion":
                this.lastSeen[keyword] = time;
                // this.sendMavCommand("mavCommand", "STOP");
                //this.sendAndroidCommand("alert", JSON.stringify({text:"Explosion"}));
                events.push(keyword);
                break;
            case "Smoke":
                //this.sendAndroidCommand("alert", JSON.stringify( {text:"Smoke"}));
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