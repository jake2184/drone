BaseMode = require('./BaseMode.js');

function ModeNormal(cloudant, MQTT) {
    BaseMode.call(this, cloudant, MQTT);
}

ModeNormal.prototype = Object.create(BaseMode.prototype);
ModeNormal.prototype.constructor = ModeNormal;

ModeNormal.prototype.name = function() {return "Normal";};


module.exports = ModeNormal;