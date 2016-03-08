baseMode = require('./baseMode.js');

function ModeInteract(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

ModeInteract.prototype = Object.create(baseMode.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.processImageLabels = function (keywords, time, location){
    
}

ModeInteract.prototype.processSpeechTranscript = function (transcript) {}


module.exports = ModeInteract;
