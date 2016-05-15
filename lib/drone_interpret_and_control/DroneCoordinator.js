

//var Client = require('ibmiotf');
var ModeNormal = require('./modes/normal');
var ModeInteract = require('./modes/interact');
var ModeFire = require('./modes/fire');
var ModeAvoidance = require('./modes/avoidance');
var DroneHandler = require('./DroneHandler');
var logger = require('winston');



// Image Labels
const Fire = "Fire";
const Person = "Person";
const Building = "Building";
const Explosion = "Explosion";
const Normal = "Normal";
const Smoke = "Smoke";


const ImageCategory = {
    "Wild_Fire" : "Fire",
    "Burning" : "Fire",
    "Fireworks" : "Fire",
    "Smoke" : "Fire",
    "Explosion" : "Fire",
    "Adult" : "Person",
    "Child" : "Person",
    "Face" : "Person",
    "Female_Adult" : "Person",
    "Group_of_People" : "Person",
    "Head_and_Shoulders" : "Person",
    "Human" : "Person"
};

const ImageLabelThreshold = 0.8;
const ImageLabelSecondThreshold = 0.6;


function DroneCoordinator(MQTT, cloudant){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
    this.handlers = {};
}

DroneCoordinator.prototype.checkHandlerExistence = function(droneName){
    if(this.handlers[droneName] === undefined){
        this.handlers[droneName] = new DroneHandler(this.MQTT, this.Cloudant, droneName);
    }
};

DroneCoordinator.prototype.getModeName = function(droneName){
    this.checkHandlerExistence(droneName);
    return this.handlers[droneName].currentMode.name();
};

DroneCoordinator.prototype.setMode = function(droneName, modeType){
    this.checkHandlerExistence(droneName);
    
    if (modeType == this.handlers[droneName].currentMode.name()){
        logger.info("mode: " + this.handlers[droneName].currentMode.name());
        return;
    }
    logger.info("Setting mode " + modeType);
    var timeNow = new Date().getTime();

    if (timeNow - this.handlers[droneName].lastModeChange < 3000) {
        logger.info("Mode thrashing?")
    }

    this.handlers[droneName].lastModeChange = timeNow;
    switch(modeType){
        case Normal:
            this.handlers[droneName].currentMode = new ModeNormal(this.cloudant, this.MQTT);
            break;
        case Fire:
            this.handlers[droneName].currentMode = new ModeFire(this.cloudant, this.MQTT);
            break;
        case "Interact":
            this.handlers[droneName].currentMode = new ModeInteract(this.cloudant, this.MQTT);
            break;
        case "Avoidance":
            this.handlers[droneName].currentMode = new ModeAvoidance(this.cloudant, this.MQTT);
            break;
        default:
            console.error("No known mode: " + modeType);
    }
};

function testCategoryThreshold (labels, threshold, secondThresh){
    var secondThreshCount = 0;
    for(var label in labels){
        if(labels.hasOwnProperty(label)){
            if(labels[label] >= threshold){
                return true;
            } else if (labels[label] >= secondThresh){
                secondThreshCount++;
            }
            if(secondThreshCount >= 3){
                return true;
            }
        }
    }
    return false;
}

DroneCoordinator.prototype.processImageLabels = function(droneName, keywords, time, location){
    this.checkHandlerExistence(droneName);
    var neatenedKeywords = {};

    for(var i=0; i<keywords.length; i++){
        if(keywords[i].score < 0.6){
            break;
        }
        neatenedKeywords[keywords[i].name] = keywords[i].score;
    }
    
    
    this.handlers[droneName].modeFactors.imageLabels = {
        'time' : time,
        'keywords' : neatenedKeywords
    };

    this.handlers[droneName].currentMode.handleImageLabels(keywords, parseInt(time), location);
};

DroneCoordinator.prototype.processSpeechTranscript = function (droneName, transcript, time, location){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].currentMode["audioTranscript"] = {
        'time' : time,
        'transcript' : transcript
    };
    //this.currentMode.handleSpeechTranscript(transcript, time, location);
};

