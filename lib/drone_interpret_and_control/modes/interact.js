ModeBase = require('./base.js');

function ModeInteract(cloudant, MQTT) {
    ModeBase.call(this, cloudant, MQTT);
}

ModeInteract.prototype = Object.create(ModeBase.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.name = function(){return "Interact"};


//ModeInteract.prototype.processImageLabels = function (keywords, time, location){};

//ModeInteract.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeInteract;
