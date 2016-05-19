var ModeNormal = require('./normal.js');

function ModeInteract(cloudant, MQTT, droneName) {
    ModeNormal.call(this, cloudant, MQTT, droneName);

    this.sendMavCommand("hover", [30]);
    this.sendPiCommand("enableAudioStream", [1])
    
}

ModeInteract.prototype = Object.create(ModeNormal.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.name = function(){return "Interact"};

module.exports = ModeInteract;
