BaseMode = require('./baseMode.js');

function ModeNormal(cloudant, MQTT) {

    BaseMode.call(this, cloudant, MQTT);
}

ModeNormal.prototype = Object.create(BaseMode.prototype);
ModeNormal.prototype.constructor = ModeNormal;

ModeNormal.prototype.processImageLabels = function (keywords, time, location){

};

ModeNormal.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeNormal;