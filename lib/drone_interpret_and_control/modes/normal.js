baseMode = require('./baseMode.js');

function modeNormal(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

modeNormal.prototype = Object.create(baseMode.prototype);
modeNormal.prototype.constructor = modeNormal;

modeNormal.prototype.processImageLabels = function (keywords, time, location){

}

modeNormal.prototype.processSpeechTranscript = function (transcript) {}


module.exports = modeNormal;