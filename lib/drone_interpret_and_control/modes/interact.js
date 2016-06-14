var ModeNormal = require('./normal.js');

function ModeInteract(cloudant, MQTT, droneName, sendUpdates) {
    ModeNormal.call(this, cloudant, MQTT, droneName, sendUpdates);

    this.sendMavCommand("hover", [30]);
    this.sendPiCommand("streamingAudio", [true])
    
}

ModeInteract.prototype = Object.create(ModeNormal.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.name = function(){return "Interact"};

module.exports = ModeInteract;
