BaseMode = require('./BaseMode.js');

function ModeAvoidance(cloudant, MQTT) {
    BaseMode.call(this, cloudant, MQTT);
}

ModeAvoidance.prototype = Object.create(BaseMode.prototype);
ModeAvoidance.prototype.constructor = ModeAvoidance;
ModeAvoidance.prototype.name = function(){return "Avoidance"};

ModeAvoidance.prototype.processImageLabels = function (keywords, time, location){

};

ModeAvoidance.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeAvoidance;