var ModeNormal = require('./normal.js');

function ModeAvoidance(cloudant, MQTT, droneName) {
    ModeNormal.call(this, cloudant, MQTT, droneName);


}

ModeAvoidance.prototype = Object.create(ModeNormal.prototype);
ModeAvoidance.prototype.constructor = ModeAvoidance;
ModeAvoidance.prototype.name = function(){return "Avoidance"};


module.exports = ModeAvoidance;