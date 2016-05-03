var ModeNormal = require('./normal.js');

function ModeAvoidance(cloudant, MQTT) {
    ModeNormal.call(this, cloudant, MQTT);


}

ModeAvoidance.prototype = Object.create(ModeNormal.prototype);
ModeAvoidance.prototype.constructor = ModeAvoidance;
ModeAvoidance.prototype.name = function(){return "Avoidance"};


module.exports = ModeAvoidance;