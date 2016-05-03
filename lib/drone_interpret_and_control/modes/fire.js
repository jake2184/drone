var ModeNormal = require('./normal.js');

function ModeFire(cloudant, MQTT) {

    ModeNormal.call(this, cloudant, MQTT);

    this.sendMavCommand("raiseAltitude", [20]);

}

ModeFire.prototype = Object.create(ModeNormal.prototype);
ModeFire.prototype.constructor = ModeFire;

ModeFire.prototype.name = function(){return "Fire";};




module.exports = ModeFire;