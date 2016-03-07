
var Client = require('ibmiotf');

mqttHandler = function(mqttCreds, devices, statusCallback){
    
    var mqttConfig = {
       "org" : mqttCreds.org,
       "id" : mqttCreds.id,
       "auth-key" : mqttCreds.apiKey,
       "auth-token" : mqttCreds.apiToken
    };
    var client = new Client.IotfApplication(mqttConfig);
    client.connect();

    client.on("connect", function(){
        for(device in devices){
            client.subscribeToDeviceStatus(device, devices[device]);
        }
    });

    client.on("deviceStatus", statusCallback);

    client.on("error", function (err) {
        console.error("Error : " + err);
    });
    this.client = client;
};

// Publish a command
mqttHandler.prototype.sendCommand = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceCommand(deviceType, deviceId, commandType, format, data);
    });
};

// Publish an event
mqttHandler.prototype.sendEvent = function(deviceType, deviceId, commandType, format, data){
    var client = this.client;
    client.on("connect", function(){
        client.publishDeviceEvent(deviceType, deviceId, commandType, format, data);
    });
};


module.exports = mqttHandler;
