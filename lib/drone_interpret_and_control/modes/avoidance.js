baseMode = require('./baseMode.js');

function ModeAvoidance(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

ModeAvoidance.prototype = Object.create(baseMode.prototype);
ModeAvoidance.prototype.constructor = ModeAvoidance;

ModeAvoidance.prototype.processImageLabels = function (keywords, time, location){

}

ModeAvoidance.prototype.processSpeechTranscript = function (transcript) {}


module.exports = ModeAvoidance;