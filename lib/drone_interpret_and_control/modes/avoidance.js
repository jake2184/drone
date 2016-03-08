baseMode = require('./baseMode.js');

function modeAvoidance(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

modeAvoidance.prototype = Object.create(baseMode.prototype);
modeAvoidance.prototype.constructor = modeAvoidance;

modeAvoidance.prototype.processImageLabels = function (keywords, time, location){

}

modeAvoidance.prototype.processSpeechTranscript = function (transcript) {}


module.exports = modeAvoidance;