DroneCoordinator.prototype.reset = function(droneName){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].currentMode = new ModeNormal(this.cloudant, this.MQTT);
    this.handlers[droneName].modeFactors = {};
    this.handlers[droneName].modeFactors.sensorReadings = {};
    this.handlers[droneName].modeFactors.imageLabels = {};
};

DroneCoordinator.prototype.updateSensorReadings = function(droneName, sensorReadings){
    this.checkHandlerExistence(droneName);
    logger.info("Received sensors");
    /*
    this.modeFactors["sensorReadings"] = {
        'time' : sensorReadings["time"],
        'temperature' : sensorReadings["temperature"],
        'airPurity' : sensorReadings["airPurity"],
        'position' :{
            altitude : sensorReadings["altitude"],
            location : sensorReadings["location"]
        }
    };
    */

    var time = sensorReadings.time;
    if(sensorReadings.temperature){
        this.handlers[droneName].modeFactors.sensorReadings.temperature = {time:time, value:sensorReadings.temperature}
    }
    if(sensorReadings.airPurity){
        this.handlers[droneName].modeFactors.sensorReadings.airPurity = {time:time, value:sensorReadings.airPurity}
    }
    if(sensorReadings.altitude){
        this.handlers[droneName].modeFactors.sensorReadings.altitude = {time:time, value:sensorReadings.altitude}
    }


    // Let current mode handle the recent reading
   this.handlers[droneName].currentMode.handleSensorReadings(sensorReadings);
};


/*
DroneCoordinator.prototype.updateTemp = function(tempPayload){
    this.modeFactors["temperature"] = tempPayload;
    this.currentMode.handleTemp(tempPayload["temperature"], tempPayload["time"], tempPayload["location"]);
};

DroneCoordinator.prototype.updateAirPurity = function(airPayload){
    this.modeFactors["airPurity"] = airPayload;
    this.currentMode.handleAirPurity(airPayload["airPurity"], airPayload["time"], airPayload["location"]);
};

DroneCoordinator.prototype.updatePosition = function(positionPayload){
    this.modeFactors["position"] = positionPayload;
    this.currentMode.handlePosition(positionPayload["altitude"], positionPayload["time"], positionPayload["GPS"]);
};
*/
DroneCoordinator.prototype.test = function(droneName){
    this.checkHandlerExistence(droneName);
    this.handlers[droneName].currentMode.test()
};

DroneCoordinator.prototype.sendImageAlert = function(droneName){
    var data = {"text": "New image uploaded."};
    //this.MQTT.sendEvent("node", "server", "image", "json", JSON.stringify(data));
    this.MQTT.sendEvent("server", "image", droneName, "json", JSON.stringify(data));
};



module.exports = DroneCoordinator;


