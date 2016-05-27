

//var Client = require('ibmiotf');
var ModeNormal = require('./modes/normal');
var ModeInteract = require('./modes/interact');
var ModeFire = require('./modes/fire');
var ModeAvoidance = require('./modes/avoidance');
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


function DroneHandler(MQTT, cloudant, droneName, sendUpdates){
	this.cloudant = cloudant;
	this.MQTT = MQTT;
	this.droneName = droneName;
	this.sendUpdates = sendUpdates;


	this.currentMode = new ModeNormal(this.cloudant, this.MQTT, droneName, this.sendUpdates);
	
	
	this.modeFactors = {
		sensorReadings : {},
		imageLabels : {},
		audioTranscript : {}
	};
	this.modeFactors.sensorReadings = {};
	this.modeFactors.imageLabels = {};
	this.status = {};

	setInterval(this.determineModeGlobal, 1000, this)


}

DroneHandler.prototype.getModeName = function(){
	return this.currentMode.name();
};

DroneHandler.prototype.setMode = function(modeType){

	if (modeType == this.currentMode.name()){
		logger.info("mode: " + this.currentMode.name());
		return;
	}
	logger.info("Setting mode " + modeType);
	var timeNow = new Date().getTime();

	if (timeNow - this.lastModeChange < 3000) {
		logger.info("Mode thrashing?")
	}

	this.lastModeChange = timeNow;
	switch(modeType){
		case Normal:
			this.currentMode = new ModeNormal(this.cloudant, this.MQTT, this.droneName, this.sendUpdates);
			break;
		case Fire:
			this.currentMode = new ModeFire(this.cloudant, this.MQTT, this.droneName, this.sendUpdates);
			break;
		case "Interact":
			this.currentMode = new ModeInteract(this.cloudant, this.MQTT, this.droneName, this.sendUpdates);
			break;
		case "Avoidance":
			this.currentMode = new ModeAvoidance(this.cloudant, this.MQTT, this.droneName, this.sendUpdates);
			break;
		default:
			console.error("No known mode: " + modeType);
	}
	this.modeFactors = {
		sensorReadings : {},
		imageLabels : {},
		audioTranscript : {}
	};
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

DroneHandler.prototype.determineModeGlobal = function(IandC){

	if (IandC.modeFactors.imageLabels.time < new Date().getTime() - 10000) {
		delete IandC.modeFactors.imageLabels.time;
		delete IandC.modeFactors.imageLabels.keywords;
	} if(IandC.modeFactors.audioTranscript.time < new Date().getTime() - 10000){
		delete IandC.modeFactors.audioTranscript.time;
		delete IandC.modeFactors.audioTranscript.transcript;
	}


	var labels = IandC.modeFactors.imageLabels.keywords;

	var groupedLabels = {
		"Fire": {},
		"Person": {}
	};
	for (var label in labels) {
		if (labels.hasOwnProperty(label)) {
			try {
				groupedLabels[ImageCategory[label]][label] = labels[label];
			} catch (e) {
				//TODO this could be slow?
			}

		}
	}

	// Test for Fire
	if (testCategoryThreshold(groupedLabels.Fire, ImageLabelThreshold, ImageLabelSecondThreshold)) {
		IandC.setMode("Fire");
	}

	// Test for Person
	if (testCategoryThreshold(groupedLabels.Person, ImageLabelThreshold, ImageLabelSecondThreshold)) {
		IandC.setMode("Interact");
	}


	// if(labels != undefined) {
	//     if (labels["Burning"] >= 0.8 || labels["Wild_Fire"] >= 0.8 || labels["Explosion"] >= 0.8 ){
	//         DroneCoordinator.setMode(Fire);
	//     }  else if (labels[Fire] >= 0.6 && labels["Smoke"] >= 0.6) {
	//         DroneCoordinator.setMode(Fire);
	//     }else if (labels[Person] >= 0.8) {
	//         DroneCoordinator.setMode(Person);
	//     }
	// }

	var sensors = IandC.modeFactors.sensorReadings;

	for (var attribute in sensors) {
		if (sensors[attribute].time < new Date().getTime() - 10000) {
			delete sensors[attribute];
		}
	}
	try {
		if (sensors.temperature.value > 60) {
			IandC.setMode(Fire);
		} else if (sensors.airPurity.value > 700) {
			IandC.setMode(Fire);
		}
	} catch (TypeError) {

	}
	
	if(IandC.modeFactors.audioTranscript.transcript && IandC.modeFactors.audioTranscript.transcript != ""){
		IandC.setMode("Interact");
	}
	
};

DroneHandler.prototype.processImageLabels = function(keywords, time, location){
	var neatenedKeywords = {};

	for(var i=0; i<keywords.length; i++){
		if(keywords[i].score < 0.6){
			break;
		}
		neatenedKeywords[keywords[i].name] = keywords[i].score;
	}


	this.modeFactors.imageLabels = {
		'time' : time,
		'keywords' : neatenedKeywords
	};

	this.currentMode.handleImageLabels(keywords, parseInt(time), location);
};

DroneHandler.prototype.processSpeechTranscript = function (transcript, time, location){
	this.currentMode["audioTranscript"] = {
		'time' : time,
		'transcript' : transcript
	};
	this.currentMode.handleSpeechTranscript(transcript, time, location);
};

DroneHandler.prototype.reset = function(){
	this.currentMode = new ModeNormal(this.cloudant, this.MQTT);
	this.modeFactors = {
		sensorReadings : {},
		imageLabels : {},
		audioTranscript : {}
	};
};

DroneHandler.prototype.updateSensorReadings = function(sensorReadings){
	logger.info("Received sensors");

	var time = sensorReadings.time;
	if(sensorReadings.temperature){
		this.modeFactors.sensorReadings.temperature = {time:time, value:sensorReadings.temperature}
	}
	if(sensorReadings.airPurity){
		this.modeFactors.sensorReadings.airPurity = {time:time, value:sensorReadings.airPurity}
	}
	if(sensorReadings.altitude){
		this.modeFactors.sensorReadings.altitude = {time:time, value:sensorReadings.altitude}
	}


	// Let current mode handle the recent reading
	this.currentMode.handleSensorReadings(sensorReadings);
};

DroneHandler.prototype.test = function(){
	this.currentMode.test()
};

DroneHandler.prototype.updateStatus = function (statusUpdate) {
	this.status = statusUpdate;	
};

DroneHandler.prototype.getStatus = function(){
	return this.status;
};

DroneHandler.prototype.sendImageAlert = function(){
	var data = {"text": "New image uploaded."};
	//this.MQTT.sendEvent("node", "server", "image", "json", JSON.stringify(data));
	this.MQTT.sendEvent("server", "image", this.droneName, "json", JSON.stringify(data));
};

DroneHandler.prototype.sendPiCommand = function(){
		
};

module.exports = DroneHandler;
