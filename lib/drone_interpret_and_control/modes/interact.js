baseMode = require('./baseMode.js');

function modeInteract(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

modeInteract.prototype = Object.create(baseMode.prototype);
modeInteract.prototype.constructor = modeInteract;

modeInteract.prototype.processImageLabels = function (keywords, time, location){
    
}

modeInteract.prototype.processSpeechTranscript = function (transcript) {}


module.exports = modeInteract;