// function DroneCoordinator(MQTT, cloudant, drones){
//     this.cloudant = cloudant;
//     this.MQTT = MQTT;
//
//     drones.push("testDrone");
//     drones.push("pixhack");
//     this.drones = drones;
//     for(var i=0; i<drones.length; i++){
//         this[drones[i]] = {};
//
//         this[drones[i]].currentMode = new ModeNormal(this.cloudant, this.MQTT);
//
//         this[drones[i]].modeFactors = {};
//         this[drones[i]].modeFactors.sensorReadings = {};
//         this[drones[i]].modeFactors.imageLabels = {};
//         //setInterval(this.determineModeGlobal, 1000, this, this[drones[i]]);
//
//
//     }
//
//     // this.currentMode = new ModeNormal(this.cloudant, this.MQTT);
//     //
//     //
//     // this.modeFactors = {};
//     // this.modeFactors.sensorReadings = {};
//     // this.modeFactors.imageLabels = {};
//
//     setInterval(this.determineModeGlobal, 1000, this)
//
//
// }
//
// DroneCoordinator.prototype.getModeName = function(droneName){
//     return this.handlers[droneName].currentMode.name();
// };
//
// DroneCoordinator.prototype.setMode = function(droneName, modeType){
//
//     if (modeType == this.handlers[droneName].currentMode.name()){
//         logger.info("mode: " + this.handlers[droneName].currentMode.name());
//         return;
//     }
//     logger.info("Setting mode " + modeType);
//     var timeNow = new Date().getTime();
//
//     if (timeNow - this.handlers[droneName].lastModeChange < 3000) {
//         logger.info("Mode thrashing?")
//     }
//
//     this.handlers[droneName].lastModeChange = timeNow;
//     switch(modeType){
//         case Normal:
//             this.handlers[droneName].currentMode = new ModeNormal(this.cloudant, this.MQTT);
//             break;
//         case Fire:
//             this.handlers[droneName].currentMode = new ModeFire(this.cloudant, this.MQTT);
//             break;
//         case "Interact":
//             this.handlers[droneName].currentMode = new ModeInteract(this.cloudant, this.MQTT);
//             break;
//         case "Avoidance":
//             this.handlers[droneName].currentMode = new ModeAvoidance(this.cloudant, this.MQTT);
//             break;
//         default:
//             console.error("No known mode: " + modeType);
//     }
// };
//
// function testCategoryThreshold (labels, threshold, secondThresh){
//     var secondThreshCount = 0;
//     for(var label in labels){
//         if(labels.hasOwnProperty(label)){
//             if(labels[label] >= threshold){
//                 return true;
//             } else if (labels[label] >= secondThresh){
//                 secondThreshCount++;
//             }
//             if(secondThreshCount >= 3){
//                 return true;
//             }
//         }
//     }
//     return false;
// }
//
// DroneCoordinator.prototype.determineModeGlobal = function(IandC){
//
//     for(var i=0; IandC.drones.length; i++) {
//         var droneName = IandC.drones[i];
//         if (IandC[droneName].modeFactors.imageLabels.time < new Date().getTime() - 10000) {
//             delete IandC[droneName].modeFactors.imageLabels.time;
//             delete IandC[droneName].modeFactors.imageLabels.keywords;
//         }
//         var labels = IandC[droneName].modeFactors.imageLabels.keywords;
//
//         var groupedLabels = {
//             "Fire": {},
//             "Person": {}
//         };
//         for (var label in labels) {
//             if (labels.hasOwnProperty(label)) {
//                 try {
//                     groupedLabels[ImageCategory[label]][label] = labels[label];
//                 } catch (e) {
//                     //TODO this could be slow?
//                 }
//
//             }
//         }
//
//         // Test for Fire
//         if (testCategoryThreshold(groupedLabels.Fire, ImageLabelThreshold, ImageLabelSecondThreshold)) {
//             IandC.setMode("Fire");
//         }
//
//         // Test for Person
//         if (testCategoryThreshold(groupedLabels.Person, ImageLabelThreshold, ImageLabelSecondThreshold)) {
//             IandC.setMode("Interact");
//         }
//
//
//         // if(labels != undefined) {
//         //     if (labels["Burning"] >= 0.8 || labels["Wild_Fire"] >= 0.8 || labels["Explosion"] >= 0.8 ){
//         //         IandC.setMode(Fire);
//         //     }  else if (labels[Fire] >= 0.6 && labels["Smoke"] >= 0.6) {
//         //         IandC.setMode(Fire);
//         //     }else if (labels[Person] >= 0.8) {
//         //         IandC.setMode(Person);
//         //     }
//         // }
//
//         var sensors = IandC[droneName].modeFactors.sensorReadings;
//
//         for (var attribute in sensors) {
//             if (sensors[attribute].time < new Date().getTime() - 10000) {
//                 delete sensors[attribute];
//             }
//         }
//         try {
//             if (sensors.temperature.value > 60) {
//                 IandC.setMode(Fire);
//             } else if (sensors.airPurity.value > 500) {
//                 IandC.setMode(Fire);
//             }
//         } catch (TypeError) {
//
//         }
//     }
// };
//
// DroneCoordinator.prototype.processImageLabels = function(droneName, keywords, time, location){
//     var neatenedKeywords = {};
//
//     for(var i=0; i<keywords.length; i++){
//         if(keywords[i].score < 0.6){
//             break;
//         }
//         neatenedKeywords[keywords[i].name] = keywords[i].score;
//     }
//
//
//     this.handlers[droneName].modeFactors.imageLabels = {
//         'time' : time,
//         'keywords' : neatenedKeywords
//     };
//
//     this.handlers[droneName].currentMode.handleImageLabels(keywords, parseInt(time), location);
// };
//
// DroneCoordinator.prototype.processSpeechTranscript = function (droneName, transcript, time, location){
//     this.handlers[droneName].currentMode["audioTranscript"] = {
//         'time' : time,
//         'transcript' : transcript
//     };
//     //this.currentMode.handleSpeechTranscript(transcript, time, location);
// };
//
// DroneCoordinator.prototype.reset = function(droneName){
//     this.handlers[droneName].currentMode = new ModeNormal(this.cloudant, this.MQTT);
//     this.handlers[droneName].modeFactors = {};
//     this.handlers[droneName].modeFactors.sensorReadings = {};
//     this.handlers[droneName].modeFactors.imageLabels = {};
// };
//
// DroneCoordinator.prototype.updateSensorReadings = function(droneName, sensorReadings){
//     logger.info("Received sensors");
//     /*
//      this.modeFactors["sensorReadings"] = {
//      'time' : sensorReadings["time"],
//      'temperature' : sensorReadings["temperature"],
//      'airPurity' : sensorReadings["airPurity"],
//      'position' :{
//      altitude : sensorReadings["altitude"],
//      location : sensorReadings["location"]
//      }
//      };
//      */
//
//     var time = sensorReadings.time;
//     if(sensorReadings.temperature){
//         this.handlers[droneName].modeFactors.sensorReadings.temperature = {time:time, value:sensorReadings.temperature}
//     }
//     if(sensorReadings.airPurity){
//         this.handlers[droneName].modeFactors.sensorReadings.airPurity = {time:time, value:sensorReadings.airPurity}
//     }
//     if(sensorReadings.altitude){
//         this.handlers[droneName].modeFactors.sensorReadings.altitude = {time:time, value:sensorReadings.altitude}
//     }
//
//
//     // Let current mode handle the recent reading
//     this.handlers[droneName].currentMode.handleSensorReadings(sensorReadings);
// };
//
//
// /*
//  DroneCoordinator.prototype.updateTemp = function(tempPayload){
//  this.modeFactors["temperature"] = tempPayload;
//  this.currentMode.handleTemp(tempPayload["temperature"], tempPayload["time"], tempPayload["location"]);
//  };
//
//  DroneCoordinator.prototype.updateAirPurity = function(airPayload){
//  this.modeFactors["airPurity"] = airPayload;
//  this.currentMode.handleAirPurity(airPayload["airPurity"], airPayload["time"], airPayload["location"]);
//  };
//
//  DroneCoordinator.prototype.updatePosition = function(positionPayload){
//  this.modeFactors["position"] = positionPayload;
//  this.currentMode.handlePosition(positionPayload["altitude"], positionPayload["time"], positionPayload["GPS"]);
//  };
//  */
// DroneCoordinator.prototype.test = function(){
//     this.handlers[droneName].currentMode.test()
// };
//
// DroneCoordinator.prototype.sendImageAlert = function(droneName){
//     var data = {"text": "New image uploaded."};
//     //this.MQTT.sendEvent("node", "server", "image", "json", JSON.stringify(data));
//     this.MQTT.sendEvent("server", "image", droneName, "json", JSON.stringify(data));
// };