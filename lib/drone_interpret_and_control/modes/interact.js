var ModeNormal = require('./normal.js');

function ModeInteract(cloudant, MQTT) {
    ModeNormal.call(this, cloudant, MQTT);

    this.sendMavCommand("stop", [1]);
    this.sendPiCommand("enableAudioStream", [1])
    
}

ModeInteract.prototype = Object.create(ModeNormal.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.name = function(){return "Interact"};

module.exports = ModeInteract;
