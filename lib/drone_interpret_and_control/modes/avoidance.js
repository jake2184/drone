ModeBase = require('./base.js');

function ModeAvoidance(cloudant, MQTT) {
    ModeBase.call(this, cloudant, MQTT);
}

ModeAvoidance.prototype = Object.create(ModeBase.prototype);
ModeAvoidance.prototype.constructor = ModeAvoidance;
ModeAvoidance.prototype.name = function(){return "Avoidance"};

ModeAvoidance.prototype.processImageLabels = function (keywords, time, location){

};

ModeAvoidance.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeAvoidance;