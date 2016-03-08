baseMode = require('./baseMode.js');

function modeFire(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

modeFire.prototype = Object.create(baseMode.prototype);
modeFire.prototype.constructor = modeFire;

modeFire.prototype.processImageLabels = function (keywords, time, location){

}

modeFire.prototype.processSpeechTranscript = function (transcript) {}


module.exports = modeFire;