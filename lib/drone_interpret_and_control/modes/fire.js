ModeBase = require('./base.js');

function ModeFire(cloudant, MQTT) {

    ModeBase.call(this, cloudant, MQTT);
}

ModeFire.prototype = Object.create(ModeBase.prototype);
ModeFire.prototype.constructor = ModeFire;

ModeFire.prototype.name = function(){return "Fire";};

ModeFire.prototype.processImageLabels = function (keywords, time, location){

};

ModeFire.prototype.processSpeechTranscript = function (transcript) {};


module.exports = ModeFire;