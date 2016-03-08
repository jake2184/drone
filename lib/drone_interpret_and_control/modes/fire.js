baseMode = require('./baseMode.js');

function ModeFire(cloudant, MQTT) {

    baseMode.call(this, cloudant, MQTT);
}

ModeFire.prototype = Object.create(baseMode.prototype);
ModeFire.prototype.constructor = ModeFire;

ModeFire.prototype.processImageLabels = function (keywords, time, location){

}

ModeFire.prototype.processSpeechTranscript = function (transcript) {}


module.exports = ModeFire;