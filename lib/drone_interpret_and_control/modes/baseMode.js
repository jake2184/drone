

function baseMode (cloudant, MQTT){
    this.cloudant = cloudant;
    this.MQTT = MQTT;
}



baseMode.prototype.processImageLabels = function (keywords, time, location){}

baseMode.prototype.processSpeechTranscript = function (transcript){}




baseMode.prototype.logEvent = function(type, time, location){
    var eventLog = this.cloudant.db.use('eventlog');
    var docID = time;
    var data = {
        eventType : type,
        eventLocation: location,
    }
    console.log("Logging...");
    eventLog.insert(data, docID, function(err, body){
        if(err){
            console.log("Error inserting event \"" + type + "\" from time: " + time);
        }
    });
}


module.exports = baseMode;