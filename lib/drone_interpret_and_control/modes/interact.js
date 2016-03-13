BaseMode = require('./BaseMode.js');

function ModeInteract(cloudant, MQTT) {
    BaseMode.call(this, cloudant, MQTT);
}

ModeInteract.prototype = Object.create(BaseMode.prototype);
ModeInteract.prototype.constructor = ModeInteract;

ModeInteract.prototype.name = function(){return "Interact"};


//ModeInteract.prototype.processImageLabels = function (keywords, time, location){};

//ModeInteract.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeInteract;
