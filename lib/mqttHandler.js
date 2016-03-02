
var Client = require('ibmiotf');

mqttHandler = function(mqttCreds, devices){
    // set up mqtt_handler
    var mqttConfig = {
       "org" : mqttCreds.org,
       "id" : mqttCreds.id,
       "auth-key" : mqttCreds.apiKey,
       "auth-token" : mqttCreds.apiToken
    }
    this.client = new Client.IotfApplication(mqttConfig);
    this.client.connect();

    this.client.on("connect", function(){
        for(device in devices){
            this.client.subscribeToDeviceStatus(device, devices[device]);
        }

    });

    this.client.on("error", function (err) {
        console.error("Error : " + err);
    });
}

// Publish a command
mqttHandler.prototype.sendCommand = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceCommand(deviceType, deviceId, commandType, format, data);
    });
}

// Publish an event
mqttHandler.prototype.sendEvent = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceEvent(deviceType, deviceId, commandType, format, data);
    });
}


module.exports = mqttHandler;
