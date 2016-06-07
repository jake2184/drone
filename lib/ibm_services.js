var fs = require ('fs');
var Cloudant = require('cloudant');
var watson = require('watson-developer-cloud');
var cfenv = require('cfenv');
var dashDB = require('ibm_db');
var mqtt = require('./MqttHandler');
var logger = require('winston');

/////////////// Load Service Details //////////
var services;
if (process.env.VCAP_SERVICES) {
    logger.info("Cloud Detected");
    services = JSON.parse(process.env.VCAP_SERVICES);
} else {
    try{
        logger.info("Local Detected");
        services = require('../node_modules/vcap_services/VCAP_SERVICES.json');
    } catch (e){
        logger.error(e);
    }
}

/////////////// Load Credentials //////////////
var cloudantCreds, imageRecognitionCreds, speechToTextCreds, toneAnalysisCreds, mqttCreds, dashDBCreds;
for (var svcName in services) {
    if (svcName.match(/^cloudant/)) {
        cloudantCreds = services[svcName][0]['credentials'];
    }else if (svcName.match(/^visual/)) {
        imageRecognitionCreds = services[svcName][0]['credentials'];
    }else if (svcName.match(/^speech/)) {
        speechToTextCreds = services[svcName][0]['credentials'];
    }else if (svcName.match(/^tone/)) {
        toneAnalysisCreds = services[svcName][0]['credentials'];
    }else if (svcName.match(/^iotf/)) {
        mqttCreds = services[svcName][0]['credentials'];
    }else if (svcName.match(/^dashDB/)) {
        dashDBCreds = services[svcName][0]['credentials'];
    }
}
/////////////// Test Credential Existance /////


if(typeof cloudantCreds === "undefined"){
    logger.error("No Cloudant credentials supplied in VCAP_SERVICES.");
    process.exit(1);
} else if(typeof imageRecognitionCreds === "undefined"){
    logger.error("No Image Recognition credentials supplied in VCAP_SERVICES.");
    process.exit(1);
} else if(typeof speechToTextCreds === "undefined"){
    logger.error("No Speech to Text credentials supplied in VCAP_SERVICES.");
    process.exit(1);
} else if(typeof toneAnalysisCreds === "undefined"){
    logger.error("No Tone Analysis credentials supplied in VCAP_SERVICES.");
    //process.exit(1);
}else if(typeof mqttCreds === "undefined"){
    logger.error("No IoT credentials supplied in VCAP_SERVICES.");
    process.exit(1);
}else if(typeof dashDBCreds === "undefined"){
    logger.error("No dashDB credentials supplied in VCAP_SERVICES.");
    process.exit(1);
}


/////////////// Initialise services ///////////
var username = cloudantCreds.username;
var password = cloudantCreds.password;
var cloudant = Cloudant({
    account:username, 
    password:password
});

//logger.info("Cloudant: " + username + " " + password);
username = imageRecognitionCreds.username;
password = imageRecognitionCreds.password;
var imageRecognition = watson.visual_recognition({
    version:'v2-beta',
    version_date:'2015-12-02',
    username:username,
    password:password
});

//logger.info("Recognition: " + username + " " + password);
username = speechToTextCreds.username;
password = speechToTextCreds.password;
var speechToText = watson.speech_to_text({
    version: "v1",
    username:username,
    password:password
});


var dashDBConnection = dashDB.openSync(dashDBCreds.ssldsn, {connectTimeout:1000});


module.exports = {
    cloudant : cloudant,
    imageRecognition : imageRecognition,
    speechToText : speechToText,
    dashDB : dashDBConnection
};