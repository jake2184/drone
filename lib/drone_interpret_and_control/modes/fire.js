var ModeNormal = require('./normal.js');

function ModeFire(cloudant, MQTT, droneName) {

    ModeNormal.call(this, cloudant, MQTT, droneName);

    this.sendMavCommand("raiseAltitude", [20]);
    this.sendMavCommand("hover", [30]);

}

ModeFire.prototype = Object.create(ModeNormal.prototype);
ModeFire.prototype.constructor = ModeFire;

ModeFire.prototype.name = function(){return "Fire";};




module.exports = ModeFire;